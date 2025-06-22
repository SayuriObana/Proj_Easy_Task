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

// Função para abrir tarefas do colaborador
async function abrirTarefasColaborador(idCollaborator) {
    try {
        const response = await fetchComToken(`http://localhost:8080/tasks/collaborator/${idCollaborator}`);

        if (!response.ok) {
            throw new Error("Erro ao buscar tarefas do colaborador");
        }

        const tarefas = await response.json();
        mostrarModalTarefas(tarefas);
    } catch (error) {
        console.error("Erro ao carregar tarefas:", error);
        Swal.fire({
            title: "Erro!",
            text: "Não foi possível carregar as tarefas do colaborador.",
            icon: "error",
            confirmButtonColor: "#d33"
        });
    }
}

// Função para formatar a prioridade
function formatarPrioridade(priority) {
    const cores = {
        1: '#00cc66', // Baixa
        2: '#ffd700', // Média
        3: '#ff3333'  // Alta
    };
    
    const textos = {
        1: 'Baixa',
        2: 'Média',
        3: 'Alta'
    };
    
    return `<span class="prioridade" style="background-color: ${cores[priority]}">${textos[priority]}</span>`;
}

// Função para mostrar o modal de tarefas
function mostrarModalTarefas(tarefas) {
    let html = '';
    if (tarefas.length === 0) {
        html = '<p class="sem-tarefas">Este colaborador não possui tarefas atribuídas.</p>';
    } else {
        html = `
            <div class="tarefas-grid">
                ${tarefas.map(tarefa => `
                    <div class="tarefa-card">
                        <div class="tarefa-header">
                            <h3>${tarefa.title}</h3>
                            ${formatarPrioridade(tarefa.priority)}
                        </div>
                        <p class="cliente"><i class="fas fa-building"></i> Cliente: ${tarefa.client.name}</p>
                        <p class="descricao">${tarefa.description || 'Sem descrição'}</p>
                        <div class="tarefa-info">
                            <div class="info-grupo">
                                <span class="fase"><i class="fas fa-tasks"></i> ${tarefa.phase.name}</span>
                                <span class="board"><i class="fas fa-columns"></i> ${tarefa.board.name}</span>
                            </div>
                            <span class="prazo"><i class="far fa-calendar-alt"></i> ${tarefa.dueDate ? new Date(tarefa.dueDate).toLocaleDateString() : 'Sem prazo'}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    Swal.fire({
        title: 'Tarefas do Colaborador',
        html: html,
        width: '80%',
        showConfirmButton: false,
        showCloseButton: true,
        customClass: {
            container: 'tarefas-modal-container',
            popup: 'tarefas-modal-popup',
            content: 'tarefas-modal-content'
        }
    });
}

// Exportar as funções
window.abrirTarefasColaborador = abrirTarefasColaborador; 