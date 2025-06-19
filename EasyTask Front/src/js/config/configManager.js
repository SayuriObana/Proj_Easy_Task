// Gerenciador de Configuração Centralizado do EasyTask
window.ConfigManager = {
    // Configurações padrão
    defaultConfig: {
        API: {
            BASE_URL: 'http://localhost:8080',
            TIMEOUT: 10000,
            RETRY_ATTEMPTS: 3,
            ENDPOINTS: {
                HEALTH_CHECK: '/health',
                LOGIN: '/collaborators/login',
                REFRESH_TOKEN: '/auth/refresh',
                BOARDS: '/boards',
                TASKS: '/tasks',
                PHASES: '/phases',
                COLLABORATORS: '/collaborators',
                CLIENTS: '/clients',
                COMMENTS: '/comments'
            }
        },
        AUTH: {
            TOKEN_KEY: 'accessToken',
            REFRESH_TOKEN_KEY: 'refreshToken',
            TOKEN_EXPIRY_KEY: 'token_expiry',
            AUTO_REFRESH: true,
            REFRESH_THRESHOLD: 300
        },
        THEME: {
            DEFAULT: 'dark',
            STORAGE_KEY: 'theme',
            AUTO_SYNC: true
        },
        DEBUG: {
            ENABLED: true,
            LOG_LEVEL: 'info',
            SHOW_API_CALLS: true,
            SHOW_AUTH_STATUS: true
        },
        NAVIGATION: {
            LOGIN_PAGE: 'pages/login/loginSystem.html',
            MAIN_MENU: 'pages/globalMenu/mainMenu.html',
            DEFAULT_REDIRECT: 'pages/globalMenu/mainMenu.html'
        },
        NOTIFICATIONS: {
            AUTO_HIDE: true,
            HIDE_DELAY: 5000,
            POSITION: 'top-right'
        },
        VALIDATION: {
            EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            PASSWORD_MIN_LENGTH: 6,
            NAME_MIN_LENGTH: 2
        }
    },

    // Configuração atual
    currentConfig: null,

    // Inicializar configuração
    initialize: function() {
        try {
            console.log('🔧 Inicializando ConfigManager...');
            
            // Carregar configuração do localStorage se existir
            const savedConfig = StorageUtils ? 
                StorageUtils.getLocalJSON('easytask_config') : 
                null;
            
            // Mesclar com configuração padrão
            this.currentConfig = this.mergeConfig(this.defaultConfig, savedConfig || {});
            
            // Validar configuração
            this.validateConfig();
            
            // Aplicar configuração
            this.applyConfig();
            
            console.log('✅ ConfigManager inicializado');
            return true;
        } catch (error) {
            console.error('❌ Erro ao inicializar ConfigManager:', error);
            return false;
        }
    },

    // Mesclar configurações
    mergeConfig: function(defaultConfig, userConfig) {
        const merged = JSON.parse(JSON.stringify(defaultConfig));
        
        function mergeDeep(target, source) {
            for (const key in source) {
                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    if (!target[key]) target[key] = {};
                    mergeDeep(target[key], source[key]);
                } else {
                    target[key] = source[key];
                }
            }
        }
        
        mergeDeep(merged, userConfig);
        return merged;
    },

    // Validar configuração
    validateConfig: function() {
        const config = this.currentConfig;
        
        // Validar API
        if (!config.API.BASE_URL) {
            throw new Error('API BASE_URL não configurada');
        }
        
        if (!config.API.TIMEOUT || config.API.TIMEOUT < 1000) {
            config.API.TIMEOUT = 10000;
        }
        
        // Validar AUTH
        if (!config.AUTH.TOKEN_KEY) {
            config.AUTH.TOKEN_KEY = 'accessToken';
        }
        
        // Validar THEME
        if (!config.THEME.DEFAULT) {
            config.THEME.DEFAULT = 'dark';
        }
        
        console.log('✅ Configuração validada');
    },

    // Aplicar configuração
    applyConfig: function() {
        const config = this.currentConfig;
        
        // Aplicar configuração da API
        if (window.API_CONFIG) {
            window.API_CONFIG.BASE_URL = config.API.BASE_URL;
            window.API_CONFIG.TIMEOUT = config.API.TIMEOUT;
        }
        
        // Aplicar configuração de tema
        if (config.THEME.AUTO_SYNC) {
            const currentTheme = StorageUtils ? 
                StorageUtils.getLocalItem(config.THEME.STORAGE_KEY) : 
                localStorage.getItem(config.THEME.STORAGE_KEY);
            
            if (currentTheme) {
                document.body.setAttribute('data-theme', currentTheme);
            } else {
                document.body.setAttribute('data-theme', config.THEME.DEFAULT);
            }
        }
        
        console.log('✅ Configuração aplicada');
    },

    // Obter valor de configuração
    get: function(path, defaultValue = null) {
        try {
            const keys = path.split('.');
            let value = this.currentConfig;
            
            for (const key of keys) {
                if (value && typeof value === 'object' && key in value) {
                    value = value[key];
                } else {
                    return defaultValue;
                }
            }
            
            return value;
        } catch (error) {
            console.error(`Erro ao obter configuração: ${path}`, error);
            return defaultValue;
        }
    },

    // Definir valor de configuração
    set: function(path, value) {
        try {
            const keys = path.split('.');
            let current = this.currentConfig;
            
            // Navegar até o penúltimo nível
            for (let i = 0; i < keys.length - 1; i++) {
                const key = keys[i];
                if (!current[key] || typeof current[key] !== 'object') {
                    current[key] = {};
                }
                current = current[key];
            }
            
            // Definir o valor
            current[keys[keys.length - 1]] = value;
            
            // Salvar no localStorage
            if (StorageUtils) {
                StorageUtils.setLocalJSON('easytask_config', this.currentConfig);
            }
            
            console.log(`✅ Configuração atualizada: ${path} = ${value}`);
            return true;
        } catch (error) {
            console.error(`Erro ao definir configuração: ${path}`, error);
            return false;
        }
    },

    // Obter configuração completa
    getAll: function() {
        return JSON.parse(JSON.stringify(this.currentConfig));
    },

    // Resetar para configuração padrão
    reset: function() {
        this.currentConfig = JSON.parse(JSON.stringify(this.defaultConfig));
        this.applyConfig();
        
        if (StorageUtils) {
            StorageUtils.removeLocalItem('easytask_config');
        }
        
        console.log('✅ Configuração resetada para padrão');
    },

    // Verificar se a API está disponível
    checkApiHealth: async function() {
        try {
            const baseUrl = this.get('API.BASE_URL');
            const timeout = this.get('API.TIMEOUT', 10000);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            
            const response = await fetch(`${baseUrl}/health`, {
                method: 'GET',
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                console.log('✅ API está funcionando');
                return true;
            } else {
                console.warn(`⚠️ API retornou status ${response.status}`);
                return false;
            }
        } catch (error) {
            console.error('❌ Erro ao verificar API:', error);
            return false;
        }
    },

    // Verificar configuração do sistema
    checkSystemConfig: function() {
        const checks = {
            configManager: !!this.currentConfig,
            apiConfig: !!window.API_CONFIG,
            authManager: !!window.authManager,
            storageUtils: !!window.StorageUtils,
            domUtils: !!window.DOMUtils
        };
        
        const allPassed = Object.values(checks).every(check => check);
        
        console.log('🔍 Verificação de configuração:', checks);
        
        if (!allPassed) {
            console.error('❌ Algumas dependências não estão disponíveis');
        }
        
        return allPassed;
    },

    // Debug da configuração
    debug: function() {
        console.group('🔧 Configuração do Sistema');
        console.log('Configuração atual:', this.currentConfig);
        console.log('API disponível:', !!window.API_CONFIG);
        console.log('AuthManager disponível:', !!window.authManager);
        console.log('StorageUtils disponível:', !!window.StorageUtils);
        console.log('DOMUtils disponível:', !!window.DOMUtils);
        console.groupEnd();
    }
};

// Auto-inicialização quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    ConfigManager.initialize();
});

console.log('🔧 ConfigManager carregado'); 