// Configuração da API
const API_CONFIG = {
    BASE_URL: 'http://localhost:8080',
    ENDPOINTS: {
        // Status do servidor
        HEALTH_CHECK: '/health',

        // Autenticação
        LOGIN: '/collaborators/login',
        REFRESH_TOKEN: '/auth/refresh',
        
        // Boards (Quadros)
        BOARDS: '/boards',
        BOARD_TASKS: (boardId) => `/tasks/boards/${boardId}`,
        BOARD_PHASES: (boardId) => `/boards/${boardId}/phases`,
        BOARD_COLLABORATORS: (boardId) => `/boards/${boardId}/collaborators`,
        
        // Tasks (Tarefas)
        TASKS: '/tasks',
        TASK_DETAILS: (taskId) => `/tasks/${taskId}`,
        TASK_MOVE_BOARD: (taskId, boardId) => `/tasks/${taskId}/move-board/${boardId}`,
        TASK_COMMENTS: (taskId) => `/tasks/${taskId}/comments`,
        
        // Phases (Fases)
        PHASES: '/phases',
        PHASE_DETAILS: (phaseId) => `/phases/${phaseId}`,
        
        // Collaborators (Colaboradores)
        COLLABORATORS: '/collaborators',
        COLLABORATOR_DETAILS: (collaboratorId) => `/collaborators/${collaboratorId}`,
        
        // Clients (Clientes)
        CLIENTS: '/clients',
        CLIENT_DETAILS: (clientId) => `/clients/${clientId}`,
        
        // Comments (Comentários)
        COMMENTS: '/comments',
        COMMENT_DETAILS: (commentId) => `/comments/${commentId}`
    }
};

function callAPI(url, options = {}) {
    const token = window.authManager?.getToken?.();


    const headers = {
        'Content-Type': 'application/json',
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    return fetch(window.API_CONFIG.BASE_URL + url, {
        ...options,
        headers: {
            ...headers,
            ...(options.headers || {})
        }
    });
}


// Exportar a configuração
window.API_CONFIG = API_CONFIG; 