// Carregar logs ao iniciar a página
document.addEventListener('DOMContentLoaded', () => {
    // Verificar permissão de SUPERIOR
    const isUsuarioSuperior = localStorage.getItem('isUsuarioSuperior') === 'true';
    if (!isUsuarioSuperior) {
        Swal.fire({
            title: "Acesso Negado",
            text: "Você não tem permissão para acessar os logs. Apenas usuários com nível SUPERIOR podem realizar esta ação.",
            icon: "error",
            confirmButtonColor: "#d33",
            confirmButtonText: "OK"
        }).then(() => {
            window.location.href = '../globalMenu/mainMenu.html';
        });
        return;
    }
    carregarLogs();
});

// Função para verificar se o token está expirado
function isTokenExpired(token) {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expirationTime = payload.exp * 1000;
        return Date.now() >= expirationTime;
    } catch (error) {
        console.error('Erro ao verificar expiração do token:', error);
        return true;
    }
}

// Função para renovar o token
async function renovarToken() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
        throw new Error('Refresh token não encontrado');
    }

    try {
        const refreshResp = await fetch('http://localhost:8080/collaborators/refresh-token', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ refreshToken })
        });

        if (!refreshResp.ok) {
            const errorData = await refreshResp.json().catch(() => ({}));
            if (refreshResp.status === 403 || refreshResp.status === 401) {
                throw new Error('Refresh token inválido ou expirado');
            }
            throw new Error(errorData.error || 'Erro ao renovar token');
        }

        const data = await refreshResp.json();
        if (!data.accessToken) {
            throw new Error('Resposta inválida do servidor');
        }

        localStorage.setItem('accessToken', data.accessToken);
        return data.accessToken;
    } catch (error) {
        console.error('Erro ao renovar token:', error);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        throw error;
    }
}

// Função utilitária para requisições autenticadas
async function fetchComToken(url, options = {}) {
    let token = localStorage.getItem('accessToken');
    let tentativas = 0;
    const MAX_TENTATIVAS = 3;
    
    if (!token) {
        try {
            token = await renovarToken();
        } catch (error) {
            console.error('Não foi possível renovar o token:', error);
            localStorage.clear();
            Swal.fire({
                title: "Sessão expirada",
                text: "Sua sessão expirou. Faça login novamente.",
                icon: "warning",
                confirmButtonText: "Fazer login"
            }).then(() => {
                window.location.href = '../login/loginSystem.html';
            });
            throw new Error('Sessão expirada');
        }
    }

    while (tentativas < MAX_TENTATIVAS) {
        try {
            if (isTokenExpired(token)) {
                token = await renovarToken();
            }

            const response = await fetch(url, {
                ...options,
                headers: {
                    ...(options.headers || {}),
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            if (response.ok) {
                return response;
            }

            if (response.status === 401 || response.status === 403) {
                token = await renovarToken();
                tentativas++;
                continue;
            }

            throw new Error(`Erro na requisição: ${response.status}`);
        } catch (error) {
            console.error('Erro na requisição:', error);
            if (error.message === 'Refresh token inválido ou expirado' || tentativas >= MAX_TENTATIVAS - 1) {
                localStorage.clear();
                Swal.fire({
                    title: "Sessão expirada",
                    text: "Sua sessão expirou. Faça login novamente.",
                    icon: "warning",
                    confirmButtonText: "Fazer login"
                }).then(() => {
                    window.location.href = '../login/loginSystem.html';
                });
                throw new Error('Sessão expirada');
            }
            tentativas++;
        }
    }
}

// Função para carregar os logs
async function carregarLogs() {
    try {
        const response = await fetchComToken('http://localhost:8080/logs');

        if (!response.ok) {
            if (response.status === 403) {
                throw new Error('Acesso negado');
            }
            throw new Error('Erro ao carregar logs');
        }

        const logs = await response.json();
        const container = document.getElementById('listaLogs');

        if (!container) {
            console.error("Elemento 'listaLogs' não encontrado!");
            return;
        }

        container.innerHTML = '';

        // Criar tabela
        const table = document.createElement('table');
        table.className = 'logs-table';

        // Cabeçalho
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        ['Data/Hora', 'Colaborador', 'Tipo', 'Ação', 'Descrição'].forEach(text => {
            const th = document.createElement('th');
            th.textContent = text;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Corpo da tabela
        const tbody = document.createElement('tbody');
        logs.forEach(log => {
            const row = document.createElement('tr');
            
            // Data/Hora
            const tdData = document.createElement('td');
            tdData.textContent = new Date(log.timestamp).toLocaleString();
            row.appendChild(tdData);

            // Colaborador
            const tdColaborador = document.createElement('td');
            tdColaborador.textContent = log.collaborator.name;
            row.appendChild(tdColaborador);

            // Tipo
            const tdTipo = document.createElement('td');
            tdTipo.textContent = log.entityType;
            row.appendChild(tdTipo);

            // Ação
            const tdAcao = document.createElement('td');
            tdAcao.textContent = log.action;
            row.appendChild(tdAcao);

            // Descrição
            const tdDescricao = document.createElement('td');
            tdDescricao.textContent = log.description;
            row.appendChild(tdDescricao);

            tbody.appendChild(row);
        });
        table.appendChild(tbody);

        container.appendChild(table);

    } catch (error) {
        console.error("Erro ao carregar logs:", error);
        let mensagem = "Erro ao carregar os logs. Tente novamente.";
        
        if (error.message === 'Acesso negado') {
            mensagem = "Você não tem permissão para acessar os logs.";
        }

        Swal.fire({
            title: "Erro!",
            text: mensagem,
            icon: "error",
            confirmButtonColor: "#d33",
            confirmButtonText: "OK"
        });
    }
}

// Função para gerar o PDF
async function gerarRelatorioPDF() {
    try {
        const response = await fetchComToken('http://localhost:8080/logs/pdf');

        if (!response.ok) {
            if (response.status === 403) {
                throw new Error('Acesso negado');
            }
            throw new Error('Erro ao gerar PDF');
        }

        // Converter a resposta para blob
        const blob = await response.blob();
        
        // Criar URL do blob
        const url = window.URL.createObjectURL(blob);
        
        // Criar link temporário e clicar nele para download
        const a = document.createElement('a');
        a.href = url;
        a.download = `Relatorio_Logs_${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        
        // Limpar
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        Swal.fire({
            title: "Sucesso!",
            text: "O relatório foi gerado com sucesso!",
            icon: "success",
            confirmButtonColor: "#ffc107", // Cor amarela do sistema
            confirmButtonText: "OK"
        });

    } catch (error) {
        console.error("Erro ao gerar relatório:", error);
        let mensagem = "Erro ao gerar o relatório de logs. Tente novamente.";
        
        if (error.message === 'Acesso negado') {
            mensagem = "Você não tem permissão para gerar o relatório.";
        }

        Swal.fire({
            title: "Erro!",
            text: mensagem,
            icon: "error",
            confirmButtonColor: "#d33",
            confirmButtonText: "OK"
        });
    }
} 