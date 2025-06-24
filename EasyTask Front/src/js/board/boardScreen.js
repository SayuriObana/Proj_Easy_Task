// Variáveis globais
let board = null;
let columns = [];
let tasks = [];
let currentColumnId = null;
let currentTaskId = null;
let draggedTask = null;
let draggedPhase = null;

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

// Funções de inicialização
document.addEventListener('DOMContentLoaded', function() {
    carregarBoard();
    inicializarDragAndDrop();
});

// Funções de carregamento de dados
async function carregarBoard() {
    try {
        const boardId = new URLSearchParams(window.location.search).get('id');
        if (!boardId) {
            throw new Error('ID do board não encontrado na URL');
        }
        
        const response = await fetchComToken(`http://localhost:8080/boards/${boardId}`);
        if (!response.ok) throw new Error('Erro ao carregar board');
        
        board = await response.json();
        atualizarHeaderBoard();
        await carregarTarefas();
    } catch (error) {
        console.error('Erro ao carregar board:', error);
        mostrarNotificacao('Erro ao carregar board', 'error');
    }
}

async function carregarTarefas() {
    try {
        const boardId = new URLSearchParams(window.location.search).get('id');
        if (!boardId) {
            throw new Error('ID do board não encontrado na URL');
        }
        
        const response = await fetchComToken(`http://localhost:8080/tasks/boards/${boardId}`);
        if (!response.ok) throw new Error('Erro ao carregar tarefas');
        
        tasks = await response.json();
        console.log("Tarefas carregadas do backend:", tasks);
        await carregarFases();
        renderizarColunas();
    } catch (error) {
        console.error('Erro ao carregar tarefas:', error);
        mostrarNotificacao('Erro ao carregar tarefas', 'error');
    }
}

async function carregarFases() {
    try {
        const boardId = new URLSearchParams(window.location.search).get('id');
        if (!boardId) {
            throw new Error('ID do board não encontrado na URL');
        }
        
        // Carregar apenas as fases do quadro específico
        const response = await fetchComToken(`http://localhost:8080/phases/board/${boardId}`);
        if (!response.ok) throw new Error('Erro ao carregar fases do quadro');
        
        columns = await response.json();
        console.log(`✅ Fases carregadas para o quadro ${boardId}:`, columns);
    } catch (error) {
        console.error('Erro ao carregar fases:', error);
        mostrarNotificacao('Erro ao carregar fases do quadro', 'error');
    }
}

// Funções de renderização
function atualizarHeaderBoard() {
    document.getElementById('boardTitle').textContent = board.name;
    document.getElementById('boardDescription').textContent = board.description || '';
}

function renderizarColunas() {
    const container = document.getElementById('columnsContainer');
    if (!container) return;

    container.innerHTML = columns.map(fase => `
        <div class="column" data-column-id="${fase.idPhase}" draggable="true" data-phase-id="${fase.idPhase}">
            <div class="column-header">
                <h3 class="column-title">${fase.name}</h3>
                <div class="column-actions">
                    <button class="column-action-btn" onclick="editarFase(event, ${fase.idPhase})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="column-action-btn" onclick="excluirFase(event, ${fase.idPhase})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="column-content" data-column-id="${fase.idPhase}">
                ${renderizarTarefasColuna(fase.idPhase)}
            </div>
        </div>
    `).join('');
}

