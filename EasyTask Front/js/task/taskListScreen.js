// =================================================================
//                 SISTEMA DE GERENCIAMENTO DE TAREFAS
// =================================================================

// Variáveis globais
let currentBoardId = null;
let boardPhases = [];
let allPhases = [];
let allTasks = [];
let isSubmitting = false; // Flag para evitar múltiplos submits
let currentTarefa = null; // Para o modal de detalhes
let currentEditingPhaseId = null; // Para controlar a edição de fases
let currentUser = null; // Para armazenar os dados do usuário logado
let isEditingMode = false; // Flag para controlar se está em modo de edição

// =================================================================
//                 FUNÇÕES DE PERMISSÃO
// =================================================================

// Função para verificar se o usuário tem permissão de administrador
window.hasAdminPermission = function() {
    try {
        // Verificar via authManager
        if (window.authManager && window.authManager.isSuperiorUser) {
            return window.authManager.isSuperiorUser();
        }
        
        // Verificar via localStorage
        const isSuperior = localStorage.getItem('isUsuarioSuperior');
        return isSuperior === 'true';
        
    } catch (error) {
        console.error("❌ Erro ao verificar permissões:", error);
        return false;
    }
};

// Função para verificar se o usuário está autenticado
window.isUserAuthenticated = function() {
    try {
        if (window.authManager && window.authManager.isAuthenticated) {
            return window.authManager.isAuthenticated();
        }
        
        const token = localStorage.getItem('accessToken') || 
                     localStorage.getItem('auth_token') || 
                     localStorage.getItem('token');
        return !!token;
        
    } catch (error) {
        console.error("❌ Erro ao verificar autenticação:", error);
        return false;
    }
};

// =================================================================
//                 INICIALIZAÇÃO DO SISTEMA
// =================================================================

document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log("🚀 Inicializando sistema de tarefas...");
        
        // 1. Verificar autenticação
        if (!window.isUserAuthenticated()) {
            console.warn("⚠️ Usuário não autenticado, redirecionando para login...");
            window.location.href = '../login/loginSystem.html';
            return;
        }
        
        // 2. Verificar permissões
        if (!window.hasAdminPermission()) {
            console.warn("⚠️ Usuário sem permissão SUPERIOR");
            Swal.fire({
                title: 'Acesso Limitado',
                text: 'Você não tem permissão para criar ou editar tarefas. Apenas usuários SUPERIOR podem gerenciar tarefas.',
                icon: 'warning',
                confirmButtonText: 'Continuar Visualizando',
                showCancelButton: true,
                cancelButtonText: 'Sair'
            }).then((result) => {
                if (!result.isConfirmed) {
                    window.location.href = '../globalMenu/mainMenu.html';
                }
            });
        }
        
        // 3. Obter ID do quadro da URL
        const urlParams = new URLSearchParams(window.location.search);
        currentBoardId = urlParams.get('id');
        
        if (!currentBoardId) {
            console.error("❌ ID do quadro não encontrado na URL");
            Swal.fire({
                title: 'Erro',
                text: 'ID do quadro não encontrado na URL. Redirecionando para lista de quadros.',
                icon: 'error'
            }).then(() => {
                window.location.href = '../board/boardListScreen.html';
            });
            return;
        }
        
        // 4. Buscar dados do usuário logado
        try {
            currentUser = await window.authManager.getCurrentUser();
            console.log("👤 Usuário logado:", currentUser);
        } catch (error) {
            console.warn("⚠️ Não foi possível obter dados do usuário logado:", error);
        }
        
        console.log(`✅ ID do Quadro: ${currentBoardId}`);
        
        // 5. Testar conectividade com o backend
        await testarBackend();
        
        // 6. Configurar event listeners
        configurarEventListeners();
        
        // 7. Carregar dados do quadro
        await carregarDadosDoQuadro();
        
        // 8. Carregar e renderizar tarefas
        await carregarTarefasDoQuadro();
        
        console.log("✅ Sistema inicializado com sucesso!");
        
    } catch (error) {
        console.error("❌ Erro ao inicializar sistema:", error);
        Swal.fire({
            title: 'Erro de Inicialização',
            text: 'Erro ao inicializar o sistema: ' + error.message,
            icon: 'error',
            confirmButtonText: 'Recarregar Página'
        }).then(() => {
            window.location.reload();
        });
    }
});

// =================================================================
//                 CARREGAMENTO DE DADOS
// =================================================================

async function carregarDadosDoQuadro() {
    try {
        console.log("📋 Carregando dados do quadro...");
        
        // 1. Buscar dados do quadro (inclui fases vinculadas)
        const boardResponse = await window.authManager.fetchWithAuth(
            `${window.API_CONFIG.BASE_URL}/boards/${currentBoardId}`
        );
        
        if (!boardResponse.ok) {
            throw new Error(`Erro ao buscar quadro: ${boardResponse.status}`);
        }
        
        const boardData = await boardResponse.json();
        console.log("📊 Dados do quadro:", boardData);
        
        // 2. Buscar todas as fases disponíveis
        const phasesResponse = await window.authManager.fetchWithAuth(
            `${window.API_CONFIG.BASE_URL}/phases`
        );
        
        if (!phasesResponse.ok) {
            throw new Error(`Erro ao buscar fases: ${phasesResponse.status}`);
        }
        
        allPhases = await phasesResponse.json();
        console.log("📋 Todas as fases:", allPhases);
        
        // 3. Filtrar fases que estão vinculadas ao quadro
        const phaseNamesOnBoard = new Set(boardData.phases || []);
        const filteredPhases = allPhases.filter(phase => phaseNamesOnBoard.has(phase.name));
        
        // 4. WORKAROUND: Remover fases duplicadas pelo nome, pois o backend permite nomes duplicados
        const uniquePhases = [];
        const seenNames = new Set();
        for (const phase of filteredPhases) {
            if (!seenNames.has(phase.name)) {
                uniquePhases.push(phase);
                seenNames.add(phase.name);
            }
        }
        boardPhases = uniquePhases;

        console.log("🔗 Fases vinculadas ao quadro (sem duplicatas):", boardPhases);
        
        // 5. Renderizar colunas do Kanban
        renderizarColunasKanban();
        
    } catch (error) {
        console.error("❌ Erro ao carregar dados do quadro:", error);
        throw error;
    }
}

async function carregarTarefasDoQuadro() {
    try {
        console.log("📝 Carregando tarefas do quadro...");
        
        const response = await window.authManager.fetchWithAuth(
            `${window.API_CONFIG.BASE_URL}/tasks/boards/${currentBoardId}`
        );
        
        if (!response.ok) {
            throw new Error(`Erro ao buscar tarefas: ${response.status}`);
        }
        
        let tarefas = await response.json();
        console.log("📋 Tarefas carregadas do backend:", tarefas);
        
        // Enriquecer tarefas com IDs dos clientes e colaboradores
        tarefas = await enriquecerTarefasComIds(tarefas);
        
        allTasks = tarefas;
        console.log("📋 Tarefas enriquecidas com IDs:", allTasks);
        
        // Renderizar tarefas nas colunas
        renderizarTarefasNasColunas();
        
    } catch (error) {
        console.error("❌ Erro ao carregar tarefas:", error);
        throw error;
    }
}

// Função para enriquecer tarefas com IDs
async function enriquecerTarefasComIds(tarefas) {
    try {
        console.log("🔍 Enriquecendo tarefas com IDs...");
        
        // Buscar clientes e colaboradores
        const [clientsResponse, collaboratorsResponse] = await Promise.all([
            window.authManager.fetchWithAuth(`${window.API_CONFIG.BASE_URL}/clients`),
            window.authManager.fetchWithAuth(`${window.API_CONFIG.BASE_URL}/collaborators`)
        ]);
        
        if (!clientsResponse.ok || !collaboratorsResponse.ok) {
            console.warn("⚠️ Não foi possível carregar clientes ou colaboradores para enriquecimento");
            return tarefas;
        }
        
        const clients = await clientsResponse.json();
        const collaborators = await collaboratorsResponse.json();
        
        console.log("📋 Clientes carregados:", clients.length);
        console.log("📋 Colaboradores carregados:", collaborators.length);
        
        // Enriquecer cada tarefa com IDs
        const tarefasEnriquecidas = tarefas.map(tarefa => {
            // Buscar ID do cliente pelo nome
            const cliente = clients.find(c => c.name === tarefa.clientName);
            const clientId = cliente ? cliente.idClient : null;
            
            // Buscar ID do colaborador pelo nome
            const colaborador = collaborators.find(c => c.name === tarefa.collaboratorName);
            const collaboratorId = colaborador ? colaborador.idCollaborator : null;
            
            // Buscar ID da fase pelo nome
            const fase = boardPhases.find(f => f.name === tarefa.phaseName);
            const phaseId = fase ? fase.idPhase : null;
            
            return {
                ...tarefa,
                clientId: clientId,
                collaboratorId: collaboratorId,
                phaseId: phaseId
            };
        });
        
        console.log("✅ Tarefas enriquecidas:", tarefasEnriquecidas);
        return tarefasEnriquecidas;
        
    } catch (error) {
        console.error("❌ Erro ao enriquecer tarefas:", error);
        return tarefas; // Retorna tarefas originais em caso de erro
    }
}

