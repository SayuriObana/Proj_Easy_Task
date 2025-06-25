// Configuração da API - usar API_CONFIG centralizado
const API_URL = window.API_CONFIG ? window.API_CONFIG.BASE_URL : 'http://localhost:8080';

// Ao carregar a tela, verifica se o token e refreshToken já estão salvos no localStorage.
// Caso não estejam, salva (por exemplo, copiando de sessionStorage ou de um cookie, se disponível).
// (Observe que, em geral, o token é salvo na tela de login, mas essa verificação garante que todas as telas salvem o token.)
(function () {
  if (!localStorage.getItem("accessToken")) {
    // Exemplo: se o token estiver em sessionStorage, copie-o para localStorage.
    const token = sessionStorage.getItem("accessToken");
    if (token) localStorage.setItem("accessToken", token);
  }
  if (!localStorage.getItem("refreshToken")) {
    const refreshToken = sessionStorage.getItem("refreshToken");
    if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
  }
})();

document.addEventListener("DOMContentLoaded", () => {
    // Controle de tema - Padronizado para todo o sistema
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        // Verifica se há um tema salvo e aplica
        const savedTheme = localStorage.getItem('theme') || 'dark';
        if (savedTheme === 'light') {
            document.body.classList.add('light-theme');
        } else {
            document.body.classList.remove('light-theme');
        }

        // Alterna entre temas
        themeToggle.addEventListener('click', () => {
            const isLight = document.body.classList.contains('light-theme');
            const newTheme = isLight ? 'dark' : 'light';
            
            if (newTheme === 'light') {
                document.body.classList.add('light-theme');
            } else {
                document.body.classList.remove('light-theme');
            }
            localStorage.setItem('theme', newTheme);
        });
    }

    // Carrega a sidebar dinamicamente (usando o arquivo sidebar.js)
    const sidebar = document.getElementById("sidebar");
    const menuToggle = document.getElementById("menuToggle");
    if (sidebar && menuToggle) {
        menuToggle.addEventListener("click", (event) => {
            event.stopPropagation();
            sidebar.classList.toggle("open");
        });
    }

    // Função para verificar se o token está expirado
    function isTokenExpired(token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const expirationTime = payload.exp * 1000; // Converter para milissegundos
            return Date.now() >= expirationTime;
        } catch (error) {
            console.error('Erro ao verificar expiração do token:', error);
            return true; // Se não conseguir verificar, considera como expirado
        }
    }

    // Função para renovar o token
    async function renovarToken() {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
            throw new Error('Refresh token não encontrado');
        }

        try {
            const refreshResp = await fetch(`${API_URL}/collaborators/refresh-token`, {
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
            // Não atualiza o refreshToken, mantém o mesmo
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
                // Não redirecionar automaticamente, apenas retornar erro
                throw new Error('Token não disponível');
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
                    // Não redirecionar automaticamente, apenas retornar erro
                    throw new Error('Falha na autenticação');
                }
                tentativas++;
            }
        }
        
        throw new Error('Máximo de tentativas excedido');
    }

    // Busca os dados de estatísticas gerais do backend usando o endpoint correto
    async function carregarEstatisticas() {
        try {
            const response = await fetchComToken('http://localhost:8080/reports/statistics');
            if (!response.ok) throw new Error('Erro ao buscar estatísticas');
            const estatisticas = await response.json();

            // Atualiza os elementos na tela com os novos campos do backend
            document.getElementById('totalTarefas').textContent = estatisticas.totalTasks ?? 0;
            document.getElementById('totalClientes').textContent = estatisticas.activeClients ?? 0;
            document.getElementById('totalColaboradores').textContent = estatisticas.activeCollaborators ?? 0;
            document.getElementById('tarefasConcluidas').textContent = estatisticas.tasksCompleted ?? 0;
            document.getElementById('tarefasAndamento').textContent = estatisticas.tasksInProgress ?? 0;
            document.getElementById('tarefasAtrasadas').textContent = estatisticas.overdueTasks ?? 0;
        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
            // Opcional: exibir mensagem de erro na tela
        }
    }

    // Função para gerar o PDF do relatório (usando jsPDF)
    window.gerarPDF = async function() {
        try {
            // Buscar dados atualizados do backend
            const response = await fetchComToken('http://localhost:8080/reports/statistics');
            if (!response.ok) throw new Error('Erro ao buscar dados para PDF');
            const estatisticas = await response.json();

            // Dados para o gráfico e PDF (mesmos estágios da tela)
            const labels = [
                "Total de Tarefas",
                "Total de Clientes",
                "Total de Colaboradores",
                "Tarefas Concluídas",
                "Tarefas em Andamento",
                "Tarefas Atrasadas"
            ];
            const data = [
                estatisticas.totalTasks ?? 0,
                estatisticas.activeClients ?? 0,
                estatisticas.activeCollaborators ?? 0,
                estatisticas.tasksCompleted ?? 0,
                estatisticas.tasksInProgress ?? 0,
                estatisticas.overdueTasks ?? 0
            ];

            // Cores pastéis distintas para cada estágio
            const pastelColors = [
                '#FFE066', // amarelo pastel
                '#A7C7E7', // azul pastel
                '#FFB3C6', // rosa pastel
                '#C3AED6', // roxo pastel
                '#B5EAD7', // verde água pastel
                '#FFDAC1'  // laranja claro pastel
            ];

            // Ajustar o canvas para ser quadrado e garantir gráfico redondo
            const canvas = document.getElementById('pieChart');
            canvas.width = 400;
            canvas.height = 400;
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height); // Limpa o canvas
            if (window.pizzaChart) window.pizzaChart.destroy();
            window.pizzaChart = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: pastelColors,
                        borderColor: '#fff',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: false,
                    maintainAspectRatio: true,
                    cutout: 0,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'bottom',
                            labels: {
                                color: '#232323',
                                font: { size: 14, weight: 'bold' },
                                generateLabels: function(chart) {
                                    const original = Chart.overrides.pie.plugins.legend.labels.generateLabels;
                                    const labels = original(chart);
                                    // Adiciona descrição de cada cor
                                    return labels.map((label, i) => {
                                        let descricao = '';
                                        switch (i) {
                                            case 0: descricao = 'Total de Tarefas'; break;
                                            case 1: descricao = 'Total de Clientes'; break;
                                            case 2: descricao = 'Total de Colaboradores'; break;
                                            case 3: descricao = 'Tarefas Concluídas'; break;
                                            case 4: descricao = 'Tarefas em Andamento'; break;
                                            case 5: descricao = 'Tarefas Atrasadas'; break;
                                            default: descricao = 'Outro'; break;
                                        }
                                        return {
                                            ...label,
                                            text: descricao
                                        };
                                    });
                                }
                            }
                        }
                    }
                }
            });

            // Espera o gráfico renderizar
            await new Promise(resolve => setTimeout(resolve, 500));

            // Pega imagem do gráfico
            const chartImg = canvas.toDataURL('image/png');

            // Gera o PDF
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            doc.setFontSize(16);
            doc.text("Relatório de Estatísticas Gerais - EasyTask", 14, 15);

            doc.setFontSize(10);
            doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 14, 25);

            // Estatísticas
            doc.setFontSize(12);
            doc.text("Estatísticas Gerais:", 14, 35);
            doc.setFontSize(10);
            doc.text(`Total de Tarefas: ${data[0]}`, 20, 45);
            doc.text(`Total de Clientes: ${data[1]}`, 20, 53);
            doc.text(`Total de Colaboradores: ${data[2]}`, 20, 61);
            doc.text(`Tarefas Concluídas: ${data[3]}`, 20, 69);
            doc.text(`Tarefas em Andamento: ${data[4]}`, 20, 77);
            doc.text(`Tarefas Atrasadas: ${data[5]}`, 20, 85);

            // Adiciona o gráfico de pizza centralizado e redondo
            doc.setFontSize(12);
            doc.text("Distribuição das Estatísticas:", 14, 100);
            // Centralizar na página A4 (210mm largura), imagem 100x100mm
            const imgWidth = 100;
            const imgHeight = 100;
            const pageWidth = doc.internal.pageSize.getWidth();
            const x = (pageWidth - imgWidth) / 2;
            doc.addImage(chartImg, 'PNG', x, 105, imgWidth, imgHeight);

            // Legenda das cores
            doc.setFontSize(10);
            const legendY = 210;
            const legendX = 30;
            const legendLabels = [
                { cor: pastelColors[0], texto: 'Total de Tarefas' },
                { cor: pastelColors[1], texto: 'Total de Clientes' },
                { cor: pastelColors[2], texto: 'Total de Colaboradores' },
                { cor: pastelColors[3], texto: 'Tarefas Concluídas' },
                { cor: pastelColors[4], texto: 'Tarefas em Andamento' },
                { cor: pastelColors[5], texto: 'Tarefas Atrasadas' }
            ];
            legendLabels.forEach((item, idx) => {
                doc.setFillColor(item.cor);
                doc.rect(legendX, legendY + idx * 8, 6, 6, 'F');
                doc.text(item.texto, legendX + 10, legendY + 5 + idx * 8);
            });

            doc.save("relatorio-estatisticas-gerais.pdf");

            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'success',
                    title: 'PDF Gerado!',
                    text: 'O relatório foi baixado com sucesso.',
                    confirmButtonColor: '#28a745'
                });
            }
        } catch (error) {
            console.error('Erro ao gerar PDF:', error);
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'error',
                    title: 'Erro ao Gerar PDF',
                    text: 'Não foi possível gerar o relatório.',
                    confirmButtonColor: '#d33'
                });
            }
        }
    };

    // Função para testar conectividade com o backend
    window.testarConectividade = async function() {
        try {
            console.log('🔍 Testando conectividade com o backend...');
            
            // Pega o token do localStorage
            const token = localStorage.getItem('accessToken');
            const headers = {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            };
            
            // Teste 1: Verificar se o servidor está respondendo
            const healthResponse = await fetch(`${API_URL}/health`, {
                method: 'GET',
                headers
            });
            console.log('🏥 Health check:', healthResponse.status);
            
            // Teste 2: Verificar se o endpoint de estatísticas existe
            const statsResponse = await fetch(`${API_URL}/reports/statistics`, {
                method: 'GET',
                headers
            });
            console.log('📊 Statistics endpoint:', statsResponse.status);
            
            // Teste 3: Verificar se o endpoint de tarefas funciona (para comparação)
            const tasksResponse = await fetch(`${API_URL}/tasks`, {
                method: 'GET',
                headers
            });
            console.log('📋 Tasks endpoint:', tasksResponse.status);
            
            const resultado = {
                health: healthResponse.status,
                statistics: statsResponse.status,
                tasks: tasksResponse.status
            };
            
            console.log('🔍 Resultado do teste de conectividade:', resultado);
            
            // Mostrar resultado para o usuário
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'info',
                    title: 'Teste de Conexão',
                    html: `
                        <div style="text-align: left;">
                            <p><strong>Health Check:</strong> ${resultado.health}</p>
                            <p><strong>Statistics Endpoint:</strong> ${resultado.statistics}</p>
                            <p><strong>Tasks Endpoint:</strong> ${resultado.tasks}</p>
                        </div>
                    `,
                    confirmButtonColor: '#3085d6',
                    confirmButtonText: 'OK'
                });
            }
            
            return resultado;
            
        } catch (error) {
            console.error('❌ Erro no teste de conectividade:', error);
            
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'error',
                    title: 'Erro no Teste',
                    text: `Erro ao testar conectividade: ${error.message}`,
                    confirmButtonColor: '#d33'
                });
            }
            
            return { error: error.message };
        }
    };

    // Função para atualizar estatísticas (pode ser chamada por um botão de refresh)
    window.atualizarEstatisticas = async function() {
        try {
            console.log('🔄 Atualizando estatísticas...');
            
            await carregarEstatisticas();
            
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'success',
                    title: 'Atualizado!',
                    text: 'Estatísticas atualizadas com sucesso.',
                    confirmButtonColor: '#28a745',
                    timer: 1500,
                    showConfirmButton: false
                });
            }
        } catch (error) {
            console.error('Erro ao atualizar estatísticas:', error);
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'error',
                    title: 'Erro',
                    text: `Não foi possível atualizar as estatísticas: ${error.message}`,
                    confirmButtonColor: '#d33'
                });
            }
        }
    };

    // Inicia a busca dos dados ao carregar a página
    carregarEstatisticas();
});
