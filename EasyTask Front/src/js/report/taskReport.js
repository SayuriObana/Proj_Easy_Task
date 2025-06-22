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

            localStorage.setItem('token', data.accessToken);
            // Não atualiza o refreshToken, mantém o mesmo
            return data.accessToken;
        } catch (error) {
            console.error('Erro ao renovar token:', error);
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            throw error;
        }
    }

    // Função utilitária para requisições autenticadas
    async function fetchComToken(url, options = {}) {
        let token = localStorage.getItem('token');
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

    // Carrega a lista de estágios para o filtro
    async function carregarEstagios() {
        try {
            console.log('📋 Carregando lista de estágios...');
            const response = await fetchComToken("http://localhost:8080/phases");
            if (!response.ok) {
                console.warn('⚠️ Erro ao carregar estágios:', response.status);
                return;
            }
            
            const estagios = await response.json();
            const select = document.getElementById("filtroEstagio");
            
            // Limpar opções existentes (exceto a primeira)
            while (select.children.length > 1) {
                select.removeChild(select.lastChild);
            }
            
            estagios.forEach(estagio => {
                const option = document.createElement("option");
                option.value = estagio.id_phase;
                option.textContent = estagio.name;
                select.appendChild(option);
            });
            
            console.log('✅ Estágios carregados:', estagios.length);
        } catch (error) {
            console.error("❌ Erro ao carregar estágios:", error);
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: "Aviso",
                    text: "Não foi possível carregar a lista de estágios.",
                    icon: "info",
                    confirmButtonColor: "#FFD700"
                });
            }
        }
    }

    // Função para atualizar as estatísticas
    function atualizarEstatisticas(tarefas) {
        const hoje = new Date();
        
        const estatisticas = tarefas.reduce((acc, tarefa) => {
            acc.total++;
            
            // Verifica se está em andamento (não concluída)
            if (tarefa.stage && !tarefa.stage.name.toLowerCase().includes('concluído')) {
                acc.emAndamento++;
            } else {
                acc.concluidas++;
            }
            
            // Verifica se está atrasada
            if (tarefa.deadline && new Date(tarefa.deadline) < hoje && 
                tarefa.stage && !tarefa.stage.name.toLowerCase().includes('concluído')) {
                acc.atrasadas++;
            }
            
            return acc;
        }, {
            total: 0,
            emAndamento: 0,
            concluidas: 0,
            atrasadas: 0
        });

        // Atualiza os elementos HTML
        document.getElementById('totalTarefas').textContent = estatisticas.total;
        document.getElementById('tarefasAndamento').textContent = estatisticas.emAndamento;
        document.getElementById('tarefasConcluidas').textContent = estatisticas.concluidas;
        document.getElementById('tarefasAtrasadas').textContent = estatisticas.atrasadas;
    }

    // Carrega as tarefas com base nos filtros
    async function carregarTarefas() {
        const clienteId = document.getElementById("filtroCliente").value;
        const estagioId = document.getElementById("filtroEstagio").value;
        
        try {
            console.log('📋 Carregando tarefas...', { clienteId, estagioId });
            
            let url = "http://localhost:8080/tasks";
            const params = new URLSearchParams();
            
            if (clienteId) params.append("client_id", clienteId);
            if (estagioId) params.append("stageId", estagioId);
            
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
            
            const container = document.getElementById("listaTarefas");
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

            // Agrupa tarefas por cliente
            const tarefasPorCliente = tarefas.reduce((acc, tarefa) => {
                const clienteNome = tarefa.client ? tarefa.client.name : "Sem Cliente";
                if (!acc[clienteNome]) acc[clienteNome] = [];
                acc[clienteNome].push(tarefa);
                return acc;
            }, {});

            // Renderiza as tarefas agrupadas
            Object.entries(tarefasPorCliente).forEach(([clienteNome, tarefasCliente]) => {
                const clienteSection = document.createElement("div");
                clienteSection.className = "cliente-section";
                clienteSection.innerHTML = `
                    <h3>${clienteNome}</h3>
                    <div class="tarefas-grid">
                        ${tarefasCliente.map(tarefa => `
                            <div class="tarefa-card">
                                <h4>${tarefa.title}</h4>
                                <p><strong>Descrição:</strong> ${tarefa.description || 'N/A'}</p>
                                <p><strong>Fase:</strong> ${tarefa.phase ? tarefa.phase.name : 'N/A'}</p>
                                <p><strong>Responsável:</strong> ${tarefa.collaborator ? tarefa.collaborator.name : 'N/A'}</p>
                                <p><strong>Prioridade:</strong> ${tarefa.priority || 'N/A'}</p>
                                <p><strong>Data de Entrega:</strong> ${tarefa.due_date ? new Date(tarefa.due_date).toLocaleDateString() : 'N/A'}</p>
                                <p><strong>Data de Criação:</strong> ${tarefa.creation_date ? new Date(tarefa.creation_date).toLocaleDateString() : 'N/A'}</p>
                            </div>
                        `).join('')}
                    </div>
                `;
                container.appendChild(clienteSection);
            });
            
        } catch (error) {
            console.error("❌ Erro ao carregar tarefas:", error);
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: "Aviso",
                    text: "Não foi possível carregar as tarefas.",
                    icon: "info",
                    confirmButtonColor: "#FFD700"
                });
            }
        }
    }

    // Função para gerar PDF
    window.gerarPDF = async function() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Título
        doc.setFontSize(16);
        doc.text("Relatório de Tarefas", 14, 15);
        
        // Data de geração
        doc.setFontSize(10);
        doc.text(`Gerado em: ${new Date().toLocaleDateString()}`, 14, 25);
        
        // Filtros aplicados
        const clienteFiltro = document.getElementById("filtroCliente").selectedOptions[0].text;
        const estagioFiltro = document.getElementById("filtroEstagio").selectedOptions[0].text;
        doc.text(`Filtros: Cliente - ${clienteFiltro}, Estágio - ${estagioFiltro}`, 14, 35);

        // Estatísticas
        doc.setFontSize(12);
        doc.text("Estatísticas:", 14, 45);
        doc.setFontSize(10);
        doc.text(`Total de Tarefas: ${document.getElementById('totalTarefas').textContent}`, 20, 55);
        doc.text(`Em Andamento: ${document.getElementById('tarefasAndamento').textContent}`, 20, 65);
        doc.text(`Concluídas: ${document.getElementById('tarefasConcluidas').textContent}`, 20, 75);
        doc.text(`Atrasadas: ${document.getElementById('tarefasAtrasadas').textContent}`, 20, 85);

        // Dados das tarefas
        const tarefas = document.querySelectorAll(".tarefa-card");
        let y = 95;
        
        tarefas.forEach((tarefa, index) => {
            if (y > 280) {
                doc.addPage();
                y = 15;
            }
            
            const cliente = tarefa.closest(".cliente-section").querySelector("h3").textContent;
            const titulo = tarefa.querySelector("h4").textContent;
            const responsavel = tarefa.querySelector("p:nth-child(2)").textContent.split(": ")[1];
            const estagio = tarefa.querySelector("p:nth-child(3)").textContent.split(": ")[1];
            const criacao = tarefa.querySelector("p:nth-child(4)").textContent.split(": ")[1];
            const prazo = tarefa.querySelector("p:nth-child(5)").textContent.split(": ")[1];
            const prioridade = tarefa.querySelector("p:nth-child(6)").textContent.split(": ")[1];

            doc.setFontSize(12);
            doc.text(`Cliente: ${cliente}`, 14, y);
            y += 7;
            doc.setFontSize(10);
            doc.text(`Título: ${titulo}`, 20, y);
            y += 5;
            doc.text(`Responsável: ${responsavel}`, 20, y);
            y += 5;
            doc.text(`Estágio: ${estagio}`, 20, y);
            y += 5;
            doc.text(`Criação: ${criacao}`, 20, y);
            y += 5;
            doc.text(`Prazo: ${prazo}`, 20, y);
            y += 5;
            doc.text(`Prioridade: ${prioridade}`, 20, y);
            y += 10;
        });

        doc.save("relatorio-tarefas.pdf");
    };

    // Inicializa a página
    async function inicializar() {
        try {
            console.log('🚀 Inicializando relatório de tarefas...');
            
            // Carregar dados iniciais
            await Promise.all([
                carregarClientes(),
                carregarEstagios()
            ]);
            
            // Carregar tarefas iniciais
            await carregarTarefas();
            
            console.log('✅ Relatório de tarefas inicializado');
        } catch (error) {
            console.error('❌ Erro ao inicializar:', error);
        }
    }

    // Adiciona event listeners para filtros
    document.getElementById("filtroCliente").addEventListener("change", carregarTarefas);
    document.getElementById("filtroEstagio").addEventListener("change", carregarTarefas);

    // Inicializa a página
    inicializar();
}); 