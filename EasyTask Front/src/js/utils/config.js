// Configurações globais do frontend
const config = {
    API: {
        BASE_URL: 'http://localhost:8080',
        ENDPOINTS: {
            AUTH: {
                LOGIN: '/collaborators/login',
                REFRESH: '/collaborators/refresh-token',
                LOGOUT: '/collaborators/logout'
            },
            BOARDS: {
                BASE: '/boards',
                BY_ID: (id) => `/boards/${id}`,
                COLUMNS: (boardId) => `/boards/${boardId}/columns`,
                TASKS: (boardId) => `/boards/${boardId}/tasks`
            },
            TASKS: {
                BASE: '/tasks',
                BY_ID: (id) => `/tasks/${id}`,
                BY_COLLABORATOR: (id) => `/tasks/collaborator/${id}`
            },
            COLLABORATORS: {
                BASE: '/collaborators',
                BY_ID: (id) => `/collaborators/${id}`
            },
            CLIENTS: {
                BASE: '/clients',
                BY_ID: (id) => `/clients/${id}`
            },
            REPORTS: {
                LOGS: '/reports/logs',
                LOGS_PDF: '/reports/logs/pdf'
            }
        }
    },
    ROUTES: {
        LOGIN: '../login/loginSystem.html',
        MAIN_MENU: '../globalMenu/mainMenu.html',
        BOARDS: '../board/boardListScreen.html',
        BOARD_DETAIL: (id) => `../board/boardScreen.html?id=${id}`,
        TASKS: '../task/taskListScreen.html',
        CLIENTS: '../client/clientListScreen.html',
        COLLABORATORS: '../collaborator/collaboratorListScreen.html'
    },
    THEME: {
        COLORS: {
            PRIMARY: '#ffc107',
            DANGER: '#d33',
            SUCCESS: '#28a745',
            WARNING: '#ffc107',
            INFO: '#3085d6'
        }
    }
};

// Exportando as configurações
window.config = config; 