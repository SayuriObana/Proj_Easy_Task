/* Início do arquivo (collaboratorReport.js) – Adicionar trecho para salvar token e refreshToken no localStorage */

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

/* Fim do trecho adicionado */

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

    // Função utilitária para requisições autenticadas
    async function fetchComToken(url, options = {}) {
        const token = localStorage.getItem("accessToken");
        if (!token) {
            // Não redirecionar automaticamente, apenas retornar erro
            throw new Error('Token não disponível');
        }

        if (!options.headers) options.headers = {};
        options.headers["Authorization"] = `Bearer ${token}`;
        options.headers["Content-Type"] = "application/json";
        options.headers["Accept"] = "application/json";

        const response = await fetch(url, options);
        
        if (response.status === 401 || response.status === 403) {
            // Não redirecionar automaticamente, apenas retornar erro
            throw new Error('Falha na autenticação');
        }

        return response;
    }

    // Função para atualizar as estatísticas
    function atualizarEstatisticas(colaboradores, tarefas) {
        const estatisticas = {
            totalColaboradores: colaboradores.length,
            totalTarefas: tarefas.length,
            tarefasConcluidas: 0,
            tarefasAndamento: 0,
            tarefasAtrasadas: 0
        };

        // Calcula as estatísticas das tarefas
        tarefas.forEach(tarefa => {
            if (tarefa.stage && tarefa.stage.name === "Concluído") {
                estatisticas.tarefasConcluidas++;
            } else {
                estatisticas.tarefasAndamento++;
            }

            // Verifica se a tarefa está atrasada
            if (tarefa.deadline && new Date(tarefa.deadline) < new Date() && 
                tarefa.stage && tarefa.stage.name !== "Concluído") {
                estatisticas.tarefasAtrasadas++;
            }
        });

        // Calcula a média de tarefas por colaborador
        const mediaTarefasColaborador = estatisticas.totalColaboradores > 0 
            ? (estatisticas.totalTarefas / estatisticas.totalColaboradores).toFixed(1)
            : 0;

        // Atualiza os elementos HTML
        document.getElementById('totalColaboradores').textContent = estatisticas.totalColaboradores;
        document.getElementById('totalTarefas').textContent = estatisticas.totalTarefas;
        document.getElementById('tarefasConcluidas').textContent = estatisticas.tarefasConcluidas;
        document.getElementById('tarefasAndamento').textContent = estatisticas.tarefasAndamento;
        document.getElementById('tarefasAtrasadas').textContent = estatisticas.tarefasAtrasadas;
        document.getElementById('mediaTarefasColaborador').textContent = mediaTarefasColaborador;
    }

    // Modifica a função carregarDesempenhoColaborador para incluir as estatísticas
    async function carregarDesempenhoColaborador() {
        try {
            console.log('👥 Carregando dados de colaboradores...');
            
            const [colaboradoresResponse, tarefasResponse] = await Promise.all([
                fetchComToken("http://localhost:8080/collaborators"),
                fetchComToken("http://localhost:8080/tasks")
            ]);

            let colaboradores = [];
            let tarefas = [];

            // Processar resposta de colaboradores
            if (colaboradoresResponse.status === 404 || colaboradoresResponse.status === 403) {
                console.log("Nenhum colaborador cadastrado ainda");
            } else if (!colaboradoresResponse.ok) {
                console.warn('⚠️ Erro ao carregar colaboradores:', colaboradoresResponse.status);
            } else {
                colaboradores = await colaboradoresResponse.json();
                console.log('✅ Colaboradores carregados:', colaboradores.length);
            }

            // Processar resposta de tarefas
            if (tarefasResponse.status === 404 || tarefasResponse.status === 403) {
                console.log("Nenhuma tarefa cadastrada ainda");
            } else if (!tarefasResponse.ok) {
                console.warn('⚠️ Erro ao carregar tarefas:', tarefasResponse.status);
            } else {
                tarefas = await tarefasResponse.json();
                console.log('✅ Tarefas carregadas:', tarefas.length);
            }

            // Atualiza as estatísticas
            atualizarEstatisticas(colaboradores, tarefas);

            const container = document.getElementById("desempenhoColaborador");
            container.innerHTML = "";

            if (colaboradores.length === 0) {
                container.innerHTML = `
                    <div class="sem-dados">
                        <i class="fas fa-info-circle"></i>
                        <p>Nenhum colaborador cadastrado ainda.</p>
                        <p>Cadastre colaboradores para começar a gerar relatórios.</p>
                    </div>
                `;
                return;
            }

            // Renderizar colaboradores
            colaboradores.forEach(colaborador => {
                const card = document.createElement('div');
                card.className = 'collaborator-card';
                card.innerHTML = `
                    <div class="collaborator-info">
                        <h3>${colaborador.name}</h3>
                        <p><strong>Email:</strong> ${colaborador.email}</p>
                        <p><strong>Cargo:</strong> ${colaborador.position || 'N/A'}</p>
                        <p><strong>Telefone:</strong> ${colaborador.phone || 'N/A'}</p>
                        <p><strong>Nível de Acesso:</strong> ${colaborador.access_level || 'N/A'}</p>
                    </div>
                    <div class="collaborator-actions">
                        <button class="btn-pdf" onclick="gerarRelatorioPDF(${colaborador.id_collaborator}, '${colaborador.name}')">
                            <i class="fas fa-file-pdf"></i> Gerar PDF
                        </button>
                    </div>
                `;
                container.appendChild(card);
            });

        } catch (error) {
            console.error("❌ Erro ao carregar dados:", error);
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: "Aviso",
                    text: "Não foi possível carregar os dados dos colaboradores.",
                    icon: "info",
                    confirmButtonColor: "#FFD700"
                });
            }
        }
    }

    // Modifica a função gerarPDF para incluir as estatísticas
    window.gerarPDF = async function() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Título
        doc.setFontSize(16);
        doc.text("Relatório de Desempenho dos Colaboradores", 14, 15);
        
        // Data de geração
        doc.setFontSize(10);
        doc.text(`Gerado em: ${new Date().toLocaleDateString()}`, 14, 25);

        // Estatísticas
        doc.setFontSize(12);
        doc.text("Estatísticas Gerais:", 14, 35);
        doc.setFontSize(10);
        doc.text(`Total de Colaboradores: ${document.getElementById('totalColaboradores').textContent}`, 20, 45);
        doc.text(`Total de Tarefas: ${document.getElementById('totalTarefas').textContent}`, 20, 55);
        doc.text(`Tarefas Concluídas: ${document.getElementById('tarefasConcluidas').textContent}`, 20, 65);
        doc.text(`Tarefas em Andamento: ${document.getElementById('tarefasAndamento').textContent}`, 20, 75);
        doc.text(`Tarefas Atrasadas: ${document.getElementById('tarefasAtrasadas').textContent}`, 20, 85);
        doc.text(`Média de Tarefas por Colaborador: ${document.getElementById('mediaTarefasColaborador').textContent}`, 20, 95);

        // Dados dos colaboradores
        const container = document.getElementById("desempenhoColaborador");
        let y = 105;

        // ... resto do código existente para gerar o PDF ...

        doc.save("relatorio-colaboradores.pdf");
    };

    // Inicia a busca dos dados ao carregar a página
    carregarDesempenhoColaborador();
});