// =================================================================
//                 RENDERIZAÇÃO DO KANBAN
// =================================================================

function renderizarColunasKanban() {
    const kanbanBoard = document.querySelector('.kanban-board');
    if (!kanbanBoard) {
        console.error("❌ Container do Kanban não encontrado");
        return;
    }
    
    kanbanBoard.innerHTML = '';
    
    if (boardPhases.length === 0) {
        kanbanBoard.innerHTML = `
            <div class="kanban-empty-message">
                <h3>Nenhuma fase vinculada</h3>
                <p>Este quadro ainda não possui fases vinculadas.</p>
                <p>Entre em contato com o administrador para adicionar fases ao quadro.</p>
            </div>
        `;
        return;
    }
    
    // Ordenar fases pela sequência
    const fasesOrdenadas = [...boardPhases].sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
    
    fasesOrdenadas.forEach(fase => {
        const coluna = criarColunaFase(fase);
        kanbanBoard.appendChild(coluna);
    });
}

function criarColunaFase(fase) {
    const coluna = document.createElement('div');
    coluna.className = 'kanban-column';
    coluna.setAttribute('data-phase-id', fase.idPhase);
    coluna.setAttribute('draggable', 'true');
    const titulo = document.createElement('h3');
    titulo.className = 'kanban-column-title';
    titulo.textContent = fase.name;
    const tarefasContainer = document.createElement('div');
    tarefasContainer.className = 'kanban-tasks';
    tarefasContainer.setAttribute('data-phase-id', fase.idPhase);

    // Adiciona listeners de drag-and-drop diretamente na área de tarefas
    tarefasContainer.addEventListener('dragover', (e) => {
        e.preventDefault(); // Essencial para o drop funcionar
        tarefasContainer.classList.add('drag-over');
    });

    tarefasContainer.addEventListener('dragleave', () => {
        tarefasContainer.classList.remove('drag-over');
    });

    tarefasContainer.addEventListener('drop', async (e) => {
        e.preventDefault();
        tarefasContainer.classList.remove('drag-over');
        
        const taskId = e.dataTransfer.getData('text/plain');
        const taskData = e.dataTransfer.getData('application/json');

        if (!taskData || taskId.startsWith('phase-')) {
            return;
        }

        const tarefa = JSON.parse(taskData);
        const novaFaseId = fase.idPhase;

        const faseOriginal = boardPhases.find(f => f.name === tarefa.phaseName);
        
        if (faseOriginal && novaFaseId !== faseOriginal.idPhase) {
            await moverTarefaParaFase(tarefa.idTask, novaFaseId);
        }
    });

    coluna.appendChild(titulo);
    coluna.appendChild(tarefasContainer);
    // Drag and drop para colunas (fases)
    coluna.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', `phase-${fase.idPhase}`);
        e.dataTransfer.setData('application/json', JSON.stringify(fase));
        coluna.classList.add('dragging');
    });
    coluna.addEventListener('dragend', (e) => {
        coluna.classList.remove('dragging');
    });
    return coluna;
}

function renderizarTarefasNasColunas() {
    console.log("🎨 Renderizando tarefas nas colunas...");
    console.log("📋 Total de tarefas:", allTasks.length);
    console.log("📋 Tarefas:", allTasks);
    console.log("📋 Fases do quadro:", boardPhases);
    
    // Limpar todas as colunas
    const containers = document.querySelectorAll('.kanban-tasks');
    console.log("🔍 Containers encontrados:", containers.length);
    containers.forEach(container => {
        container.innerHTML = '';
    });
    
    // Distribuir tarefas pelas colunas
    allTasks.forEach(tarefa => {
        console.log("🎯 Processando tarefa:", tarefa.title, "Fase:", tarefa.phaseName);
        
        // Buscar a fase correspondente pelo nome
        const faseCorrespondente = boardPhases.find(fase => fase.name === tarefa.phaseName);
        
        if (faseCorrespondente) {
            // Encontrar o elemento da coluna correto
            const colunaElement = document.querySelector(`.kanban-column[data-phase-id="${faseCorrespondente.idPhase}"]`);
            
            if (colunaElement) {
                // Encontrar o container de tarefas DENTRO da coluna
                const tarefasContainer = colunaElement.querySelector('.kanban-tasks');
                if (tarefasContainer) {
                    const card = criarCardTarefa(tarefa);
                    tarefasContainer.appendChild(card); // Adicionar o card no lugar certo
                } else {
                    console.warn("⚠️ Container de tarefas não encontrado na coluna:", faseCorrespondente.name);
                }
            } else {
                console.warn("⚠️ Coluna não encontrada para fase:", faseCorrespondente.name);
            }
        } else {
            console.warn("⚠️ Fase não encontrada para tarefa:", tarefa.phaseName);
        }
    });
    
    console.log("✅ Renderização concluída");
}

function criarCardTarefa(tarefa) {
    const card = document.createElement('div');
    card.className = 'kanban-card';
    card.setAttribute('data-task-id', tarefa.idTask);
    card.setAttribute('data-client-id', tarefa.clientId || '');
    card.setAttribute('data-collaborator-id', tarefa.collaboratorId || '');
    card.setAttribute('data-phase-id', tarefa.phaseId || '');
    card.setAttribute('draggable', 'true'); // Tornar o card arrastável
    
    // Mapear prioridade numérica para classes CSS
    let prioridadeClass = 'indefinida';
    if (tarefa.priority === 1) prioridadeClass = 'baixa';
    else if (tarefa.priority === 2) prioridadeClass = 'media';
    else if (tarefa.priority === 3) prioridadeClass = 'alta';
    
    card.innerHTML = `
        <div class="card-header">
            <h4 class="card-title">${tarefa.title}</h4>
            <span class="priority ${prioridadeClass}">${tarefa.priority}</span>
        </div>
        <div class="card-body">
            <p class="card-description">${tarefa.description || 'Sem descrição'}</p>
            <div class="card-info">
                <div class="card-collaborator">
                    <i class="fas fa-user"></i>
                    <span>${tarefa.collaboratorName}</span>
                </div>
                <div class="card-client">
                    <i class="fas fa-building"></i>
                    <span>${tarefa.clientName}</span>
                </div>
                <div class="card-due-date">
                    <i class="fas fa-calendar"></i>
                    <span>${tarefa.dueDate ? new Date(tarefa.dueDate).toLocaleDateString('pt-BR') : 'Sem data'}</span>
                </div>
            </div>
        </div>
    `;
    
    // Event listeners para drag and drop
    card.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', tarefa.idTask);
        e.dataTransfer.setData('application/json', JSON.stringify(tarefa));
        card.classList.add('dragging');
    });
    card.addEventListener('dragend', (e) => {
        card.classList.remove('dragging');
    });
    
    // Event listener para abrir detalhes da tarefa (clique em qualquer lugar do card)
    card.addEventListener('click', (e) => {
        abrirDetalhesTarefa(tarefa);
    });
    
    return card;
}

// =================================================================
//                 GERENCIAMENTO DE FASES
// =================================================================

async function carregarDadosParaModalFases() {
    try {
        // Buscar todas as fases disponíveis
        const response = await window.authManager.fetchWithAuth(
            `${window.API_CONFIG.BASE_URL}/phases`
        );
        
        if (!response.ok) {
            throw new Error(`Erro ao buscar fases: ${response.status}`);
        }
        
        const todasFases = await response.json();
        
        // Renderizar tabelas no modal
        renderizarTabelaFasesDisponiveis(todasFases);
        renderizarTabelaFasesDoQuadro();
        
    } catch (error) {
        console.error("❌ Erro ao carregar dados para modal:", error);
        throw error;
    }
}