function renderizarTarefasColuna(phaseId) {
    console.log("Tasks globais:", tasks);
    const tarefasColuna = tasks.filter(task => task.phase && task.phase.idPhase === phaseId);
    console.log(`Tarefas para a fase ${phaseId}:`, tarefasColuna);
    return tarefasColuna.map(task => `
        <div class="task-card priority-${task.priority}" 
             data-task-id="${task.idTask}" 
             draggable="true">
            <div class="task-header">
                <h4 class="task-title">${task.title}</h4>
                <span class="task-priority priority-${task.priority}">${task.priority}</span>
            </div>
            <p class="task-description">${task.description || ''}</p>
            <div class="task-footer">
                <div class="task-due-date">
                    <i class="fas fa-calendar"></i>
                    <span>${formatarData(task.dueDate)}</span>
                </div>
                <button class="column-action-btn" onclick="editarTarefa(event, ${task.idTask})">
                    <i class="fas fa-edit"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// Funções de modal de fase
function criarNovaFase() {
    currentColumnId = null;
    document.getElementById('columnModalTitle').textContent = 'Nova Fase';
    document.getElementById('columnForm').reset();
    document.getElementById('columnModal').style.display = 'block';
}

function editarFase(event, phaseId) {
    event.stopPropagation();
    currentColumnId = phaseId;
    const fase = columns.find(f => f.idPhase === phaseId);
    if (!fase) return;

    document.getElementById('columnModalTitle').textContent = 'Editar Fase';
    document.getElementById('columnName').value = fase.name;
    document.getElementById('columnDescription').value = fase.description || '';
    document.getElementById('columnModal').style.display = 'block';
}

function fecharModalColuna() {
    document.getElementById('columnModal').style.display = 'none';
    currentColumnId = null;
}

// Funções de modal de tarefa
function criarNovaTarefa() {
    currentTaskId = null;
    document.getElementById('taskModalTitle').textContent = 'Nova Tarefa';
    document.getElementById('taskForm').reset();
    atualizarSelectFases();
    document.getElementById('taskModal').style.display = 'block';
}

function editarTarefa(event, taskId) {
    event.stopPropagation();
    currentTaskId = taskId;
    const tarefa = tasks.find(t => t.idTask === taskId);
    if (!tarefa) return;

    document.getElementById('taskModalTitle').textContent = 'Editar Tarefa';
    document.getElementById('taskTitle').value = tarefa.title;
    document.getElementById('taskDescription').value = tarefa.description || '';
    document.getElementById('taskPriority').value = tarefa.priority;
    document.getElementById('taskDueDate').value = tarefa.dueDate ? tarefa.dueDate.split('T')[0] : '';
    atualizarSelectFases(tarefa.phase.idPhase);
    document.getElementById('taskModal').style.display = 'block';
}

function fecharModalTarefa() {
    document.getElementById('taskModal').style.display = 'none';
    currentTaskId = null;
}

function atualizarSelectFases(selectedPhaseId = null) {
    const select = document.getElementById('taskColumn');
    if (!select) return;

    // Usar apenas as fases do quadro atual (columns já contém apenas as fases do quadro)
    select.innerHTML = columns.map(fase => `
        <option value="${fase.idPhase}" ${fase.idPhase === selectedPhaseId ? 'selected' : ''}>
            ${fase.name}
        </option>
    `).join('');
    
    console.log(`✅ Select de fases atualizado com ${columns.length} fases do quadro atual`);
}

// Funções de manipulação de dados
async function salvarFase(event) {
    event.preventDefault();
    
    const boardId = new URLSearchParams(window.location.search).get('id');
    if (!boardId) {
        mostrarNotificacao('ID do quadro não encontrado', 'error');
        return;
    }
    
    const formData = {
        name: document.getElementById('columnName').value,
        description: document.getElementById('columnDescription').value,
        sequence: columns.length + 1,
        boardId: parseInt(boardId) // Associar a fase ao quadro específico
    };

    try {
        const url = currentColumnId ? `http://localhost:8080/phases/${currentColumnId}` : 'http://localhost:8080/phases';
        const method = currentColumnId ? 'PUT' : 'POST';
        
        const response = await fetchComToken(url, {
            method: method,
            body: JSON.stringify(formData)
        });

        if (!response.ok) throw new Error('Erro ao salvar fase');
        
        await carregarFases();
        fecharModalColuna();
        mostrarNotificacao('Fase salva com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao salvar fase:', error);
        mostrarNotificacao('Erro ao salvar fase', 'error');
    }
}

