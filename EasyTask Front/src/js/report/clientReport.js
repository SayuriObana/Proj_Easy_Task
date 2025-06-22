// Função utilitária para requisições autenticadas
async function fetchComToken(url, options = {}) {
    let token = localStorage.getItem("accessToken");
    
    // Se não encontrar no localStorage, tenta no sessionStorage
    if (!token) {
        token = sessionStorage.getItem("accessToken");
        if (token) {
            localStorage.setItem("accessToken", token);
        }
    }

    // Se ainda não encontrou token, retorna erro
    if (!token) {
        console.log("Token não encontrado");
        throw new Error('Token não disponível');
    }

    // Configura os headers padrão
    const defaultHeaders = {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
    };

    // Mescla os headers padrão com os headers fornecidos
    options.headers = { ...defaultHeaders, ...options.headers };

    try {
        const response = await fetch(url, options);
        
        // Se a resposta for ok, retorna normalmente
        if (response.ok) {
            return response;
        }

        // Se receber 401 ou 403, tenta renovar o token
        if (response.status === 401 || response.status === 403) {
            const refreshToken = localStorage.getItem("refreshToken") || sessionStorage.getItem("refreshToken");
            
            if (!refreshToken) {
                throw new Error("Refresh token não encontrado");
            }

            try {
                const refreshResponse = await fetch("http://localhost:8080/collaborators/refresh-token", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ refreshToken })
                });

                if (!refreshResponse.ok) {
                    throw new Error("Falha ao renovar token");
                }

                const newTokens = await refreshResponse.json();
                localStorage.setItem("accessToken", newTokens.accessToken);
                
                // Tenta a requisição original novamente com o novo token
                options.headers["Authorization"] = `Bearer ${newTokens.accessToken}`;
                const retryResponse = await fetch(url, options);
                
                if (!retryResponse.ok) {
                    throw new Error(`Erro na requisição após renovação: ${retryResponse.status}`);
                }
                
                return retryResponse;
            } catch (refreshError) {
                console.error("Erro ao renovar token:", refreshError);
                // Não redirecionar automaticamente, apenas retornar erro
                throw new Error('Falha na autenticação');
            }
        }

        // Para outros erros, lança uma exceção
        throw new Error(`Erro na requisição: ${response.status}`);
    } catch (error) {
        console.error("Erro na requisição:", error);
        throw error;
    }
}

// Função para verificar autenticação
async function verificarAutenticacao() {
    try {
        const token = localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken");
        if (!token) {
            console.warn('⚠️ Token não encontrado');
            return false;
        }
        
        const response = await fetchComToken("http://localhost:8080/collaborators/me");
        if (!response.ok) {
            console.warn('⚠️ Usuário não autenticado');
            return false;
        }
        return true;
    } catch (error) {
        console.error("❌ Erro na verificação de autenticação:", error);
        return false;
    }
}

// Ao carregar a tela, verifica se o token e refreshToken já estão salvos
(async function inicializar() {
    const token = sessionStorage.getItem("accessToken");
    const refreshToken = sessionStorage.getItem("refreshToken");
    
    if (token && !localStorage.getItem("accessToken")) {
        localStorage.setItem("accessToken", token);
    }
    if (refreshToken && !localStorage.getItem("refreshToken")) {
        localStorage.setItem("refreshToken", refreshToken);
    }

    console.log('🚀 Inicializando relatório de clientes...');
})();

document.addEventListener("DOMContentLoaded", async () => {
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

    try {
        console.log('📋 Carregando relatório de clientes...');
        await carregarClientes();
        console.log('✅ Relatório de clientes carregado');
    } catch (error) {
        console.error("❌ Erro ao carregar clientes:", error);
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: "Aviso",
                text: "Não foi possível carregar os dados. Verifique sua conexão.",
                icon: "info",
                confirmButtonColor: "#FFD700"
            });
        }
    }

    // Sidebar - Menu Hambúrguer
    const menuBtn = document.getElementById("menuToggle");
    const sidebar = document.getElementById("sidebar");

    if (menuBtn && sidebar) {
        menuBtn.addEventListener("click", (event) => {
            event.stopPropagation();
            console.log("🔹 Clique no menu detectado!");

            sidebar.classList.add("open"); // 🔹 Forçando a classe a ser adicionada
            console.log("🔹 Classe 'open' adicionada!", sidebar.classList);
        });

        document.addEventListener("click", (event) => {
            if (!sidebar.contains(event.target) && event.target !== menuBtn) {
                sidebar.classList.remove("open");
            }
        });
    } else {
        console.warn("⚠️ Menu ou sidebar não encontrados");
    }
});