function renderizarTabelaFasesDisponiveis(todasFases) {
    const tbody = document.getElementById('phasesTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    todasFases.forEach(fase => {
        const isVinculada = boardPhases.some(bp => bp.idPhase === fase.idPhase);
        
        let actionsHtml = '';
        if (isVinculada) {
            actionsHtml = '<span class="phase-linked">✓ Vinculada</span>';
        } else {
            actionsHtml = `
                <button class="btn-add-phase" onclick="adicionarFaseAoQuadro(${fase.idPhase})">
                    <i class="fas fa-plus"></i> Adicionar
                </button>
                <button class="btn-delete-phase" onclick="excluirFasePermanentemente(${fase.idPhase})">
                    <i class="fas fa-trash"></i> Excluir
                </button>
            `;
        }

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${fase.name}</td>
            <td>${fase.description || '-'}</td>
            <td>${fase.sequence || '-'}</td>
            <td class="phase-actions">
                ${actionsHtml}
                <button class="btn-edit-phase" onclick="abrirEdicaoFase(${fase.idPhase})">
                    <i class="fas fa-edit"></i> Editar
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function renderizarTabelaFasesDoQuadro() {
    const tbody = document.getElementById('boardPhasesTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    boardPhases.forEach(fase => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${fase.name}</td>
            <td>${fase.sequence || '-'}</td>
            <td class="phase-actions">
                <button class="btn-remove-phase" onclick="removerFaseDoQuadro(${fase.idPhase})">
                    <i class="fas fa-unlink"></i> Desvincular
                </button>
                <button class="btn-edit-phase" onclick="abrirEdicaoFase(${fase.idPhase})">
                    <i class="fas fa-edit"></i> Editar
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function adicionarFaseAoQuadro(phaseId) {
    try {
        console.log(`🔗 Adicionando fase ${phaseId} ao quadro ${currentBoardId}`);
        
        const response = await window.authManager.fetchWithAuth(
            `${window.API_CONFIG.BASE_URL}/boards/${currentBoardId}/phases`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    phaseIds: [phaseId]
                })
            }
        );
        
        if (!response.ok) {
            throw new Error(`Erro ao adicionar fase: ${response.status}`);
        }
        
        console.log("✅ Fase adicionada com sucesso!");
        
        // Recarregar dados e atualizar interface
        await carregarDadosDoQuadro();
        await carregarTarefasDoQuadro();
        await carregarDadosParaModalFases();
        
        Swal.fire('Sucesso!', 'Fase adicionada ao quadro com sucesso!', 'success');
        
    } catch (error) {
        console.error("❌ Erro ao adicionar fase:", error);
        Swal.fire('Erro', 'Não foi possível adicionar a fase ao quadro', 'error');
    }
}

async function removerFaseDoQuadro(phaseId) {
    // 1. Verificar se a fase tem tarefas associadas
    const faseParaRemover = boardPhases.find(p => p.idPhase === phaseId);
    if (!faseParaRemover) {
        console.error("❌ Fase não encontrada para remoção:", phaseId);
        return;
    }

    const tarefasNaFase = allTasks.filter(tarefa => tarefa.phaseName === faseParaRemover.name);

    if (tarefasNaFase.length > 0) {
        Swal.fire({
            icon: 'error',
            title: 'Não é possível remover a fase',
            text: `A fase "${faseParaRemover.name}" contém ${tarefasNaFase.length} tarefa(s) e não pode ser desvinculada.`,
        });
        return; // Impede a remoção
    }

    // 2. Se não houver tarefas, prosseguir com a remoção
    try {
        const response = await window.authManager.fetchWithAuth(
            `${window.API_CONFIG.BASE_URL}/boards/${currentBoardId}/phases/${phaseId}`, {
                method: 'DELETE'
            }
        );
        
        if (!response.ok) {
            throw new Error(`Erro ao remover fase do quadro: ${response.status}`);
        }
        
        console.log("✅ Fase removida do quadro com sucesso");
        
        // Recarregar dados do quadro e das tarefas para atualizar a UI
        await carregarDadosDoQuadro();
        await carregarTarefasDoQuadro(); // Garante que as tarefas sejam redesenhadas
        await carregarDadosParaModalFases(); // Atualiza também o modal

        Swal.fire('Sucesso!', 'Fase removida do quadro com sucesso!', 'success');
        
    } catch (error) {
        console.error("❌ Erro ao remover fase do quadro:", error);
        Swal.fire('Erro', 'Não foi possível remover a fase do quadro', 'error');
    }
}

async function excluirFasePermanentemente(phaseId) {
    const result = await Swal.fire({
        title: 'Excluir Permanentemente?',
        text: "Esta ação não pode ser desfeita e removerá a fase de todos os quadros. Tem certeza?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sim, excluir permanentemente!',
        cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) {
        return;
    }

    try {
        const response = await window.authManager.fetchWithAuth(
            `${window.API_CONFIG.BASE_URL}/phases/${phaseId}`,
            { method: 'DELETE' }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.message || `Erro ao excluir fase: ${response.status}`;
            throw new Error(errorMessage);
        }

        Swal.fire('Excluída!', 'A fase foi excluída com sucesso.', 'success');
        
        // Recarregar os dados do modal para refletir a exclusão
        await carregarDadosParaModalFases();

    } catch (error) {
        console.error("❌ Erro ao excluir fase permanentemente:", error);
        Swal.fire('Erro', error.message, 'error');
    }
}

function abrirEdicaoFase(phaseId) {
    console.log(`✏️ Abrindo edição para fase ${phaseId}`);
    const phase = allPhases.find(p => p.idPhase === phaseId);
    if (!phase) {
        console.error("Fase não encontrada para edição");
        return;
    }

    currentEditingPhaseId = phaseId;

    document.getElementById('nomeFase').value = phase.name;
    document.getElementById('descricaoFase').value = phase.description || '';

    const submitBtn = document.querySelector('#formNovaFase button[type="submit"]');
    submitBtn.textContent = 'Salvar Alterações';

    const formActions = document.querySelector('#formNovaFase .form-actions');
    let cancelBtn = document.getElementById('btnCancelarEdicao');
    if (!cancelBtn) {
        cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.id = 'btnCancelarEdicao';
        cancelBtn.textContent = 'Cancelar';
        cancelBtn.className = 'btn-cancel';
        cancelBtn.onclick = cancelarEdicaoFase;
        formActions.appendChild(cancelBtn);
    }

    document.getElementById('formNovaFase').scrollIntoView({ behavior: 'smooth' });
}

function cancelarEdicaoFase() {
    currentEditingPhaseId = null;
    const form = document.getElementById('formNovaFase');
    form.reset();
    
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Salvar Fase';

    const cancelBtn = document.getElementById('btnCancelarEdicao');
    if (cancelBtn) {
        cancelBtn.remove();
    }
}

async function salvarFase(event) {
    event.preventDefault();

    const isEditing = currentEditingPhaseId !== null;
    
    const url = isEditing
        ? `${window.API_CONFIG.BASE_URL}/phases/${currentEditingPhaseId}`
        : `${window.API_CONFIG.BASE_URL}/phases`;
    
    const method = isEditing ? 'PUT' : 'POST';
    
    // Montar o corpo da requisição
    const formData = {
        name: document.getElementById('nomeFase').value,
        description: document.getElementById('descricaoFase').value,
    };

    if (isEditing) {
        const phaseToEdit = allPhases.find(p => p.idPhase === currentEditingPhaseId);
        if (phaseToEdit) {
            formData.idPhase = phaseToEdit.idPhase;
            formData.sequence = phaseToEdit.sequence;
        } else {
            Swal.fire('Erro', 'Não foi possível encontrar os dados originais da fase.', 'error');
            return;
        }
    } else {
        // Para criação (POST), o backend espera um valor de sequência.
        // Usamos um valor padrão que pode ser ajustado pelo backend.
        formData.sequence = (allPhases.length || 0) + 1;
    }

    try {
        const response = await window.authManager.fetchWithAuth(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            throw new Error(`Erro ao salvar fase: ${response.status}`);
        }

        const successMessage = isEditing ? 'Fase atualizada com sucesso!' : 'Fase criada com sucesso!';
        Swal.fire('Sucesso!', successMessage, 'success');

        cancelarEdicaoFase();
        
        await carregarDadosDoQuadro();
        await carregarTarefasDoQuadro();
        await carregarDadosParaModalFases();
        
    } catch (error) {
        console.error("❌ Erro ao salvar fase:", error);
        Swal.fire('Erro', 'Não foi possível salvar a fase', 'error');
    }
}

async function abrirModalFases() {
    console.log("🎴 Abrindo modal de fases...");
    const modal = document.getElementById('cardModal');
    if (modal) {
        modal.classList.add('show'); // Usa a classe CSS para exibir o modal
        await carregarDadosParaModalFases();
    } else {
        console.error("❌ Modal de fases não encontrado!");
    }
}

// =================================================================
//                 GERENCIAMENTO DE TAREFAS
// =================================================================

async function abrirModalNovaTarefa() {
    try {
        console.log("✨ Abrindo modal de nova tarefa...");
        
        // Definir modo de criação (não edição)
        isEditingMode = false;
        
        // Verificar permissões do usuário
        if (!window.hasAdminPermission && !window.authManager.isSuperiorUser()) {
            console.warn("⚠️ Usuário sem permissão para criar tarefas");
            Swal.fire('Acesso Negado', 'Apenas usuários SUPERIOR podem criar tarefas.', 'error');
            return;
        }
        
        // Verificar se o quadro está carregado
        if (!currentBoardId) {
            console.error("❌ ID do quadro não encontrado");
            Swal.fire('Erro', 'Quadro não encontrado. Recarregue a página.', 'error');
            return;
        }
        
        console.log(" boardPhases.length:", boardPhases.length);
        console.log("🔍 boardPhases:", boardPhases);
        
        // Verificar se há fases no quadro
        if (boardPhases.length === 0) {
            console.log("⚠️ Nenhuma fase vinculada ao quadro");
            Swal.fire({
                title: 'Atenção',
                text: 'Este quadro não possui fases vinculadas. Adicione fases antes de criar tarefas.',
                icon: 'warning',
                confirmButtonText: 'Gerenciar Fases',
                showCancelButton: true,
                cancelButtonText: 'Cancelar'
            }).then((result) => {
                if (result.isConfirmed) {
                    abrirModalFases();
                }
            });
            return;
        }
        
        console.log("✅ Fases encontradas, carregando dados do formulário...");
        
        // Carregar dados para o formulário
        await carregarDadosParaFormularioTarefa();
        
        console.log("✅ Dados carregados, exibindo modal...");
        
        // Exibir modal
        const modal = document.getElementById('taskModal');
        console.log("🔍 Modal encontrado:", modal);
        
        if (modal) {
            console.log("🔍 Classes atuais do modal:", modal.className);
            modal.classList.add('show');
            console.log("🔍 Classes após adicionar 'show':", modal.className);
            
            const titleElement = document.getElementById('taskModalTitle');
            if (titleElement) {
                titleElement.textContent = 'Nova Tarefa';
                console.log("✅ Título do modal atualizado");
            } else {
                console.warn("⚠️ Elemento taskModalTitle não encontrado");
            }
            
            // Definir data mínima como hoje
            const dataEntregaInput = document.getElementById('dataEntrega');
            if (dataEntregaInput) {
                const hoje = new Date().toISOString().split('T')[0];
                // Removida a limitação de data mínima para permitir tarefas atrasadas
                dataEntregaInput.value = hoje;
            }
            
            // Configurar validação em tempo real
            configurarValidacaoTempoReal();
            
            console.log("✅ Modal exibido com sucesso");
        } else {
            console.error("❌ Modal não encontrado no DOM");
            Swal.fire('Erro', 'Modal não encontrado. Recarregue a página.', 'error');
        }
        
    } catch (error) {
        console.error("❌ Erro ao abrir modal de tarefa:", error);
        Swal.fire({
            title: 'Erro',
            text: 'Não foi possível abrir o formulário de tarefa: ' + error.message,
            icon: 'error'
        });
    }
}

async function carregarDadosParaFormularioTarefa() {
    try {
        console.log("📋 CARREGANDO DADOS PARA FORM");
        console.log("🔍 API_CONFIG.BASE_URL:", window.API_CONFIG.BASE_URL);

        // Verificar se há fases disponíveis
        if (!boardPhases || boardPhases.length === 0) {
            throw new Error('Nenhuma fase disponível no quadro');
        }

        // Carregar clientes
        console.log("📋 Carregando clientes...");
        const clientsUrl = `${window.API_CONFIG.BASE_URL}/clients`;
        console.log("🔍 URL dos clientes:", clientsUrl);
        
        const clientsResponse = await window.authManager.fetchWithAuth(clientsUrl);
        console.log("📡 Resposta dos clientes:", clientsResponse.status, clientsResponse.statusText);
        
        if (!clientsResponse.ok) {
            const errorText = await clientsResponse.text();
            console.error("❌ Erro na resposta dos clientes:", errorText);
            throw new Error(`Falha ao carregar clientes: ${clientsResponse.status} - ${errorText}`);
        }
        
        const clients = await clientsResponse.json();
        console.log("📋 Clientes carregados:", clients);
        console.log("📋 Número de clientes:", clients.length);
        
        // Verificar estrutura dos dados de clientes
        if (clients.length > 0) {
            console.log("🔍 Estrutura do primeiro cliente:", clients[0]);
            console.log("🔍 Campos disponíveis no cliente:", Object.keys(clients[0]));
            
            // Verificar se os campos esperados existem
            const primeiroCliente = clients[0];
            console.log("🔍 Campo 'name' existe:", 'name' in primeiroCliente);
            console.log("🔍 Campo 'clientId' existe:", 'clientId' in primeiroCliente);
            console.log("🔍 Campo 'idClient' existe:", 'idClient' in primeiroCliente);
            console.log("🔍 Campo 'id' existe:", 'id' in primeiroCliente);
        }
        
        if (clients.length === 0) {
            throw new Error('Nenhum cliente cadastrado no sistema');
        }
        
        // Determinar os campos corretos baseado na estrutura dos dados
        const clientDisplayField = clients[0].name ? 'name' : 'clientName';
        const clientValueField = clients[0].clientId ? 'clientId' : 
                                clients[0].idClient ? 'idClient' : 
                                clients[0].id ? 'id' : 'clientId';
        
        console.log("🔍 Campos escolhidos para clientes:", { displayField: clientDisplayField, valueField: clientValueField });
        
        preencherSelect('cliente', clients, clientDisplayField, clientValueField);

        // Carregar colaboradores
        console.log("📋 Carregando colaboradores...");
        const collaboratorsUrl = `${window.API_CONFIG.BASE_URL}/collaborators`;
        console.log("🔍 URL dos colaboradores:", collaboratorsUrl);
        
        const collaboratorsResponse = await window.authManager.fetchWithAuth(collaboratorsUrl);
        console.log("📡 Resposta dos colaboradores:", collaboratorsResponse.status, collaboratorsResponse.statusText);
        
        if (!collaboratorsResponse.ok) {
            const errorText = await collaboratorsResponse.text();
            console.error("❌ Erro na resposta dos colaboradores:", errorText);
            throw new Error(`Falha ao carregar colaboradores: ${collaboratorsResponse.status} - ${errorText}`);
        }
        
        const collaborators = await collaboratorsResponse.json();
        console.log("📋 Colaboradores carregados:", collaborators);
        console.log("📋 Número de colaboradores:", collaborators.length);
        
        // Verificar estrutura dos dados de colaboradores
        if (collaborators.length > 0) {
            console.log("🔍 Estrutura do primeiro colaborador:", collaborators[0]);
            console.log("🔍 Campos disponíveis no colaborador:", Object.keys(collaborators[0]));
            
            // Verificar se os campos esperados existem
            const primeiroColaborador = collaborators[0];
            console.log("🔍 Campo 'name' existe:", 'name' in primeiroColaborador);
            console.log("🔍 Campo 'collaboratorId' existe:", 'collaboratorId' in primeiroColaborador);
            console.log("🔍 Campo 'idCollaborator' existe:", 'idCollaborator' in primeiroColaborador);
            console.log("🔍 Campo 'id' existe:", 'id' in primeiroColaborador);
        }
        
        if (collaborators.length === 0) {
            throw new Error('Nenhum colaborador cadastrado no sistema');
        }
        
        // Determinar os campos corretos baseado na estrutura dos dados
        const collaboratorDisplayField = collaborators[0].name ? 'name' : 'collaboratorName';
        const collaboratorValueField = collaborators[0].collaboratorId ? 'collaboratorId' : 
                                      collaborators[0].idCollaborator ? 'idCollaborator' : 
                                      collaborators[0].id ? 'id' : 'collaboratorId';
        
        console.log("🔍 Campos escolhidos para colaboradores:", { displayField: collaboratorDisplayField, valueField: collaboratorValueField });
        
        preencherSelect('colaborador', collaborators, collaboratorDisplayField, collaboratorValueField);

        // Carregar fases do quadro
        console.log("📋 Carregando fases do quadro...");
        console.log("📋 Fases disponíveis:", boardPhases);
        preencherSelect('fase', boardPhases, 'name', 'idPhase');
        
        console.log("✅ Todos os dados carregados com sucesso");

    } catch (error) {
        console.error("❌ Erro ao carregar dados para o formulário:", error);
        
        // Fechar modal se houver erro
        fecharModalTarefa();
        
        Swal.fire({
            title: 'Erro ao Carregar Dados',
            text: error.message,
            icon: 'error',
            confirmButtonColor: '#d33'
        });
        
        throw error;
    }
}

function preencherSelect(selectId, data, displayField, valueField) {
    console.log(`🔍 Preenchendo select '${selectId}' com dados:`, data);
    console.log(`🔍 Campos esperados: displayField='${displayField}', valueField='${valueField}'`);
    
    const select = document.getElementById(selectId);
    if (!select) {
        console.error(`❌ Select com ID '${selectId}' não encontrado`);
        return;
    }
    
    console.log(`✅ Select '${selectId}' encontrado:`, select);
    
    if (!Array.isArray(data)) {
        console.error(`❌ Dados para select '${selectId}' não são um array:`, data);
        return;
    }
    
    if (data.length === 0) {
        console.warn(`⚠️ Nenhum dado disponível para select '${selectId}'`);
        select.innerHTML = `<option value="">Nenhum item disponível</option>`;
        return;
    }
    
    // Verificar estrutura dos dados
    console.log(`🔍 Primeiro item dos dados:`, data[0]);
    console.log(`🔍 Campos disponíveis no primeiro item:`, Object.keys(data[0]));
    
    // Limpar select
    select.innerHTML = `<option value="">Selecione...</option>`;
    
    // Adicionar opções
    let opcoesAdicionadas = 0;
    data.forEach((item, index) => {
        console.log(`🔍 Processando item ${index}:`, item);
        
        if (!item[displayField] || !item[valueField]) {
            console.warn(`⚠️ Item inválido para select '${selectId}' (índice ${index}):`, item);
            console.warn(`⚠️ displayField '${displayField}' =`, item[displayField]);
            console.warn(`⚠️ valueField '${valueField}' =`, item[valueField]);
            return;
        }
        
        const option = document.createElement('option');
        option.value = item[valueField];
        option.textContent = item[displayField];
        select.appendChild(option);
        opcoesAdicionadas++;
        
        console.log(`✅ Opção adicionada: ${item[displayField]} (${item[valueField]})`);
    });
    
    console.log(`✅ Select '${selectId}' preenchido com ${opcoesAdicionadas} itens de ${data.length} disponíveis`);
    
    // Verificar resultado final
    console.log(`🔍 Opções finais do select '${selectId}':`, select.innerHTML);
}

async function salvarTarefa(event) {
    event.preventDefault();
    
    // Proteção contra múltiplos submits
    if (isSubmitting) {
        console.warn("⚠️ Tentativa de submit duplicado bloqueada");
        return;
    }
    
    try {
        isSubmitting = true;
        
        console.log("🔍 isEditingMode no início de salvarTarefa:", isEditingMode);
        
        if (isEditingMode) {
            console.log("✏️ Atualizando tarefa existente...");
        } else {
            console.log("💾 Salvando nova tarefa...");
        }
        
        // Verificar permissões do usuário
        if (!window.hasAdminPermission && !window.authManager.isSuperiorUser()) {
            console.warn("⚠️ Usuário sem permissão para criar/editar tarefas");
            Swal.fire('Acesso Negado', 'Apenas usuários SUPERIOR podem criar/editar tarefas.', 'error');
            return;
        }
        
        // Verificar se o quadro está carregado
        if (!currentBoardId) {
            console.error("❌ ID do quadro não encontrado");
            Swal.fire('Erro', 'Quadro não encontrado. Recarregue a página.', 'error');
            return;
        }
        
        // Obter valores dos campos do formulário
        const titulo = document.getElementById('tituloTarefa').value.trim();
        const descricao = document.getElementById('descricao').value.trim();
        const prioridade = document.getElementById('prioridade').value;
        const dataEntrega = document.getElementById('dataEntrega').value;
        const fase = document.getElementById('fase').value;
        const cliente = document.getElementById('cliente').value;
        const colaborador = document.getElementById('colaborador').value;
        
        console.log("📋 Valores dos campos:", {
            titulo, descricao, prioridade, dataEntrega, fase, cliente, colaborador
        });
        
        // Validações detalhadas
        const erros = [];
        
        if (!titulo) {
            erros.push("Título da tarefa é obrigatório");
        } else if (titulo.length < 3) {
            erros.push("Título deve ter pelo menos 3 caracteres");
        }
        
        if (!prioridade) {
            erros.push("Prioridade é obrigatória");
        }
        
        if (!dataEntrega) {
            erros.push("Data de entrega é obrigatória");
        }
        
        if (!fase) {
            erros.push("Fase é obrigatória");
        }
        
        if (!cliente) {
            erros.push("Cliente é obrigatório");
        }
        
        if (!colaborador) {
            erros.push("Colaborador é obrigatório");
        }
        
        if (erros.length > 0) {
            const mensagemErro = erros.join('\n');
            console.error("❌ Erros de validação:", erros);
            Swal.fire('Erro de Validação', mensagemErro, 'error');
            return;
        }
        
        // Verificar se a fase pertence ao quadro atual
        const faseValida = boardPhases.find(f => f.idPhase == fase);
        if (!faseValida) {
            console.warn("⚠️ Fase não pertence ao quadro atual");
            Swal.fire('Erro', 'A fase selecionada não pertence a este quadro.', 'error');
            return;
        }
        
        const tarefaData = {
            title: titulo,
            description: descricao || null,
            priority: parseInt(prioridade),
            dueDate: dataEntrega,
            boardId: parseInt(currentBoardId),
            phaseId: parseInt(fase),
            clientId: parseInt(cliente),
            collaboratorId: parseInt(colaborador)
        };
        
        console.log("📋 Dados da tarefa para envio:", tarefaData);
        
        // Desabilitar botão de submit durante o processo
        const submitBtn = event.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = isEditingMode ? 'Atualizando...' : 'Salvando...';
        
        let response;
        if (isEditingMode) {
            // Modo de edição - fazer PUT
            response = await window.authManager.fetchWithAuth(
                `${window.API_CONFIG.BASE_URL}/tasks/${currentTarefa.idTask}`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(tarefaData)
                }
            );
        } else {
            // Modo de criação - fazer POST
            response = await window.authManager.fetchWithAuth(
                `${window.API_CONFIG.BASE_URL}/tasks`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(tarefaData)
                }
            );
        }
        
        console.log("📡 Resposta do servidor:", response.status, response.statusText);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error("❌ Erro na resposta:", errorText);
            
            let errorMessage = isEditingMode ? 'Erro ao atualizar tarefa' : 'Erro ao criar tarefa';
            
            if (response.status === 403) {
                errorMessage = 'Você não tem permissão para criar/editar tarefas. Apenas usuários SUPERIOR podem criar/editar tarefas.';
            } else if (response.status === 400) {
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.message || 'Dados inválidos fornecidos';
                } catch {
                    errorMessage = 'Dados inválidos fornecidos';
                }
            } else if (response.status === 409) {
                errorMessage = 'Já existe uma tarefa com este título neste quadro.';
            } else if (response.status === 404) {
                errorMessage = isEditingMode ? 'Tarefa não encontrada.' : 'Quadro, fase, cliente ou colaborador não encontrado.';
            } else {
                errorMessage = `Erro do servidor: ${response.status} - ${errorText}`;
            }
            
            throw new Error(errorMessage);
        }
        
        const tarefaSalva = await response.json();
        console.log("✅ Tarefa salva com sucesso:", tarefaSalva);
        
        // Armazenar o modo antes de resetar
        const modoAtual = isEditingMode;
        
        // Limpar formulário
        event.target.reset();
        
        // Fechar modal manualmente (sem chamar fecharModalTarefa para não resetar isEditingMode prematuramente)
        console.log("🔒 Fechando modal...");
        const modal = document.getElementById('taskModal');
        if (modal) {
            modal.classList.remove('show');
        }
        
        // Resetar modo de edição APÓS fechar o modal
        isEditingMode = false;
        currentTarefa = null;
        
        console.log("🔄 Recarregando tarefas do quadro...");
        await carregarTarefasDoQuadro();
        
        console.log("✅ Processo concluído com sucesso!");
        Swal.fire({
            title: 'Sucesso!',
            text: modoAtual ? 'Tarefa atualizada com sucesso!' : 'Tarefa criada com sucesso!',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
        });
        
    } catch (error) {
        console.error("❌ Erro ao salvar tarefa:", error);
        Swal.fire({
            title: 'Erro',
            text: error.message,
            icon: 'error'
        });
    } finally {
        // Reabilitar botão de submit
        const submitBtn = event.target.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'SALVAR';
        }
        
        // Resetar flag de submissão
        isSubmitting = false;
    }
}

