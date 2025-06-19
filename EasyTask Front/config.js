// Configuração do EasyTask Frontend
const EASYTASK_CONFIG = {
    // Configurações da API
    API: {
        BASE_URL: 'http://localhost:8080',
        TIMEOUT: 10000, // 10 segundos
        RETRY_ATTEMPTS: 3
    },

    // Configurações de autenticação
    AUTH: {
        TOKEN_KEY: 'accessToken',
        REFRESH_TOKEN_KEY: 'refreshToken',
        TOKEN_EXPIRY_KEY: 'token_expiry',
        AUTO_REFRESH: true,
        REFRESH_THRESHOLD: 300 // 5 minutos antes da expiração
    },

    // Configurações de tema
    THEME: {
        DEFAULT: 'dark',
        STORAGE_KEY: 'theme',
        AUTO_SYNC: true
    },

    // Configurações de debug
    DEBUG: {
        ENABLED: true,
        LOG_LEVEL: 'info', // 'debug', 'info', 'warn', 'error'
        SHOW_API_CALLS: true,
        SHOW_AUTH_STATUS: true
    },

    // Configurações de navegação
    NAVIGATION: {
        LOGIN_PAGE: 'pages/login/loginSystem.html',
        MAIN_MENU: 'pages/globalMenu/mainMenu.html',
        DEFAULT_REDIRECT: 'pages/globalMenu/mainMenu.html'
    },

    // Configurações de notificações
    NOTIFICATIONS: {
        AUTO_HIDE: true,
        HIDE_DELAY: 5000, // 5 segundos
        POSITION: 'top-right'
    },

    // Configurações de validação
    VALIDATION: {
        EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        PASSWORD_MIN_LENGTH: 6,
        NAME_MIN_LENGTH: 2
    }
};

// Função para debug
function debug(message, level = 'info') {
    if (EASYTASK_CONFIG.DEBUG.ENABLED) {
        const timestamp = new Date().toISOString();
        const logMessage = `[EasyTask ${timestamp}] ${message}`;
        
        switch (level) {
            case 'debug':
                console.debug(logMessage);
                break;
            case 'info':
                console.info(logMessage);
                break;
            case 'warn':
                console.warn(logMessage);
                break;
            case 'error':
                console.error(logMessage);
                break;
            default:
                console.log(logMessage);
        }
    }
}

// Função para verificar se a API está disponível
async function checkApiHealth() {
    try {
        const response = await fetch(`${EASYTASK_CONFIG.API.BASE_URL}/health`, {
            method: 'GET',
            timeout: EASYTASK_CONFIG.API.TIMEOUT
        });
        
        if (response.ok) {
            debug('API está funcionando corretamente', 'info');
            return true;
        } else {
            debug(`API retornou status ${response.status}`, 'warn');
            return false;
        }
    } catch (error) {
        debug(`Erro ao conectar com a API: ${error.message}`, 'error');
        return false;
    }
}

// Função para verificar configuração do sistema
function checkSystemConfig() {
    debug('Verificando configuração do sistema...', 'info');
    
    // Verificar se o AuthManager está disponível
    if (typeof window.authManager === 'undefined') {
        debug('AuthManager não encontrado!', 'error');
        return false;
    }
    
    // Verificar se a API está configurada
    if (typeof window.API_CONFIG === 'undefined') {
        debug('API_CONFIG não encontrado!', 'error');
        return false;
    }
    
    debug('Configuração do sistema OK', 'info');
    return true;
}

// Função para inicializar o sistema
async function initializeSystem() {
    debug('Inicializando sistema EasyTask...', 'info');
    
    // Verificar configuração
    if (!checkSystemConfig()) {
        debug('Falha na verificação de configuração', 'error');
        return false;
    }
    
    // Verificar API
    const apiHealth = await checkApiHealth();
    if (!apiHealth) {
        debug('API não está disponível', 'warn');
    }
    
    debug('Sistema inicializado com sucesso', 'info');
    return true;
}

// Exportar configurações e funções
window.EASYTASK_CONFIG = EASYTASK_CONFIG;
window.debug = debug;
window.checkApiHealth = checkApiHealth;
window.checkSystemConfig = checkSystemConfig;
window.initializeSystem = initializeSystem;

// Auto-inicialização quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    initializeSystem();
});

// Log de inicialização
debug('Configuração do EasyTask carregada', 'info'); 