let graficoAtual = null;
let graficoPizza = null;

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
            const refreshResp = await fetch('http://localhost:8080/collaborators/refresh', {
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
            if (!data.accessToken || !data.refreshToken) {
                throw new Error('Resposta inválida do servidor');
            }

            localStorage.setItem('accessToken', data.accessToken);
            localStorage.setItem('refreshToken', data.refreshToken);
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

    // Busca os dados de estatísticas gerais do backend
    async function carregarEstatisticasGerais() {
        const container = document.getElementById("estatisticasGerais");
        if (!container) return;

        try {
            console.log('📊 Carregando estatísticas gerais...');
            
            // Buscar dados de múltiplas fontes
            const [tarefasResponse, clientesResponse, colaboradoresResponse, fasesResponse] = await Promise.all([
                fetchComToken("http://localhost:8080/tasks"),
                fetchComToken("http://localhost:8080/clients"),
                fetchComToken("http://localhost:8080/collaborators"),
                fetchComToken("http://localhost:8080/phases")
            ]);

            // Processar respostas
            const tarefas = tarefasResponse.ok ? await tarefasResponse.json() : [];
            const clientes = clientesResponse.ok ? await clientesResponse.json() : [];
            const colaboradores = colaboradoresResponse.ok ? await colaboradoresResponse.json() : [];
            const fases = fasesResponse.ok ? await fasesResponse.json() : [];

            console.log('📈 Dados recebidos:', {
                tarefas: tarefas.length,
                clientes: clientes.length,
                colaboradores: colaboradores.length,
                fases: fases.length
            });

            // Calcular estatísticas
            const hoje = new Date();
            const estatisticas = {
                totalTarefas: tarefas.length,
                totalClientes: clientes.length,
                totalColaboradores: colaboradores.length,
                tarefasConcluidas: 0,
                tarefasAndamento: 0,
                tarefasAtrasadas: 0
            };

            // Contar tarefas por status
            tarefas.forEach(tarefa => {
                if (tarefa.phase && tarefa.phase.name) {
                    const faseNome = tarefa.phase.name.toLowerCase();
                    if (faseNome.includes('concluído') || faseNome.includes('concluida')) {
                        estatisticas.tarefasConcluidas++;
                    } else {
                        estatisticas.tarefasAndamento++;
                    }
                } else {
                    estatisticas.tarefasAndamento++;
                }

                // Verificar se está atrasada
                if (tarefa.due_date) {
                    const dataVencimento = new Date(tarefa.due_date);
                    if (dataVencimento < hoje && !tarefa.phase?.name?.toLowerCase().includes('concluído')) {
                        estatisticas.tarefasAtrasadas++;
                    }
                }
            });

            // Atualizar elementos HTML
            document.getElementById('totalTarefas').textContent = estatisticas.totalTarefas;
            document.getElementById('totalClientes').textContent = estatisticas.totalClientes;
            document.getElementById('totalColaboradores').textContent = estatisticas.totalColaboradores;
            document.getElementById('tarefasConcluidas').textContent = estatisticas.tarefasConcluidas;
            document.getElementById('tarefasAndamento').textContent = estatisticas.tarefasAndamento;
            document.getElementById('tarefasAtrasadas').textContent = estatisticas.tarefasAtrasadas;

            // Criar gráfico de distribuição por fase
            const contagemPorFase = {};
            fases.forEach(fase => {
                contagemPorFase[fase.name] = 0;
            });

            tarefas.forEach(tarefa => {
                if (tarefa.phase && tarefa.phase.name) {
                    contagemPorFase[tarefa.phase.name] = (contagemPorFase[tarefa.phase.name] || 0) + 1;
                }
            });

            // Renderizar gráfico
            const labels = Object.keys(contagemPorFase);
            const dados = Object.values(contagemPorFase);
            
            if (labels.length > 0 && dados.some(d => d > 0)) {
                renderizarGraficoPizza(labels, dados);
            }

            console.log('✅ Estatísticas carregadas com sucesso');

        } catch (err) {
            console.error("❌ Erro ao carregar estatísticas gerais:", err);
            
            // Não redirecionar para login, apenas mostrar erro
            if (typeof Swal !== 'undefined') {
                Swal.fire({ 
                    title: "Aviso", 
                    text: "Relatório de estatísticas gerais não disponível no momento.", 
                    icon: "info", 
                    confirmButtonColor: "#FFD700", 
                    confirmButtonText: "OK" 
                });
            } else {
                alert("Relatório de estatísticas gerais não disponível no momento.");
            }
            
            container.innerHTML = "<p>Relatório de estatísticas gerais não disponível no momento.</p>";
        }
    }

    // Função para gerar o PDF do relatório (usando jsPDF)
    window.gerarPDF = async function() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Título
        doc.setFontSize(16);
        doc.text("Relatório de Estatísticas Gerais", 14, 15);
        
        // Data de geração
        doc.setFontSize(10);
        doc.text(`Gerado em: ${new Date().toLocaleDateString()}`, 14, 25);

        // Estatísticas
        doc.setFontSize(12);
        doc.text("Estatísticas Gerais:", 14, 35);
        doc.setFontSize(10);
        doc.text(`Total de Tarefas: ${document.getElementById('totalTarefas').textContent}`, 20, 45);
        doc.text(`Total de Clientes: ${document.getElementById('totalClientes').textContent}`, 20, 55);
        doc.text(`Total de Colaboradores: ${document.getElementById('totalColaboradores').textContent}`, 20, 65);
        doc.text(`Tarefas Concluídas: ${document.getElementById('tarefasConcluidas').textContent}`, 20, 75);
        doc.text(`Tarefas em Andamento: ${document.getElementById('tarefasAndamento').textContent}`, 20, 85);
        doc.text(`Tarefas Atrasadas: ${document.getElementById('tarefasAtrasadas').textContent}`, 20, 95);

        // Adiciona o gráfico ao PDF
        if (graficoPizza) {
            const canvas = document.getElementById('graficoPizza');
            const imgData = canvas.toDataURL('image/png');
            const imgWidth = 180;
            const imgHeight = 180;
            const pageWidth = doc.internal.pageSize.getWidth();
            const imgX = (pageWidth - imgWidth) / 2;
            doc.addImage(imgData, 'PNG', imgX, 105, imgWidth, imgHeight);
        }

        doc.save("relatorio-estatisticas-gerais.pdf");
    };

    // Inicia a busca dos dados ao carregar a página
    carregarEstatisticasGerais();
});