async function excluirFase(event, phaseId) {
    event.stopPropagation();
    
    // Verificar se o usuário tem permissão de SUPERIOR
    const isUsuarioSuperior = localStorage.getItem('isUsuarioSuperior') === 'true';
    if (!isUsuarioSuperior) {
        Swal.fire({
            title: "Acesso Negado",
            text: "Você não tem permissão para excluir fases. Apenas usuários com nível SUPERIOR podem realizar esta ação.",
            icon: "warning",
            confirmButtonColor: "#3085d6"
        });
        return;
    }
    
    const result = await Swal.fire({
        title: "Tem certeza?",
        text: "Esta ação não poderá ser revertida!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Sim, excluir!",
        cancelButtonText: "Cancelar"
    });

    if (!result.isConfirmed) return;

    try {
        const response = await fetchComToken(`http://localhost:8080/phases/${phaseId}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Erro ao excluir fase');
        
        await carregarFases();
        mostrarNotificacao('Fase excluída com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao excluir fase:', error);
        mostrarNotificacao('Erro ao excluir fase', 'error');
    }
}

// Função para remover fase do quadro (usando a lixeira)
async function removerFaseDoQuadro(phaseId) {
    try {
        const boardId = new URLSearchParams(window.location.search).get('id');
        if (!boardId) {
            throw new Error('ID do quadro não encontrado');
        }

        console.log(`🗑️ Removendo fase ${phaseId} do quadro ${boardId}`);

        const response = await fetchComToken(`http://localhost:8080/boards/${boardId}/phases/${phaseId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erro ao remover fase do quadro: ${response.status} - ${errorText}`);
        }

        console.log('✅ Fase removida do quadro com sucesso');
        mostrarNotificacao('Fase removida do quadro com sucesso!', 'success');
        
        // Recarregar as fases do quadro
        await carregarFases();
        renderizarColunas();
        
    } catch (error) {
        console.error('❌ Erro ao remover fase do quadro:', error);
        mostrarNotificacao('Erro ao remover fase do quadro. Tente novamente.', 'error');
    }
}

async function salvarTarefa(event) {
    event.preventDefault();
    
    const boardId = new URLSearchParams(window.location.search).get('id');
    const formData = {
        title: document.getElementById('taskTitle').value,
        description: document.getElementById('taskDescription').value,
        priority: parseInt(document.getElementById('taskPriority').value),
        dueDate: document.getElementById('taskDueDate').value,
        boardId: parseInt(boardId),
        phaseId: parseInt(document.getElementById('taskColumn').value),
        clientId: 1, // TODO: Implementar seleção de cliente
        collaboratorId: 1 // TODO: Implementar seleção de colaborador
    };

    try {
        const url = currentTaskId ? `http://localhost:8080/tasks/${currentTaskId}` : 'http://localhost:8080/tasks';
        const method = currentTaskId ? 'PUT' : 'POST';
        
        const response = await fetchComToken(url, {
            method: method,
            body: JSON.stringify(formData)
        });

        if (!response.ok) throw new Error('Erro ao salvar tarefa');
        
        await carregarTarefas();
        fecharModalTarefa();
        if (typeof Swal !== 'undefined') {
            await Swal.fire({
                title: 'Sucesso!',
                text: 'Tarefa salva com sucesso!',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });
        } else {
            mostrarNotificacao('Tarefa salva com sucesso!', 'success');
        }
    } catch (error) {
        console.error('Erro ao salvar tarefa:', error);
        if (typeof Swal !== 'undefined') {
            Swal.fire('Erro', 'Erro ao salvar tarefa', 'error');
        } else {
            mostrarNotificacao('Erro ao salvar tarefa', 'error');
        }
    }
}

// Funções de drag and drop
function inicializarDragAndDrop() {
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('dragend', handleDragEnd);
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('drop', handleDrop);
    
    // Configurar a lixeira
    const trashZone = document.getElementById('trashZone');
    if (trashZone) {
        trashZone.addEventListener('dragover', handleTrashDragOver);
        trashZone.addEventListener('dragleave', handleTrashDragLeave);
        trashZone.addEventListener('drop', handleTrashDrop);
    }
}

