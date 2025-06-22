// Configuração base
const API_BASE_URL = config.API.BASE_URL;

// Classe de erro personalizada para erros da API
class APIError extends Error {
    constructor(message, status, data = null) {
        super(message);
        this.name = 'APIError';
        this.status = status;
        this.data = data;
    }
}

// Função auxiliar para fazer requisições autenticadas
async function fetchWithAuth(url, options = {}) {
    const token = authUtils.getToken();
    if (!token) {
        throw new APIError('Usuário não autenticado', 401);
    }

    try {
        const defaultHeaders = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };

        const response = await fetch(`${API_BASE_URL}${url}`, {
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers
            }
        });

        // Se o token expirou, tenta renovar
        if (response.status === 401) {
            const refreshed = await authUtils.refreshToken();
            if (refreshed) {
                // Retenta a requisição com o novo token
                const newToken = authUtils.getToken();
                const newResponse = await fetch(`${API_BASE_URL}${url}`, {
                    ...options,
                    headers: {
                        ...defaultHeaders,
                        'Authorization': `Bearer ${newToken}`
                    }
                });
                
                if (!newResponse.ok) {
                    throw await handleErrorResponse(newResponse);
                }
                
                return handleSuccessResponse(newResponse, options.method);
            } else {
                // Se não conseguiu renovar o token, redireciona para login
                authUtils.logout();
                throw new APIError('Sessão expirada', 401);
            }
        }

        if (!response.ok) {
            throw await handleErrorResponse(response);
        }

        return handleSuccessResponse(response, options.method);
    } catch (error) {
        if (error instanceof APIError) {
            throw error;
        }
        console.error('❌ Erro na requisição:', error);
        throw new APIError('Erro de conexão com o servidor', 0, error.message);
    }
}

// Função para tratar respostas de erro
async function handleErrorResponse(response) {
    let errorData;
    try {
        errorData = await response.json();
    } catch {
        errorData = { message: 'Erro desconhecido' };
    }
    
    const errorMessage = errorData.message || 'Erro na requisição';
    return new APIError(errorMessage, response.status, errorData);
}

// Função para tratar respostas de sucesso
async function handleSuccessResponse(response, method) {
    if (method === 'DELETE') {
        return null;
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
        return await response.json();
    }

    return null;
}

// Interceptor global para erros não tratados
window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason;
    
    if (error instanceof APIError) {
        // Trata erros da API
        switch (error.status) {
            case 401:
                authUtils.logout();
                break;
            case 403:
                Swal.fire({
                    title: 'Acesso Negado',
                    text: 'Você não tem permissão para realizar esta ação.',
                    icon: 'error',
                    confirmButtonColor: config.THEME.COLORS.DANGER
                });
                break;
            default:
                Swal.fire({
                    title: 'Erro',
                    text: error.message,
                    icon: 'error',
                    confirmButtonColor: config.THEME.COLORS.DANGER
                });
        }
    } else {
        // Trata outros erros
        console.error('Erro não tratado:', error);
        Swal.fire({
            title: 'Erro',
            text: 'Ocorreu um erro inesperado. Por favor, tente novamente.',
            icon: 'error',
            confirmButtonColor: config.THEME.COLORS.DANGER
        });
    }
});

// Objeto com todas as operações da API
const http = {
    // Boards
    boards: {
        getAll: () => fetchWithAuth(config.API.ENDPOINTS.BOARDS.BASE),
        getById: (id) => fetchWithAuth(config.API.ENDPOINTS.BOARDS.BY_ID(id)),
        create: (data) => fetchWithAuth(config.API.ENDPOINTS.BOARDS.BASE, {
            method: 'POST',
            body: JSON.stringify(data)
        }),
        update: (id, data) => fetchWithAuth(config.API.ENDPOINTS.BOARDS.BY_ID(id), {
            method: 'PUT',
            body: JSON.stringify(data)
        }),
        delete: (id) => fetchWithAuth(config.API.ENDPOINTS.BOARDS.BY_ID(id), { 
            method: 'DELETE' 
        }),
        getColumns: (boardId) => fetchWithAuth(config.API.ENDPOINTS.BOARDS.COLUMNS(boardId)),
        getTasks: (boardId) => fetchWithAuth(config.API.ENDPOINTS.BOARDS.TASKS(boardId))
    },

    // Tasks
    tasks: {
        getAll: () => fetchWithAuth(config.API.ENDPOINTS.TASKS.BASE),
        getById: (id) => fetchWithAuth(config.API.ENDPOINTS.TASKS.BY_ID(id)),
        getByCollaborator: (id) => fetchWithAuth(config.API.ENDPOINTS.TASKS.BY_COLLABORATOR(id)),
        create: (data) => fetchWithAuth(config.API.ENDPOINTS.TASKS.BASE, {
            method: 'POST',
            body: JSON.stringify(data)
        }),
        update: (id, data) => fetchWithAuth(config.API.ENDPOINTS.TASKS.BY_ID(id), {
            method: 'PUT',
            body: JSON.stringify(data)
        }),
        delete: (id) => fetchWithAuth(config.API.ENDPOINTS.TASKS.BY_ID(id), { 
            method: 'DELETE' 
        })
    },

    // Collaborators
    collaborators: {
        getAll: () => fetchWithAuth(config.API.ENDPOINTS.COLLABORATORS.BASE),
        getById: (id) => fetchWithAuth(config.API.ENDPOINTS.COLLABORATORS.BY_ID(id)),
        create: (data) => fetchWithAuth(config.API.ENDPOINTS.COLLABORATORS.BASE, {
            method: 'POST',
            body: JSON.stringify(data)
        }),
        update: (id, data) => fetchWithAuth(config.API.ENDPOINTS.COLLABORATORS.BY_ID(id), {
            method: 'PUT',
            body: JSON.stringify(data)
        }),
        delete: (id) => fetchWithAuth(config.API.ENDPOINTS.COLLABORATORS.BY_ID(id), { 
            method: 'DELETE' 
        })
    },

    // Clients
    clients: {
        getAll: () => fetchWithAuth(config.API.ENDPOINTS.CLIENTS.BASE),
        getById: (id) => fetchWithAuth(config.API.ENDPOINTS.CLIENTS.BY_ID(id)),
        create: (data) => fetchWithAuth(config.API.ENDPOINTS.CLIENTS.BASE, {
            method: 'POST',
            body: JSON.stringify(data)
        }),
        update: (id, data) => fetchWithAuth(config.API.ENDPOINTS.CLIENTS.BY_ID(id), {
            method: 'PUT',
            body: JSON.stringify(data)
        }),
        delete: (id) => fetchWithAuth(config.API.ENDPOINTS.CLIENTS.BY_ID(id), { 
            method: 'DELETE' 
        })
    },

    // Reports
    reports: {
        getLogs: () => fetchWithAuth(config.API.ENDPOINTS.REPORTS.LOGS),
        getLogsPDF: () => fetchWithAuth(config.API.ENDPOINTS.REPORTS.LOGS_PDF)
    }
};

// Exportando as funções
window.http = http;
window.APIError = APIError; 