function renderizarGraficoPizza(labels, dados) {
    const canvas = document.getElementById('graficoPizza');
    if (!canvas) {
        console.error("❌ Canvas 'graficoPizza' não encontrado.");
        return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error("❌ Falha ao obter contexto 2D do canvas.");
        return;
    }

    if (graficoAtual) {
        graficoAtual.destroy();
    }

    graficoAtual = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: dados,
                backgroundColor: ['#FFC107', '#4CAF50', '#2196F3', '#FF5722', '#9C27B0', '#00BCD4', '#E91E63', '#8BC34A'] // Você pode expandir
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}


// 🔹 Função para buscar e exibir as estatísticas gerais
async function carregarEstatisticas() {
    try {
        // Buscar todas fases
        const responsePhases = await fetch("http://localhost:8080/phases");
        if (!responsePhases.ok) throw new Error("Erro ao buscar fases!");

        const phases = await responsePhases.json();
        console.log("Fases recebidas:", phases);

        // Buscar todas tarefas
        const responseTasks = await fetch("http://localhost:8080/tasks");
        if (!responseTasks.ok) throw new Error("Erro ao buscar tarefas!");

        const tarefas = await responseTasks.json();
        console.log("Tarefas recebidas:", tarefas);

        // Inicializar contador para cada fase
        const contagemPorFase = {};
        phases.forEach(phase => {
            contagemPorFase[phase.name] = 0;
        });

        // Contar tarefas em cada fase
        tarefas.forEach(tarefa => {
            if (tarefa.phase?.name) {
                if (contagemPorFase[tarefa.phase.name] !== undefined) {
                    contagemPorFase[tarefa.phase.name]++;
                } else {
                    console.warn(`Fase não reconhecida: ${tarefa.phase.name}`);
                }
            }
        });

        console.log("Contagem por fase:", contagemPorFase);

        // Atualizar tela
        const container = document.getElementById("estatisticas-container");
        container.innerHTML = Object.entries(contagemPorFase)
            .map(([fase, quantidade]) => `<p><strong>${fase}:</strong> ${quantidade}</p>`)
            .join('') +
            `<p><strong>Total de Tarefas:</strong> ${tarefas.length}</p>`;

        // Atualizar gráfico
        const labels = Object.keys(contagemPorFase);
        const dados = Object.values(contagemPorFase);

        requestAnimationFrame(() => renderizarGraficoPizza(labels, dados));

    } catch (error) {
        console.error("Erro ao carregar estatísticas:", error);
        Swal.fire({
            title: "Erro!",
            text: error.message,
            icon: "error",
            confirmButtonColor: "#d33",
            confirmButtonText: "OK"
        });
    }
}


