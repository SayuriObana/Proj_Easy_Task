// Utilitários para gerenciamento seguro de localStorage e sessionStorage
window.StorageUtils = {
    // Verificar se o storage está disponível
    isAvailable: function(type = 'localStorage') {
        try {
            const storage = type === 'localStorage' ? window.localStorage : window.sessionStorage;
            const test = '__storage_test__';
            storage.setItem(test, test);
            storage.removeItem(test);
            return true;
        } catch (error) {
            console.warn(`Storage ${type} não está disponível:`, error);
            return false;
        }
    },

    // Obter item do localStorage com verificação de segurança
    getLocalItem: function(key, defaultValue = null) {
        try {
            if (!this.isAvailable('localStorage')) {
                console.warn(`localStorage não disponível para chave: ${key}`);
                return defaultValue;
            }

            const value = localStorage.getItem(key);
            if (value === null) {
                return defaultValue;
            }

            return value;
        } catch (error) {
            console.error(`Erro ao obter item do localStorage: ${key}`, error);
            return defaultValue;
        }
    },

    // Obter item do sessionStorage com verificação de segurança
    getSessionItem: function(key, defaultValue = null) {
        try {
            if (!this.isAvailable('sessionStorage')) {
                console.warn(`sessionStorage não disponível para chave: ${key}`);
                return defaultValue;
            }

            const value = sessionStorage.getItem(key);
            if (value === null) {
                return defaultValue;
            }

            return value;
        } catch (error) {
            console.error(`Erro ao obter item do sessionStorage: ${key}`, error);
            return defaultValue;
        }
    },

    // Definir item no localStorage com verificação de segurança
    setLocalItem: function(key, value) {
        try {
            if (!this.isAvailable('localStorage')) {
                console.warn(`localStorage não disponível para chave: ${key}`);
                return false;
            }

            localStorage.setItem(key, value);
            return true;
        } catch (error) {
            console.error(`Erro ao definir item no localStorage: ${key}`, error);
            return false;
        }
    },

    // Definir item no sessionStorage com verificação de segurança
    setSessionItem: function(key, value) {
        try {
            if (!this.isAvailable('sessionStorage')) {
                console.warn(`sessionStorage não disponível para chave: ${key}`);
                return false;
            }

            sessionStorage.setItem(key, value);
            return true;
        } catch (error) {
            console.error(`Erro ao definir item no sessionStorage: ${key}`, error);
            return false;
        }
    },

    // Remover item do localStorage com verificação de segurança
    removeLocalItem: function(key) {
        try {
            if (!this.isAvailable('localStorage')) {
                console.warn(`localStorage não disponível para remover chave: ${key}`);
                return false;
            }

            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error(`Erro ao remover item do localStorage: ${key}`, error);
            return false;
        }
    },

    // Remover item do sessionStorage com verificação de segurança
    removeSessionItem: function(key) {
        try {
            if (!this.isAvailable('sessionStorage')) {
                console.warn(`sessionStorage não disponível para remover chave: ${key}`);
                return false;
            }

            sessionStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error(`Erro ao remover item do sessionStorage: ${key}`, error);
            return false;
        }
    },

    // Obter e fazer parse de JSON do localStorage com verificação de segurança
    getLocalJSON: function(key, defaultValue = null) {
        try {
            const value = this.getLocalItem(key);
            if (value === null) return defaultValue;

            const parsed = JSON.parse(value);
            return parsed;
        } catch (error) {
            console.error(`Erro ao fazer parse de JSON do localStorage: ${key}`, error);
            return defaultValue;
        }
    },

    // Obter e fazer parse de JSON do sessionStorage com verificação de segurança
    getSessionJSON: function(key, defaultValue = null) {
        try {
            const value = this.getSessionItem(key);
            if (value === null) return defaultValue;

            const parsed = JSON.parse(value);
            return parsed;
        } catch (error) {
            console.error(`Erro ao fazer parse de JSON do sessionStorage: ${key}`, error);
            return defaultValue;
        }
    },

    // Definir JSON no localStorage com verificação de segurança
    setLocalJSON: function(key, value) {
        try {
            const jsonString = JSON.stringify(value);
            return this.setLocalItem(key, jsonString);
        } catch (error) {
            console.error(`Erro ao serializar JSON para localStorage: ${key}`, error);
            return false;
        }
    },

    // Definir JSON no sessionStorage com verificação de segurança
    setSessionJSON: function(key, value) {
        try {
            const jsonString = JSON.stringify(value);
            return this.setSessionItem(key, jsonString);
        } catch (error) {
            console.error(`Erro ao serializar JSON para sessionStorage: ${key}`, error);
            return false;
        }
    },

    // Obter token com fallback para diferentes chaves
    getToken: function() {
        // Tentar diferentes chaves de token
        const tokenKeys = ['accessToken', 'auth_token', 'token'];
        
        for (const key of tokenKeys) {
            const token = this.getLocalItem(key) || this.getSessionItem(key);
            if (token) {
                return token;
            }
        }
        
        return null;
    },

    // Obter refresh token com fallback para diferentes chaves
    getRefreshToken: function() {
        // Tentar diferentes chaves de refresh token
        const refreshTokenKeys = ['refreshToken', 'refresh_token'];
        
        for (const key of refreshTokenKeys) {
            const token = this.getLocalItem(key) || this.getSessionItem(key);
            if (token) {
                return token;
            }
        }
        
        return null;
    },

    // Verificar se o usuário está autenticado
    isAuthenticated: function() {
        const token = this.getToken();
        return token !== null && token !== undefined;
    },

    // Verificar se o usuário é superior
    isSuperiorUser: function() {
        const isSuperior = this.getLocalItem('isUsuarioSuperior');
        return isSuperior === 'true';
    },

    // Obter dados do usuário logado
    getCurrentUser: function() {
        return {
            nome: this.getLocalItem('usuarioLogado'),
            email: this.getLocalItem('usuarioEmail'),
            isSuperior: this.isSuperiorUser()
        };
    },

    // Limpar todos os dados de autenticação
    clearAuthData: function() {
        const authKeys = [
            'accessToken', 'auth_token', 'token',
            'refreshToken', 'refresh_token',
            'usuarioLogado', 'usuarioEmail', 'isUsuarioSuperior',
            'token_expiry'
        ];

        authKeys.forEach(key => {
            this.removeLocalItem(key);
            this.removeSessionItem(key);
        });

        console.log('✅ Dados de autenticação limpos');
    },

    // Limpar todos os dados (logout completo)
    clearAll: function() {
        try {
            if (this.isAvailable('localStorage')) {
                localStorage.clear();
            }
            if (this.isAvailable('sessionStorage')) {
                sessionStorage.clear();
            }
            console.log('✅ Todos os dados de storage limpos');
        } catch (error) {
            console.error('Erro ao limpar storage:', error);
        }
    },

    // Sincronizar dados entre localStorage e sessionStorage
    syncTokens: function() {
        const token = this.getToken();
        const refreshToken = this.getRefreshToken();

        if (token) {
            this.setLocalItem('accessToken', token);
            this.setSessionItem('accessToken', token);
        }

        if (refreshToken) {
            this.setLocalItem('refreshToken', refreshToken);
            this.setSessionItem('refreshToken', refreshToken);
        }
    }
};

console.log('🔧 StorageUtils carregado'); 