async function carregarColaboradores() {
    try {
        const response = await fetch("http://localhost:8080/collaborators");
        if (!response.ok) {
            const errorData = await response.json().catch(() => null); // Tenta obter a mensagem da API
            const errorMessage = errorData?.message || "Erro ao buscar colaboradores. Tente novamente.";
        
            Swal.fire({
                title: "Erro ao carregar colaboradores!",
                text: errorMessage,
                icon: "error",
                confirmButtonColor: "#d33",
                confirmButtonText: "OK"
            });
        
            throw new Error(errorMessage);
        }        

        const colaboradores = await response.json();
        const lista = document.getElementById("listaColaboradores");

        lista.innerHTML = ""; // Limpa a lista antes de recarregar

        colaboradores.forEach(colaborador => {
            const item = document.createElement("li");
            item.textContent = colaborador.name;

            // 🔹 Criando o botão de PDF
            const botaoPDF = document.createElement("button");
            botaoPDF.textContent = "PDF";
            botaoPDF.classList.add("btn-pdf"); // Classe para estilização
            botaoPDF.onclick = () => gerarRelatorioPDF(colaborador.id_collaborator, colaborador.name);

            // 🔹 Adiciona o botão ao lado do nome do colaborador
            item.appendChild(botaoPDF);
            lista.appendChild(item);
        });

    } catch (error) {
        console.error("Erro ao carregar colaboradores:", error);
    
        Swal.fire({
            title: "Erro!",
            text: "Erro ao carregar os colaboradores. Tente novamente.",
            icon: "error",
            confirmButtonColor: "#d33",
            confirmButtonText: "OK"
        });
    }    
}