async function gerarRelatorioEstatisticasPDF() {
    try {
        const response = await fetch("http://localhost:8080/tasks");
        if (!response.ok) throw new Error(`Erro ${response.status}: ${response.statusText}`);

        const tarefas = await response.json();
        console.log("📋 Tarefas recebidas para o PDF:", tarefas);

        // Buscar fases
        const responsePhases = await fetch("http://localhost:8080/phases");
        if (!responsePhases.ok) throw new Error("Erro ao buscar fases!");

        const phases = await responsePhases.json();

        // Contar tarefas por fase
        const contagemPorFase = {};
        phases.forEach(phase => {
            contagemPorFase[phase.name] = 0;
        });

        tarefas.forEach(tarefa => {
            if (tarefa.phase?.name && contagemPorFase.hasOwnProperty(tarefa.phase.name)) {
                contagemPorFase[tarefa.phase.name]++;
            }
        });


        // 🖨 Criar o PDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.setFont("times", "bold");
        doc.setFontSize(18);
        doc.text("Relatório de Estatísticas Gerais", 105, 20, { align: "center" });

        doc.setFontSize(14);
        doc.text(`Data: ${new Date().toLocaleDateString()}`, 15, 35);

        doc.setDrawColor(0);
        doc.setLineWidth(0.5);
        doc.line(15, 40, 195, 40);

        doc.setFont("times", "bold");
        doc.text("Resumo das Estatísticas:", 15, 50);
        doc.setFont("times", "normal");

        let y = 60; // 🔵 Posição inicial vertical para escrever

        const fasesOrdenadas = Object.entries(contagemPorFase).sort((a, b) => a[0].localeCompare(b[0]));

        for (const [fase, quantidade] of fasesOrdenadas) {
            doc.text(`• ${fase}: ${quantidade}`, 15, y);
            y += 10;
        }

        doc.text(`• Total de Tarefas: ${tarefas.length}`, 15, y);

        // 🔥 Inserir gráfico melhorado (como fizemos antes)
        const canvas = document.getElementById('graficoPizza');
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 100;
        const imgHeight = 100;
        const pageWidth = doc.internal.pageSize.getWidth();
        const imgX = (pageWidth - imgWidth) / 2;
        doc.addImage(imgData, 'PNG', imgX, y + 20, imgWidth, imgHeight);

        const nomeArquivo = `Relatorio_Estatisticas_${new Date().toISOString().split("T")[0]}.pdf`;
        doc.save(nomeArquivo);

        Swal.fire({
            title: "Sucesso!",
            text: "O relatório foi gerado com sucesso!",
            icon: "success",
            confirmButtonColor: "#28a745",
            confirmButtonText: "OK"
        });

    } catch (error) {
        console.error("Erro ao gerar relatório:", error);
        Swal.fire({
            title: "Erro!",
            text: `Erro ao gerar relatório: ${error.message || "Ocorreu um erro desconhecido."}`,
            icon: "error",
            confirmButtonColor: "#d33",
            confirmButtonText: "OK"
        });
    }
}

