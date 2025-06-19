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

    // Carrega a sidebar dinamicamente
    const sidebar = document.getElementById("sidebar");
    const menuToggle = document.getElementById("menuToggle");
    if (sidebar && menuToggle) {
        menuToggle.addEventListener("click", (event) => {
            event.stopPropagation();
            sidebar.classList.toggle("open");
        });
    }

    // Função utilitária para requisições autenticadas
    async function fetchComToken(url, options = {}) {
        const token = localStorage.getItem("token");
        if (!options.headers) options.headers = {};
        options.headers["Authorization"] = `Bearer ${token}`;
        return fetch(url, options);
    }

    // Carrega a lista de clientes para o filtro
    async function carregarClientes() {
        try {
            console.log('📋 Carregando lista de clientes...');
            const response = await fetchComToken("http://localhost:8080/clients");
            if (!response.ok) {
                console.warn('⚠️ Erro ao carregar clientes:', response.status);
                return;
            }
            
            const clientes = await response.json();
            const select = document.getElementById("filtroCliente");
            
            // Limpar opções existentes (exceto a primeira)
            while (select.children.length > 1) {
                select.removeChild(select.lastChild);
            }
            
            clientes.forEach(cliente => {
                const option = document.createElement("option");
                option.value = cliente.id_client;
                option.textContent = cliente.name;
                select.appendChild(option);
            });
            
            console.log('✅ Clientes carregados:', clientes.length);
        } catch (error) {
            console.error("❌ Erro ao carregar clientes:", error);
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: "Aviso",
                    text: "Não foi possível carregar a lista de clientes.",
                    icon: "info",
                    confirmButtonColor: "#FFD700"
                });
            }
        }
    }

    // Função para atualizar as estatísticas
    function atualizarEstatisticas(tarefas) {
        const estatisticas = tarefas.reduce((acc, tarefa) => {
            const prioridade = tarefa.priority || "Não Definida";
            acc[prioridade] = (acc[prioridade] || 0) + 1;
            acc.total++;
            return acc;
        }, {
            ALTA: 0,
            MEDIA: 0,
            BAIXA: 0,
            "Não Definida": 0,
            total: 0
        });

        // Atualiza os elementos HTML
        document.getElementById('totalAlta').textContent = estatisticas.ALTA || 0;
        document.getElementById('totalMedia').textContent = estatisticas.MEDIA || 0;
        document.getElementById('totalBaixa').textContent = estatisticas.BAIXA || 0;
        document.getElementById('totalGeral').textContent = estatisticas.total;
    }

    // Carrega as tarefas com base nos filtros
    async function carregarTarefas() {
        const clienteId = document.getElementById("filtroCliente").value;
        const prioridade = document.getElementById("filtroPrioridade").value;
        
        try {
            console.log('📋 Carregando tarefas por prioridade...', { clienteId, prioridade });
            
            let url = "http://localhost:8080/tasks";
            const params = new URLSearchParams();
            
            if (clienteId) params.append("client_id", clienteId);
            if (prioridade) params.append("priority", prioridade);
            
            if (params.toString()) url += `?${params.toString()}`;
            
            const response = await fetchComToken(url);
            if (!response.ok) {
                console.warn('⚠️ Erro ao carregar tarefas:', response.status);
                return;
            }
            
            const tarefas = await response.json();
            console.log('✅ Tarefas carregadas:', tarefas.length);
            
            // Atualiza as estatísticas
            atualizarEstatisticas(tarefas);
            
            const container = document.getElementById("listaTarefasPrioridade");
            container.innerHTML = "";

            if (tarefas.length === 0) {
                container.innerHTML = `
                    <div class="sem-dados">
                        <i class="fas fa-info-circle"></i>
                        <p>Nenhuma tarefa encontrada com os filtros aplicados.</p>
                    </div>
                `;
                return;
            }

            // Agrupa tarefas por prioridade
            const tarefasPorPrioridade = tarefas.reduce((acc, tarefa) => {
                const prioridade = tarefa.priority || "Não Definida";
                if (!acc[prioridade]) acc[prioridade] = [];
                acc[prioridade].push(tarefa);
                return acc;
            }, {});

            // Ordem das prioridades
            const ordemPrioridades = {
                "ALTA": 1,
                "MEDIA": 2,
                "BAIXA": 3,
                "Não Definida": 4
            };

            // Ordena as prioridades
            const prioridadesOrdenadas = Object.keys(tarefasPorPrioridade).sort((a, b) => {
                return ordemPrioridades[a] - ordemPrioridades[b];
            });

            // Cria a estrutura HTML para cada prioridade
            prioridadesOrdenadas.forEach(prioridade => {
                const tarefasPrioridade = tarefasPorPrioridade[prioridade];
                const prioridadeDiv = document.createElement("div");
                prioridadeDiv.className = "prioridade-section";
                prioridadeDiv.setAttribute("data-prioridade", prioridade);
                
                // Define a cor da seção baseada na prioridade
                let corPrioridade = "#666"; // Cor padrão para "Não Definida"
                switch(prioridade) {
                    case "ALTA":
                        corPrioridade = "#ff4444";
                        break;
                    case "MEDIA":
                        corPrioridade = "#ffbb33";
                        break;
                    case "BAIXA":
                        corPrioridade = "#00C851";
                        break;
                }

                prioridadeDiv.innerHTML = `
                    <h3 style="color: ${corPrioridade}">Prioridade: ${prioridade}</h3>
                    <div class="tarefas-grid">
                        ${tarefasPrioridade.map(tarefa => `
                            <div class="tarefa-card">
                                <h4>${tarefa.title}</h4>
                                <p><strong>Cliente:</strong> ${tarefa.client ? tarefa.client.name : "Não atribuído"}</p>
                                <p><strong>Responsável:</strong> ${tarefa.collaborator ? tarefa.collaborator.name : "Não atribuído"}</p>
                                <p><strong>Fase:</strong> ${tarefa.phase ? tarefa.phase.name : "Não definido"}</p>
                                <p><strong>Criação:</strong> ${tarefa.creation_date ? new Date(tarefa.creation_date).toLocaleDateString() : "Não definido"}</p>
                                <p><strong>Prazo:</strong> ${tarefa.due_date ? new Date(tarefa.due_date).toLocaleDateString() : "Não definido"}</p>
                            </div>
                        `).join("")}
                    </div>
                `;
                
                container.appendChild(prioridadeDiv);
            });
            
        } catch (error) {
            console.error("❌ Erro ao carregar tarefas:", error);
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: "Erro",
                    text: "Não foi possível carregar as tarefas.",
                    icon: "error",
                    confirmButtonColor: "#FFD700"
                });
            }
        }
    }

    // Função para gerar PDF
    window.gerarPDF = function() {
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Título
            doc.setFontSize(20);
            doc.text('Relatório de Prioridades', 20, 20);
            
            // Data
            doc.setFontSize(12);
            doc.text(`Gerado em: ${new Date().toLocaleDateString()}`, 20, 30);
            
            // Estatísticas
            doc.setFontSize(14);
            doc.text('Estatísticas:', 20, 45);
            
            doc.setFontSize(12);
            doc.text(`Total de Tarefas: ${document.getElementById('totalGeral').textContent}`, 20, 55);
            doc.text(`Alta Prioridade: ${document.getElementById('totalAlta').textContent}`, 20, 65);
            doc.text(`Média Prioridade: ${document.getElementById('totalMedia').textContent}`, 20, 75);
            doc.text(`Baixa Prioridade: ${document.getElementById('totalBaixa').textContent}`, 20, 85);
            
            // Salvar PDF
            doc.save('relatorio-prioridades.pdf');
            
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: "Sucesso!",
                    text: "PDF gerado com sucesso!",
                    icon: "success",
                    confirmButtonColor: "#FFD700"
                });
            }
        } catch (error) {
            console.error("Erro ao gerar PDF:", error);
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: "Erro",
                    text: "Não foi possível gerar o PDF.",
                    icon: "error",
                    confirmButtonColor: "#FFD700"
                });
            }
        }
    };

    // Inicialização
    carregarClientes();
    carregarTarefas();

    // Event listeners para filtros
    document.getElementById("filtroCliente").addEventListener("change", carregarTarefas);
    document.getElementById("filtroPrioridade").addEventListener("change", carregarTarefas);
});