function abrirDetalhesTarefa(tarefa) {
    console.log("🔍 DADOS DA TAREFA CLICADA:", tarefa);
    console.log("👤 DADOS DO USUÁRIO LOGADO:", currentUser);
    console.log("📋 Abrindo detalhes da tarefa:", tarefa);
    
    // Armazenar a tarefa atual
    currentTarefa = tarefa;
    
    // Preencher modal de detalhes
    document.getElementById('popupTitulo').textContent = tarefa.title;
    document.getElementById('popupCliente').textContent = tarefa.clientName;
    document.getElementById('popupColaborador').textContent = tarefa.collaboratorName;
    document.getElementById('popupDescricao').textContent = tarefa.description || 'Sem descrição';
    document.getElementById('popupPrioridade').textContent = tarefa.priority;
    document.getElementById('popupDataEntrega').textContent = tarefa.dueDate ? new Date(tarefa.dueDate).toLocaleDateString('pt-BR') : 'Sem data';

    
    // Configurar o botão de exclusão com o ID correto
    const botaoExcluir = document.getElementById('btnExcluirTarefa');
    if (botaoExcluir) {
        // Remove listeners antigos para evitar chamadas múltiplas
        const novoBotao = botaoExcluir.cloneNode(true);
        botaoExcluir.parentNode.replaceChild(novoBotao, botaoExcluir);
        
        novoBotao.addEventListener('click', async () => {
            const result = await Swal.fire({
                title: 'Excluir Tarefa?',
                text: `Deseja realmente excluir a tarefa "${tarefa.title}"?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Sim, excluir!',
                cancelButtonText: 'Cancelar'
            });

            if (result.isConfirmed) {
                fecharDetalhesTarefa(); // Fecha o modal antes de excluir
                await excluirTarefaPorId(tarefa.idTask);
            }
        });
    }

    // Carregar comentários
    carregarComentarios(tarefa.idTask);

    // Configurar formulário de comentário
    const comentarioForm = document.getElementById('comentario-form');
    const novoForm = comentarioForm.cloneNode(true);
    comentarioForm.parentNode.replaceChild(novoForm, comentarioForm);

    novoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const comentarioInput = novoForm.querySelector('#comentario-input');
        const content = comentarioInput.value.trim();
        if (content) {
            // Usa o nome do usuário logado para comentar
            await adicionarComentario(tarefa.idTask, content, tarefa.collaboratorName);
            comentarioInput.value = '';
        }
    });

    // Exibir modal
    const modal = document.getElementById('popupDetalhes');
    if (modal) {
        modal.classList.add('show');
    }
}

// =================================================================
//                 GERENCIAMENTO DE COMENTÁRIOS
// =================================================================

async function carregarComentarios(taskId) {
    const listaComentarios = document.getElementById('comentarios-lista');
    listaComentarios.innerHTML = '<p>Carregando comentários...</p>';

    try {
        const response = await window.authManager.fetchWithAuth(
            `${window.API_CONFIG.BASE_URL}/comments/task/${taskId}`
        );

        if (!response.ok) {
            throw new Error(`Erro ao buscar comentários: ${response.status}`);
        }

        const comments = await response.json();
        renderizarComentarios(comments, taskId);

    } catch (error) {
        console.error("❌ Erro ao carregar comentários:", error);
        listaComentarios.innerHTML = '<p class="error">Não foi possível carregar os comentários.</p>';
    }

}

function renderizarComentarios(comments, taskId) {
    const listaComentarios = document.getElementById('comentarios-lista');
    listaComentarios.innerHTML = '';

    if (comments.length === 0) {
        listaComentarios.innerHTML = '<p class="no-comments">Ainda não há comentários nesta tarefa.</p>';
        return;
    }

    comments.forEach(comment => {
        const divComentario = document.createElement('div');
        divComentario.className = 'comentario';
        divComentario.id = `comment-${comment.idComment}`;

        const dataFormatada = new Date(comment.dateTime).toLocaleString('pt-BR');

        let acoesHtml = '';
        if (currentUser && currentUser.nome === comment.collaboratorName) {
            acoesHtml = `
                <div class="comentario-acoes">
                    <button onclick="iniciarEdicaoComentario(${comment.idComment}, ${taskId})"><i class="fas fa-edit"></i> Editar</button>
                    <button onclick="excluirComentario(${comment.idComment}, ${taskId})"><i class="fas fa-trash"></i> Excluir</button>
                </div>
            `;
        }

        divComentario.innerHTML = `
            <div class="comentario-header">
                <span class="comentario-autor">${comment.collaboratorName}</span>
                <span class="comentario-data">${dataFormatada}</span>
            </div>
            <div class="comentario-conteudo">
                <p>${comment.content.replace(/\n/g, '<br>')}</p>
            </div>
            ${acoesHtml}
        `;

        listaComentarios.appendChild(divComentario);
    });
}

async function adicionarComentario(taskId, content, collaboratorName) {
    if (!collaboratorName) {
        Swal.fire('Erro', 'Não foi possível identificar o colaborador para comentar.', 'error');
        return;
    }

    // Log para debug
    console.log('🔍 Debug - Dados do comentário:', {
        taskId,
        content,
        collaboratorName,
        currentUser
    });

    // Buscar a tarefa atual para obter o collaboratorId
    const tarefaAtual = allTasks.find(t => t.idTask === taskId);
    let collaboratorId = null;

    if (tarefaAtual && tarefaAtual.collaboratorId) {
        collaboratorId = tarefaAtual.collaboratorId;
        console.log('✅ Usando collaboratorId da tarefa:', collaboratorId);
    } else if (currentUser && currentUser.idCollaborator) {
        collaboratorId = currentUser.idCollaborator;
        console.log('✅ Usando collaboratorId do usuário logado:', collaboratorId);
    } else {
        console.log('🔍 Buscando ID do colaborador pelo nome:', collaboratorName);
        try {
            const collaboratorsResponse = await window.authManager.fetchWithAuth(
                `${window.API_CONFIG.BASE_URL}/collaborators`
            );
            if (collaboratorsResponse.ok) {
                const collaborators = await collaboratorsResponse.json();
                const collaborator = collaborators.find(c => c.name === collaboratorName);
                if (collaborator) {
                    collaboratorId = collaborator.idCollaborator;
                    console.log('✅ ID do colaborador encontrado:', collaboratorId);
                } else {
                    console.warn('⚠️ Colaborador não encontrado na lista:', collaboratorName);
                }
            }
        } catch (error) {
            console.error('❌ Erro ao buscar colaboradores:', error);
        }
    }

    // Usar ID se disponível, senão usar nome
    const commentData = collaboratorId ? {
        idTask: taskId,
        idCollaborator: collaboratorId,
        content: content
    } : {
        idTask: taskId,
        collaboratorName: collaboratorName,
        content: content
    };

    console.log('📡 Enviando dados do comentário:', JSON.stringify(commentData, null, 2));

    try {
        const response = await window.authManager.fetchWithAuth(
            `${window.API_CONFIG.BASE_URL}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(commentData)
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Resposta de erro do servidor:', errorText);
            throw new Error(`Erro ao criar comentário: ${response.status} - ${errorText}`);
        }
        await carregarComentarios(taskId);
    } catch (error) {
        console.error('❌ Erro ao adicionar comentário:', error);
        Swal.fire('Erro', 'Não foi possível adicionar o comentário.', 'error');
    }
}

async function excluirComentario(commentId, taskId) {
    const result = await Swal.fire({
        title: 'Excluir Comentário?',
        text: "Esta ação não pode ser desfeita.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sim, excluir!',
        cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    try {
        const response = await window.authManager.fetchWithAuth(
            `${window.API_CONFIG.BASE_URL}/comments/${commentId}`, {
                method: 'DELETE'
            }
        );

        if (!response.ok) {
            if (response.status === 403) throw new Error('Você não tem permissão para excluir este comentário.');
            throw new Error(`Erro ao excluir o comentário: ${response.status}`);
        }

        const commentElement = document.getElementById(`comment-${commentId}`);
        if (commentElement) {
            commentElement.style.transition = 'opacity 0.5s, transform 0.5s';
            commentElement.style.opacity = '0';
            commentElement.style.transform = 'translateX(-100px)';
            setTimeout(() => {
                commentElement.remove();
                const lista = document.getElementById('comentarios-lista');
                if (lista.childElementCount === 0) {
                    lista.innerHTML = '<p class="no-comments">Ainda não há comentários nesta tarefa.</p>';
                }
            }, 500);
        } else {
            await carregarComentarios(taskId);
        }
    } catch (error) {
        console.error('❌ Erro ao excluir comentário:', error);
        Swal.fire('Erro', error.message, 'error');
    }
}

function iniciarEdicaoComentario(commentId, taskId) {
    const commentElement = document.getElementById(`comment-${commentId}`);
    if (!commentElement) return;

    const conteudoDiv = commentElement.querySelector('.comentario-conteudo');
    const acoesDiv = commentElement.querySelector('.comentario-acoes');
    const originalContent = conteudoDiv.querySelector('p').innerHTML.replace(/<br>/g, '\n');

    conteudoDiv.innerHTML = `<textarea class="edit-textarea">${originalContent}</textarea>`;
    acoesDiv.innerHTML = `
        <button class="btn-salvar" onclick="salvarEdicaoComentario(${commentId}, ${taskId})"><i class="fas fa-check"></i> Salvar</button>
        <button class="btn-cancelar" onclick="cancelarEdicaoComentario(${commentId}, ${taskId})"><i class="fas fa-times"></i> Cancelar</button>
    `;
    conteudoDiv.querySelector('textarea').focus();
}

async function salvarEdicaoComentario(commentId, taskId) {
    const commentElement = document.getElementById(`comment-${commentId}`);
    const textarea = commentElement.querySelector('.edit-textarea');
    const newContent = textarea.value.trim();

    if (!newContent) {
        Swal.fire('Atenção', 'O comentário não pode ficar vazio.', 'warning');
        return;
    }

    if (!currentUser || !currentUser.nome) {
        Swal.fire('Erro', 'Não foi possível identificar o usuário para salvar a alteração.', 'error');
        return;
    }

    // Log para debug
    console.log('🔍 Debug - Editando comentário:', {
        commentId,
        taskId,
        newContent,
        currentUser
    });

    // Buscar a tarefa atual para obter o collaboratorId
    const tarefaAtual = allTasks.find(t => t.idTask === taskId);
    let collaboratorId = null;

    if (tarefaAtual && tarefaAtual.collaboratorId) {
        collaboratorId = tarefaAtual.collaboratorId;
        console.log('✅ Usando collaboratorId da tarefa:', collaboratorId);
    } else if (currentUser && currentUser.idCollaborator) {
        collaboratorId = currentUser.idCollaborator;
        console.log('✅ Usando collaboratorId do usuário logado:', collaboratorId);
    } else {
        console.log('🔍 Buscando ID do colaborador pelo nome:', currentUser.nome);
        try {
            const collaboratorsResponse = await window.authManager.fetchWithAuth(
                `${window.API_CONFIG.BASE_URL}/collaborators`
            );
            if (collaboratorsResponse.ok) {
                const collaborators = await collaboratorsResponse.json();
                const collaborator = collaborators.find(c => c.name === currentUser.nome);
                if (collaborator) {
                    collaboratorId = collaborator.idCollaborator;
                    console.log('✅ ID do colaborador encontrado:', collaboratorId);
                } else {
                    console.warn('⚠️ Colaborador não encontrado na lista:', currentUser.nome);
                }
            }
        } catch (error) {
            console.error('❌ Erro ao buscar colaboradores:', error);
        }
    }

    // Usar ID se disponível, senão usar nome
    const commentData = collaboratorId ? {
        content: newContent,
        idTask: taskId,
        idCollaborator: collaboratorId
    } : {
        content: newContent,
        idTask: taskId,
        collaboratorName: currentUser.nome
    };

    console.log('📡 Enviando dados da edição:', JSON.stringify(commentData, null, 2));

    try {
        const response = await window.authManager.fetchWithAuth(
            `${window.API_CONFIG.BASE_URL}/comments/${commentId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(commentData)
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Resposta de erro do servidor:', errorText);
            if (response.status === 403) throw new Error('Você não tem permissão para editar este comentário.');
            throw new Error(`Erro ao salvar o comentário: ${response.status} - ${errorText}`);
        }
        await carregarComentarios(taskId);
    } catch (error) {
        console.error('❌ Erro ao salvar edição:', error);
        Swal.fire('Erro', error.message, 'error');
        await carregarComentarios(taskId);
    }

}

async function cancelarEdicaoComentario(commentId, taskId) {
    await carregarComentarios(taskId);
}

// =================================================================
//                 EVENT LISTENERS
// =================================================================

function configurarEventListeners() {
    console.log("🔧 Configurando event listeners...");
    
    // Primeiro, verificar e limpar event listeners duplicados
    verificarEventListenersDuplicados();
    
    // Botões de fechar modais
    const closeTaskModalBtn = document.getElementById('closeTaskModalBtn');
    const closeCardModalBtn = document.getElementById('closeCardModalBtn');
    
    if (closeTaskModalBtn) closeTaskModalBtn.addEventListener('click', fecharModalTarefa);
    if (closeCardModalBtn) closeCardModalBtn.addEventListener('click', fecharModalFases);
    
    // Formulário de nova fase
    const formNovaFase = document.getElementById('formNovaFase');
    if (formNovaFase) {
        formNovaFase.addEventListener('submit', salvarFase);
    }
    
    // Fechar modais clicando fora
    window.addEventListener('click', (event) => {
        const taskModal = document.getElementById('taskModal');
        const cardModal = document.getElementById('cardModal');
        const popupDetalhes = document.getElementById('popupDetalhes');
        
        if (event.target === taskModal) {
            fecharModalTarefa();
        }
        if (event.target === cardModal) {
            fecharModalFases();
        }
        if (event.target === popupDetalhes) {
            fecharDetalhesTarefa();
        }
    });
    
    // Drag and drop para kanban e lixeira
    configurarDragAndDropLixeira();
    
    // Botão de editar tarefa no popup de detalhes
    const btnEditarTarefa = document.getElementById('btnEditarTarefa');
    if (btnEditarTarefa) {
        const novoBtn = btnEditarTarefa.cloneNode(true);
        btnEditarTarefa.parentNode.replaceChild(novoBtn, btnEditarTarefa);
        novoBtn.addEventListener('click', abrirEdicaoTarefa);
    }
    
    console.log("✅ Event listeners configurados");
}

function configurarDragAndDropLixeira() {
    const trashBin = document.getElementById('trashBin');
    if (!trashBin) return;
    trashBin.addEventListener('dragover', (e) => {
        e.preventDefault();
        trashBin.classList.add('drag-over');
    });
    trashBin.addEventListener('dragleave', (e) => {
        if (!trashBin.contains(e.relatedTarget)) trashBin.classList.remove('drag-over');
    });
    trashBin.addEventListener('drop', async (e) => {
        e.preventDefault();
        trashBin.classList.remove('drag-over');
        const dataType = e.dataTransfer.getData('text/plain');
        const jsonData = e.dataTransfer.getData('application/json');
        if (dataType && jsonData) {
            const data = JSON.parse(jsonData);
            if (dataType.startsWith('phase-')) {
                const result = await Swal.fire({
                    title: 'Desvincular Fase?',
                    text: `Deseja realmente desvincular a fase "${data.name}" do quadro?`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#d33',
                    cancelButtonColor: '#3085d6',
                    confirmButtonText: 'Sim, desvincular!',
                    cancelButtonText: 'Cancelar'
                });
                if (result.isConfirmed) await removerFaseDoQuadro(data.idPhase);
            } else {
                const result = await Swal.fire({
                    title: 'Excluir Tarefa?',
                    text: `Deseja realmente excluir a tarefa "${data.title}"?`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#d33',
                    cancelButtonColor: '#3085d6',
                    confirmButtonText: 'Sim, excluir!',
                    cancelButtonText: 'Cancelar'
                });
                if (result.isConfirmed) await excluirTarefaPorId(data.idTask);
            }
        }
    });
}

// =================================================================
//                 FUNÇÕES AUXILIARES
// =================================================================

function fecharModalTarefa() {
    console.log("🔒 Fechando modal de tarefa...");
    const modal = document.getElementById('taskModal');
    if (modal) {
        modal.classList.remove('show');
        
        // Limpar formulário
        const form = document.getElementById('tarefaForm');
        if (form) {
            form.reset();
            console.log("✅ Formulário limpo");
        }
        
        // Resetar modo de edição
        isEditingMode = false;
        currentTarefa = null;
        
        // Resetar flag de submissão
        isSubmitting = false;
        
        console.log("✅ Modal fechado com sucesso");
    } else {
        console.warn("⚠️ Modal não encontrado");
    }
}

function fecharModalFases() {
    console.log("🔒 Fechando modal de fases...");
    const modal = document.getElementById('cardModal');
    if (modal) {
        modal.classList.remove('show'); // Usa a classe CSS para esconder o modal
    }
}

function fecharDetalhesTarefa() {
    console.log("🔒 Fechando modal de detalhes...");
    const modal = document.getElementById('popupDetalhes');
    if (modal) {
        modal.classList.remove('show');
    }
}

function mostrarMensagemErro(mensagem) {
    console.error("❌ Erro:", mensagem);
    Swal.fire('Erro', mensagem, 'error');
}

async function abrirEdicaoTarefa() {
    console.log("✏️ Abrindo edição de tarefa...");
    console.log("🔍 isEditingMode antes:", isEditingMode);
    
    // Fecha o popup de detalhes
    fecharDetalhesTarefa();

    // Preenche o modal de edição com os dados da tarefa atual
    if (!currentTarefa) {
        Swal.fire('Erro', 'Nenhuma tarefa selecionada para edição.', 'error');
        return;
    }

    try {
        // Definir modo de edição
        isEditingMode = true;
        console.log("🔍 isEditingMode após definir:", isEditingMode);
        
        // Carregar dados para os selects primeiro
        await carregarDadosParaFormularioTarefa();

        // Preencher campos do formulário após carregar os dados
        document.getElementById('tituloTarefa').value = currentTarefa.title || '';
        document.getElementById('descricao').value = currentTarefa.description || '';
        document.getElementById('prioridade').value = currentTarefa.priority || '';
        document.getElementById('dataEntrega').value = currentTarefa.dueDate ? new Date(currentTarefa.dueDate).toISOString().split('T')[0] : '';
        document.getElementById('fase').value = currentTarefa.phaseId || '';
        document.getElementById('cliente').value = currentTarefa.clientId || '';
        document.getElementById('colaborador').value = currentTarefa.collaboratorId || '';

        // Atualiza o título do modal
        const titleElement = document.getElementById('taskModalTitle');
        if (titleElement) {
            titleElement.textContent = 'Editar Tarefa';
        }

        // Exibe o modal de edição
        const modal = document.getElementById('taskModal');
        if (modal) {
            modal.classList.add('show');
        }

        // Configura validação em tempo real
        configurarValidacaoTempoReal();

        console.log("✅ Modal de edição aberto com sucesso");
        console.log("🔍 isEditingMode final:", isEditingMode);
    } catch (error) {
        console.error("❌ Erro ao abrir modal de edição:", error);
        Swal.fire('Erro', 'Não foi possível carregar os dados para edição: ' + error.message, 'error');
    }
}

async function excluirTarefaPorId(taskId) {
    try {
        console.log(`🗑️ Excluindo tarefa ${taskId}...`);
        
        const response = await window.authManager.fetchWithAuth(
            `${window.API_CONFIG.BASE_URL}/tasks/${taskId}`,
            { method: 'DELETE' }
        );
        
        if (!response.ok) {
            if (response.status === 403) {
                throw new Error('Você não tem permissão para excluir esta tarefa. Apenas usuários SUPERIOR podem excluir tarefas.');
            } else if (response.status === 404) {
                throw new Error('Tarefa não encontrada. Pode ter sido excluída por outro usuário.');
            } else {
                throw new Error(`Erro ao excluir tarefa: ${response.status}`);
            }
        }
        
        console.log("✅ Tarefa excluída com sucesso");
        await carregarTarefasDoQuadro();
        Swal.fire('Sucesso!', 'Tarefa excluída com sucesso!', 'success');
        
    } catch (error) {
        console.error("❌ Erro ao excluir tarefa:", error);
        // Exibe a mensagem de erro específica que vem da verificação de status
        Swal.fire('Erro', error.message, 'error');
    }
}

// =================================================================
//                 FUNÇÕES DE VERIFICAÇÃO
// =================================================================

// Função para verificar se há event listeners duplicados
function verificarEventListenersDuplicados() {
    // Função para verificar e limpar listeners de eventos duplicados
    console.log("🔍 Verificando event listeners duplicados...");

    // Redefinir formulário de tarefa
    const formTarefa = document.getElementById('tarefaForm');
    if (formTarefa) {
        const novoForm = formTarefa.cloneNode(true);
        formTarefa.parentNode.replaceChild(novoForm, formTarefa);
        novoForm.addEventListener('submit', salvarTarefa);
        console.log("✅ Event listener do formulário de tarefa redefinido");
    }

    // Redefinir botão "Nova Tarefa"
    const btnNovaTarefa = document.getElementById('newTaskBtn');
    if (btnNovaTarefa) {
        const novoBtn = btnNovaTarefa.cloneNode(true);
        btnNovaTarefa.parentNode.replaceChild(novoBtn, btnNovaTarefa);
        novoBtn.addEventListener('click', abrirModalNovaTarefa);
        console.log("✅ Event listener do botão Nova Tarefa redefinido");
    }

    // Redefinir botão "Novo Card" (Fases)
    const btnNovoCard = document.getElementById('newCardBtn');
    if (btnNovoCard) {
        const novoBtn = btnNovoCard.cloneNode(true);
        btnNovoCard.parentNode.replaceChild(novoBtn, btnNovoCard);
        novoBtn.addEventListener('click', abrirModalFases);
        console.log("✅ Event listener do botão Novo Card redefinido");
    }
}

// =================================================================
//                 MOVIMENTAÇÃO DE TAREFAS
// =================================================================

async function moverTarefaParaFase(taskId, novaFaseId) {
    try {
        console.log(`🔄 Movendo tarefa ${taskId} para fase ${novaFaseId}`);
        
        const response = await window.authManager.fetchWithAuth(
            `${window.API_CONFIG.BASE_URL}/tasks/${taskId}/move`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(novaFaseId)
            }
        );
        
        if (!response.ok) {
            throw new Error(`Erro ao mover tarefa: ${response.status}`);
        }
        
        console.log("✅ Tarefa movida com sucesso");
        
        // Recarregar tarefas para atualizar a interface
        await carregarTarefasDoQuadro();
        
    } catch (error) {
        console.error("❌ Erro ao mover tarefa:", error);
        Swal.fire('Erro', 'Não foi possível mover a tarefa', 'error');
    }
}

// Função para validar formulário em tempo real
function validarFormularioTarefa() {
    const titulo = document.getElementById('tituloTarefa').value.trim();
    const prioridade = document.getElementById('prioridade').value;
    const dataEntrega = document.getElementById('dataEntrega').value;
    const fase = document.getElementById('fase').value;
    const cliente = document.getElementById('cliente').value;
    const colaborador = document.getElementById('colaborador').value;
    
    const submitBtn = document.querySelector('#tarefaForm button[type="submit"]');
    
    const camposValidos = titulo && prioridade && dataEntrega && fase && cliente && colaborador;
    
    if (submitBtn) {
        submitBtn.disabled = !camposValidos;
        submitBtn.style.opacity = camposValidos ? '1' : '0.6';
        submitBtn.style.cursor = camposValidos ? 'pointer' : 'not-allowed';
    }
    
    return camposValidos;
}

// Função para configurar validação em tempo real
function configurarValidacaoTempoReal() {
    const campos = ['tituloTarefa', 'prioridade', 'dataEntrega', 'fase', 'cliente', 'colaborador'];
    
    campos.forEach(campoId => {
        const campo = document.getElementById(campoId);
        if (campo) {
            campo.addEventListener('input', validarFormularioTarefa);
            campo.addEventListener('change', validarFormularioTarefa);
        }
    });
    
    // Validar inicialmente
    validarFormularioTarefa();
}

// Função para testar conectividade com o backend
async function testarBackend() {
    try {
        console.log("🔍 Testando conectividade com o backend...");
        console.log("🔍 URL base:", window.API_CONFIG.BASE_URL);
        
        // Teste 1: Verificar se o backend está online (usar endpoint que sabemos que existe)
        try {
            const healthResponse = await fetch(`${window.API_CONFIG.BASE_URL}/health`);
            console.log("📡 Health check:", healthResponse.status, healthResponse.statusText);
        } catch (error) {
            console.log("📡 Health check falhou (endpoint pode não existir):", error.message);
        }
        
        // Teste 2: Verificar token
        const token = window.authManager.getToken();
        console.log("🔑 Token disponível:", !!token);
        if (token) {
            console.log("🔑 Token (primeiros 50 chars):", token.substring(0, 50) + "...");
        }
        
        // Teste 3: Verificar se o token está expirado
        const isExpired = window.authManager.isTokenExpired();
        console.log("⏰ Token expirado:", isExpired);
        
        // Teste 4: Verificar se o usuário está autenticado
        const isAuthenticated = window.authManager.isAuthenticated();
        console.log("🔐 Usuário autenticado:", isAuthenticated);
        
        // Teste 5: Verificar se é usuário superior
        const isSuperior = window.authManager.isSuperiorUser();
        console.log("👑 Usuário superior:", isSuperior);
        
        // Teste 6: Testar endpoint de clientes sem autenticação
        try {
            const clientsResponseNoAuth = await fetch(`${window.API_CONFIG.BASE_URL}/clients`);
            console.log("📡 Clientes sem auth:", clientsResponseNoAuth.status, clientsResponseNoAuth.statusText);
            
            if (clientsResponseNoAuth.ok) {
                const clients = await clientsResponseNoAuth.json();
                console.log("📋 Clientes sem auth retornados:", clients.length);
            }
        } catch (error) {
            console.error("❌ Erro ao testar clientes sem auth:", error);
        }
        
        // Teste 7: Testar endpoint de colaboradores sem autenticação
        try {
            const collaboratorsResponseNoAuth = await fetch(`${window.API_CONFIG.BASE_URL}/collaborators`);
            console.log("📡 Colaboradores sem auth:", collaboratorsResponseNoAuth.status, collaboratorsResponseNoAuth.statusText);
            
            if (collaboratorsResponseNoAuth.ok) {
                const collaborators = await collaboratorsResponseNoAuth.json();
                console.log("📋 Colaboradores sem auth retornados:", collaborators.length);
            }
        } catch (error) {
            console.error("❌ Erro ao testar colaboradores sem auth:", error);
        }
        
        // Teste 8: Testar com autenticação
        try {
            const clientsResponseAuth = await window.authManager.fetchWithAuth(`${window.API_CONFIG.BASE_URL}/clients`);
            console.log("📡 Clientes com auth:", clientsResponseAuth.status, clientsResponseAuth.statusText);
            
            if (clientsResponseAuth.ok) {
                const clients = await clientsResponseAuth.json();
                console.log("📋 Clientes com auth retornados:", clients.length);
                if (clients.length > 0) {
                    console.log("📋 Primeiro cliente:", clients[0]);
                }
            } else {
                const errorText = await clientsResponseAuth.text();
                console.error("❌ Erro na resposta de clientes:", errorText);
            }
        } catch (error) {
            console.error("❌ Erro ao testar clientes com auth:", error);
        }
        
        // Teste 9: Testar colaboradores com autenticação
        try {
            const collaboratorsResponseAuth = await window.authManager.fetchWithAuth(`${window.API_CONFIG.BASE_URL}/collaborators`);
            console.log("📡 Colaboradores com auth:", collaboratorsResponseAuth.status, collaboratorsResponseAuth.statusText);
            
            if (collaboratorsResponseAuth.ok) {
                const collaborators = await collaboratorsResponseAuth.json();
                console.log("📋 Colaboradores com auth retornados:", collaborators.length);
                if (collaborators.length > 0) {
                    console.log("📋 Primeiro colaborador:", collaborators[0]);
                }
            } else {
                const errorText = await collaboratorsResponseAuth.text();
                console.error("❌ Erro na resposta de colaboradores:", errorText);
            }
        } catch (error) {
            console.error("❌ Erro ao testar colaboradores com auth:", error);
        }
        
    } catch (error) {
        console.error("❌ Erro no teste do backend:", error);
    }
}