// Função para criar o gráfico de pizza
function criarGraficoPizza(dados) {
    const ctx = document.getElementById('graficoPizza').getContext('2d');
    
    // Destrói o gráfico anterior se existir
    if (graficoPizza) {
        graficoPizza.destroy();
    }

    // Configuração do gráfico
    graficoPizza = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Concluídas', 'Em Andamento', 'Atrasadas'],
            datasets: [{
                data: [
                    dados.tarefasConcluidas,
                    dados.tarefasAndamento,
                    dados.tarefasAtrasadas
                ],
                backgroundColor: [
                    '#00C853', // Verde para concluídas
                    '#FFD700', // Amarelo para em andamento
                    '#FF3D00'  // Vermelho para atrasadas
                ],
                borderColor: '#000000',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: document.body.classList.contains('light-theme') ? '#222222' : '#ffffff',
                        font: {
                            size: 14
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Função para atualizar as estatísticas e o gráfico
async function atualizarEstatisticas() {
    try {
        const [tarefasResponse, clientesResponse, colaboradoresResponse] = await Promise.all([
            fetchComToken("http://localhost:8080/tasks"),
            fetchComToken("http://localhost:8080/clients"),
            fetchComToken("http://localhost:8080/collaborators")
        ]);

        if (!tarefasResponse.ok || !clientesResponse.ok || !colaboradoresResponse.ok) {
            throw new Error("Erro ao carregar dados");
        }

        const tarefas = await tarefasResponse.json();
        const clientes = await clientesResponse.json();
        const colaboradores = await colaboradoresResponse.json();

        // Calcula as estatísticas
        const estatisticas = {
            totalTarefas: tarefas.length,
            totalClientes: clientes.length,
            totalColaboradores: colaboradores.length,
            tarefasConcluidas: 0,
            tarefasAndamento: 0,
            tarefasAtrasadas: 0
        };

        tarefas.forEach(tarefa => {
            if (tarefa.stage && tarefa.stage.name === "Concluído") {
                estatisticas.tarefasConcluidas++;
            } else {
                estatisticas.tarefasAndamento++;
            }

            if (tarefa.deadline && new Date(tarefa.deadline) < new Date() && 
                tarefa.stage && tarefa.stage.name !== "Concluído") {
                estatisticas.tarefasAtrasadas++;
            }
        });

        // Atualiza os elementos HTML
        document.getElementById('totalTarefas').textContent = estatisticas.totalTarefas;
        document.getElementById('totalClientes').textContent = estatisticas.totalClientes;
        document.getElementById('totalColaboradores').textContent = estatisticas.totalColaboradores;
        document.getElementById('tarefasConcluidas').textContent = estatisticas.tarefasConcluidas;
        document.getElementById('tarefasAndamento').textContent = estatisticas.tarefasAndamento;
        document.getElementById('tarefasAtrasadas').textContent = estatisticas.tarefasAtrasadas;

        // Atualiza o gráfico
        criarGraficoPizza(estatisticas);

    } catch (error) {
        console.error("Erro ao carregar estatísticas:", error);
        Swal.fire({
            title: "Erro!",
            text: "Não foi possível carregar as estatísticas.",
            icon: "error"
        });
    }
}

// Inicializa as estatísticas ao carregar a página
document.addEventListener("DOMContentLoaded", () => {
    atualizarEstatisticas();
});