function handleDragStart(event) {
    if (event.target.classList.contains('task-card')) {
        draggedTask = event.target;
        event.target.classList.add('dragging');
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', 'task');
    } else if (event.target.closest('.column')) {
        const column = event.target.closest('.column');
        draggedPhase = column;
        column.classList.add('dragging');
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', 'phase');
        event.dataTransfer.setData('phase-id', column.dataset.phaseId);
    }
}

function handleDragEnd(event) {
    if (event.target.classList.contains('task-card')) {
        event.target.classList.remove('dragging');
        draggedTask = null;
    } else if (event.target.closest('.column')) {
        const column = event.target.closest('.column');
        column.classList.remove('dragging');
        draggedPhase = null;
    }
    
    // Remover classes de drag over
    document.querySelectorAll('.column').forEach(col => {
        col.classList.remove('dragging-over');
    });
    document.querySelectorAll('.column-content').forEach(content => {
        content.classList.remove('drag-over');
    });
    const trashZone = document.getElementById('trashZone');
    if (trashZone) {
        trashZone.classList.remove('drag-over');
    }
}

function handleDragOver(event) {
    event.preventDefault();
    
    if (event.target.classList.contains('column-content')) {
        event.target.classList.add('drag-over');
    } else if (event.target.closest('.column')) {
        const column = event.target.closest('.column');
        column.classList.add('dragging-over');
    }
}

function handleTrashDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    event.target.closest('.trash-zone').classList.add('drag-over');
}

function handleTrashDragLeave(event) {
    if (!event.target.closest('.trash-zone')) {
        event.target.closest('.trash-zone').classList.remove('drag-over');
    }
}

async function handleTrashDrop(event) {
    event.preventDefault();
    const trashZone = event.target.closest('.trash-zone');
    trashZone.classList.remove('drag-over');
    
    const dataType = event.dataTransfer.getData('text/plain');
    
    if (dataType === 'phase') {
        const phaseId = event.dataTransfer.getData('phase-id');
        if (phaseId) {
            // Confirmar a remoção da fase do quadro
            const result = await Swal.fire({
                title: "Remover fase do quadro?",
                text: "Esta ação remove apenas o vínculo da fase com este quadro. A fase continuará existindo no sistema.",
                icon: "question",
                showCancelButton: true,
                confirmButtonColor: "#ff6b6b",
                cancelButtonColor: "#6c757d",
                confirmButtonText: "Sim, remover!",
                cancelButtonText: "Cancelar"
            });
            
            if (result.isConfirmed) {
                await removerFaseDoQuadro(parseInt(phaseId));
            }
        }
    }
}

async function handleDrop(event) {
    event.preventDefault();
    
    if (!draggedTask) return;
    
    const taskId = draggedTask.dataset.taskId;
    const targetColumn = event.target.closest('.column-content');
    
    if (!targetColumn) return;
    
    const newPhaseId = targetColumn.dataset.columnId;
    
    try {
        const response = await fetchComToken(`http://localhost:8080/tasks/${taskId}/move`, {
            method: 'POST',
            body: JSON.stringify(parseInt(newPhaseId))
        });

        if (!response.ok) throw new Error('Erro ao mover tarefa');
        
        await carregarTarefas();
        mostrarNotificacao('Tarefa movida com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao mover tarefa:', error);
        mostrarNotificacao('Erro ao mover tarefa', 'error');
    }
}

// Funções de utilidade
function formatarData(data) {
    if (!data) return 'Sem data';
    return new Date(data).toLocaleDateString('pt-BR');
}

function mostrarNotificacao(mensagem, tipo) {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            text: mensagem,
            icon: tipo,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000
        });
    } else {
        alert(mensagem);
    }
} 