async function gerarRelatorioColaborador(id) {
    try {
        const response = await fetch(`http://localhost:8080/collaborators/${id}/performance-report`);
        
        if (!response.ok) throw new Error(`Erro ${response.status}: ${response.statusText}`);

        const relatorio = await response.json();
        console.log("Relatório do colaborador:", relatorio);

        // ✅ Garante que as propriedades existam antes de acessar `.length`
        const aFazer = relatorio["A Fazer"] ? relatorio["A Fazer"].length : 0;
        const emAndamento = relatorio["Em Andamento"] ? relatorio["Em Andamento"].length : 0;
        const concluidas = relatorio["Concluídas"] ? relatorio["Concluídas"].length : 0;

        Swal.fire({
            title: "Relatório Individual",
            html: `
                <strong>A Fazer:</strong> ${aFazer}<br>
                <strong>Em Andamento:</strong> ${emAndamento}<br>
                <strong>Concluídas:</strong> ${concluidas}
            `,
            icon: "info"
        });

    } catch (error) {
        console.error("Erro ao buscar relatório:", error);
    
        Swal.fire({
            title: "Erro!",
            text: `Erro ao gerar relatório: ${error.message}`,
            icon: "error",
            confirmButtonColor: "#d33",
            confirmButtonText: "OK"
        });
    }
}

async function gerarRelatorioPDF(id, nomeColaborador) {
    try {
        const response = await fetch(`http://localhost:8080/collaborators/${id}/performance-report`);
        if (!response.ok) throw new Error(`Erro ${response.status}: ${response.statusText}`);

        const relatorio = await response.json();

        const aFazer = relatorio["A Fazer"] || [];
        const emAndamento = relatorio["Em Andamento"] || [];
        const concluidas = relatorio["Concluídas"] || [];

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // 🎨 Cabeçalho estilizado
        doc.setFont("helvetica", "bold");
        doc.setFontSize(20);
        doc.text("Relatório de Desempenho", 105, 20, { align: "center" });

        doc.setFontSize(14);
        doc.text(`Colaborador: ${nomeColaborador}`, 15, 35);
        doc.text(`Data: ${new Date().toLocaleDateString()}`, 150, 35);

        doc.setDrawColor(0);
        doc.setLineWidth(0.5);
        doc.line(15, 40, 195, 40); // Linha separadora

        // 📊 Estatísticas
        doc.setFontSize(12);
        doc.text(`Tarefas A Fazer: ${aFazer.length}`, 15, 50);
        doc.text(`Tarefas Em Andamento: ${emAndamento.length}`, 15, 60);
        doc.text(`Tarefas Concluídas: ${concluidas.length}`, 15, 70);

        // 📋 Criando tabela de tarefas
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(14);
        doc.text("Detalhamento das Tarefas:", 15, 85);

        const tarefas = [
            ...aFazer.map(tarefa => ["A Fazer", tarefa.title]),
            ...emAndamento.map(tarefa => ["Em Andamento", tarefa.title]),
            ...concluidas.map(tarefa => ["Concluída", tarefa.title])
        ];

        if (tarefas.length > 0) {
            doc.autoTable({
                startY: 90,
                head: [["Status", "Título"]],
                body: tarefas,
                theme: "grid",
                headStyles: { fillColor: [0, 102, 204] }, // Azul
                styles: { fontSize: 10, cellPadding: 3 }
            });
        } else {
            doc.setFontSize(12);
            doc.text("Nenhuma tarefa cadastrada.", 15, 95);
        }

        // 📥 Baixar com nome único
        const nomeArquivo = `Relatorio_${nomeColaborador.replace(/\s+/g, "_")}.pdf`;
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