// 🔹 Função para buscar e listar os clientes na tela
async function carregarClientes() {
    try {
        console.log('👥 Carregando dados de clientes...');
        
        // Primeiro tenta buscar os clientes
        const clientesResponse = await fetchComToken("http://localhost:8080/clients");
        let clientes = [];
        
        // Se a resposta for 404 ou 403, significa que não há dados ainda
        if (clientesResponse.status === 404 || clientesResponse.status === 403) {
            console.log("Nenhum cliente cadastrado ainda");
        } else if (!clientesResponse.ok) {
            console.warn('⚠️ Erro ao carregar clientes:', clientesResponse.status);
        } else {
            clientes = await clientesResponse.json();
            console.log('✅ Clientes carregados:', clientes.length);
        }

        // Depois tenta buscar as tarefas
        const tarefasResponse = await fetchComToken("http://localhost:8080/tasks");
        let tarefas = [];
        
        // Se a resposta for 404 ou 403, significa que não há dados ainda
        if (tarefasResponse.status === 404 || tarefasResponse.status === 403) {
            console.log("Nenhuma tarefa cadastrada ainda");
        } else if (!tarefasResponse.ok) {
            console.warn('⚠️ Erro ao carregar tarefas:', tarefasResponse.status);
        } else {
            tarefas = await tarefasResponse.json();
            console.log('✅ Tarefas carregadas:', tarefas.length);
        }

        // Atualiza as estatísticas mesmo com arrays vazios
        atualizarEstatisticas(clientes, tarefas);

        const listaClientes = document.getElementById("listaClientes");
        listaClientes.innerHTML = "";

        if (clientes.length === 0) {
            // Se não houver clientes, mostra uma mensagem
            const mensagem = document.createElement("div");
            mensagem.className = "sem-dados";
            mensagem.innerHTML = `
                <i class="fas fa-info-circle"></i>
                <p>Nenhum cliente cadastrado ainda.</p>
                <p>Cadastre clientes para começar a gerar relatórios.</p>
            `;
            listaClientes.appendChild(mensagem);
            return;
        }

        // Renderizar clientes
        clientes.forEach(cliente => {
            const card = document.createElement('div');
            card.className = 'client-card';
            card.innerHTML = `
                <div class="client-info">
                    <h3>${cliente.name}</h3>
                    <p><strong>Email:</strong> ${cliente.email}</p>
                    <p><strong>Telefone:</strong> ${cliente.phone || 'N/A'}</p>
                    <p><strong>CNPJ:</strong> ${cliente.cnpj || 'N/A'}</p>
                </div>
                <div class="client-actions">
                    <button class="btn-pdf" onclick="gerarRelatorioClientePDF(${cliente.id_client}, '${cliente.name}')">
                        <i class="fas fa-file-pdf"></i> Gerar PDF
                    </button>
                </div>
            `;
            listaClientes.appendChild(card);
        });

    } catch (error) {
        console.error("❌ Erro ao carregar dados:", error);
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: "Atenção!",
                text: "Não há dados cadastrados ainda. Cadastre clientes e tarefas para começar a gerar relatórios.",
                icon: "info",
                confirmButtonColor: "#3085d6"
            });
        }
    }
}

