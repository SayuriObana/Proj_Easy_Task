// Variáveis globais
let boards = [];
let currentBoardId = null;

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
    carregarBoards();
});

// Funções de manipulação de boards
async function carregarBoards() {
    try {
        const response = await fetchComToken('http://localhost:8080/boards');
        if (!response.ok) throw new Error('Erro ao carregar boards');
        
        boards = await response.json();
        renderizarBoards();
    } catch (error) {
        console.error('Erro ao carregar boards:', error);
        mostrarNotificacao('Erro ao carregar boards', 'error');
    }
}

function renderizarBoards() {
    const boardsGrid = document.querySelector('.boards-grid');
    if (!boardsGrid) return;

    boardsGrid.innerHTML = boards.map(board => `
        <div class="board-card" onclick="abrirBoard(${board.id})">
            <div class="board-card-header">
                <h3 class="board-card-title">${board.name}</h3>
                <p class="board-card-description">${board.description || 'Sem descrição'}</p>
            </div>
            <div class="board-card-body">
                <div class="board-card-stats">
                    <div class="board-stat">
                        <i class="fas fa-columns"></i>
                        <span>${board.phases?.length || 0} fases</span>
                    </div>
                    <div class="board-stat">
                        <i class="fas fa-tasks"></i>
                        <span>${board.tasks?.length || 0} tarefas</span>
                    </div>
                    <div class="board-stat">
                        <i class="fas fa-users"></i>
                        <span>${board.collaborators?.length || 0} colaboradores</span>
                    </div>
                </div>
            </div>
            <div class="board-card-actions">
                <button class="board-action-btn" onclick="editarBoard(event, ${board.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="board-action-btn" onclick="excluirBoard(event, ${board.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// Funções de modal
function criarNovoBoard() {
    currentBoardId = null;
    document.getElementById('boardModalTitle').textContent = 'Novo Board';
    document.getElementById('boardForm').reset();
    document.getElementById('boardModal').style.display = 'block';
}

function editarBoard(event, boardId) {
    event.stopPropagation();
    currentBoardId = boardId;
    const board = boards.find(b => b.id === boardId);
    if (!board) return;

    document.getElementById('boardModalTitle').textContent = 'Editar Board';
    document.getElementById('boardName').value = board.name;
    document.getElementById('boardDescription').value = board.description || '';
    document.getElementById('boardModal').style.display = 'block';
}

function fecharModalBoard() {
    document.getElementById('boardModal').style.display = 'none';
    currentBoardId = null;
}

// Funções de manipulação de dados
async function salvarBoard(event) {
    event.preventDefault();
    
    const formData = {
        name: document.getElementById('boardName').value,
        description: document.getElementById('boardDescription').value
    };

    try {
        const url = currentBoardId ? `http://localhost:8080/boards/${currentBoardId}` : 'http://localhost:8080/boards';
        const method = currentBoardId ? 'PUT' : 'POST';
        
        const response = await fetchComToken(url, {
            method: method,
            body: JSON.stringify(formData)
        });

        if (!response.ok) throw new Error('Erro ao salvar board');
        
        await carregarBoards();
        fecharModalBoard();
        mostrarNotificacao('Board salvo com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao salvar board:', error);
        mostrarNotificacao('Erro ao salvar board', 'error');
    }
}

async function excluirBoard(event, boardId) {
    event.stopPropagation();
    
    // Verificar se o usuário tem permissão de SUPERIOR
    const isUsuarioSuperior = localStorage.getItem('isUsuarioSuperior') === 'true';
    if (!isUsuarioSuperior) {
        Swal.fire({
            title: "Acesso Negado",
            text: "Você não tem permissão para excluir boards. Apenas usuários com nível SUPERIOR podem realizar esta ação.",
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
        const response = await fetchComToken(`http://localhost:8080/boards/${boardId}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Erro ao excluir board');
        
        await carregarBoards();
        mostrarNotificacao('Board excluído com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao excluir board:', error);
        mostrarNotificacao('Erro ao excluir board', 'error');
    }
}

// Funções de navegação
function abrirBoard(boardId) {
    window.location.href = `boardScreen.html?id=${boardId}`;
}

// Funções de utilidade
function mostrarNotificacao(mensagem, tipo) {
    Swal.fire({
        text: mensagem,
        icon: tipo,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
    });
} 