// 🔹 Função para gerar o relatório PDF de um cliente específico
async function gerarRelatorioClientePDF(id, nomeCliente) {
    try {
        const url = `http://localhost:8080/tasks/report/client/${id}`;
        console.log(`🔹 Buscando relatório: ${url}`); // Debug no console

        const response = await fetchComToken(url);
        if (!response.ok) {
            throw new Error(`Erro ${response.status}: ${response.statusText}`);
        }

        const tarefas = await response.json();
        if (!tarefas) {
            throw new Error("Resposta vazia do servidor.");
        }

        console.log("📊 Relatório recebido:", tarefas);

        // 📄 Criando o PDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Criar um objeto para contar quantas tarefas existem por fase
        const fases = {};
        tarefas.forEach(tarefa => {
            if (tarefa.phase && tarefa.phase.name) {
                fases[tarefa.phase.name] = (fases[tarefa.phase.name] || 0) + 1;
            }
        });

        // Preparar os dados para o gráfico
        const labels = Object.keys(fases);
        const values = Object.values(fases);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.text("Relatório de Cliente", 105, 20, { align: "center" });

        doc.setFontSize(14);
        doc.text(`Cliente: ${nomeCliente}`, 15, 35);
        doc.text(`Data: ${new Date().toLocaleDateString()}`, 150, 35);

        doc.setDrawColor(0);
        doc.setLineWidth(0.5);
        doc.line(15, 40, 195, 40); // Linha separadora

        doc.setFontSize(12);
        doc.text(`Total de Tarefas: ${tarefas.length}`, 15, 50);

        let y = 65;
        doc.setFont("helvetica", "normal");

        // Criar tabela de tarefas
        const tarefasFormatadas = tarefas.map((tarefa, index) => [
            index + 1,
            tarefa.title,
            tarefa.phase ? tarefa.phase.name : 'N/A',
            tarefa.due_date ? new Date(tarefa.due_date).toLocaleDateString() : 'N/A',
        ]);

        if (tarefasFormatadas.length > 0) {
            doc.autoTable({
                startY: y,
                head: [["#", "Título", "Fase", "Data de Entrega"]],
                body: tarefasFormatadas,
                theme: "grid",
                headStyles: { fillColor: [0, 102, 204] }, // Azul
                styles: { fontSize: 10, cellPadding: 3 },
            });
        } else {
            doc.setFontSize(12);
            doc.setTextColor(150, 0, 0); // Define a cor do texto (vermelho escuro)

            const mensagem = "Nenhuma tarefa cadastrada.";
            const pageWidth = doc.internal.pageSize.width; // Obtém a largura da página
            const textWidth = doc.getTextWidth(mensagem); // Obtém a largura do texto
            const centerX = (pageWidth - textWidth) / 2; // Calcula a posição central

            doc.text(mensagem, centerX, y); // Centraliza a mensagem no PDF
        }

        const pageWidth = doc.internal.pageSize.getWidth();
        const imgWidth = 100;
        const imgHeight = 100;
        const imgX = (pageWidth - imgWidth) / 2;
        const currentY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 20 : 120;

        // 📥 Baixar com nome único
        const nomeArquivo = `Relatorio_${nomeCliente.replace(/\s+/g, "_")}.pdf`;
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
            text: `Erro ao gerar relatório: ${error.message}`,
            icon: "error",
            confirmButtonColor: "#d33",
            confirmButtonText: "OK"
        });
    }
}

// Função para atualizar as estatísticas
function atualizarEstatisticas(clientes, tarefas) {
    const estatisticas = {
        totalClientes: clientes.length || 0,
        totalTarefas: tarefas.length || 0,
        tarefasConcluidas: 0,
        tarefasAndamento: 0,
        tarefasAtrasadas: 0
    };

    // Calcula as estatísticas das tarefas
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

        // Verifica se a tarefa está atrasada
        if (tarefa.due_date && new Date(tarefa.due_date) < new Date() && 
            tarefa.phase && !tarefa.phase.name.toLowerCase().includes('concluído')) {
            estatisticas.tarefasAtrasadas++;
        }
    });

    // Calcula a média de tarefas por cliente
    const mediaTarefasCliente = estatisticas.totalClientes > 0 
        ? (estatisticas.totalTarefas / estatisticas.totalClientes).toFixed(1)
        : "0.0";

    // Atualiza os elementos HTML
    document.getElementById('totalClientes').textContent = estatisticas.totalClientes;
    document.getElementById('totalTarefas').textContent = estatisticas.totalTarefas;
    document.getElementById('tarefasConcluidas').textContent = estatisticas.tarefasConcluidas;
    document.getElementById('tarefasAndamento').textContent = estatisticas.tarefasAndamento;
    document.getElementById('tarefasAtrasadas').textContent = estatisticas.tarefasAtrasadas;
    document.getElementById('mediaTarefasCliente').textContent = mediaTarefasCliente;
}

