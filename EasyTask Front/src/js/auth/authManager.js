// AuthManager como objeto global
window.authManager = {
    TOKEN_KEY: 'accessToken',
    REFRESH_TOKEN_KEY: 'refreshToken',
    TOKEN_EXPIRY_KEY: 'token_expiry',

    // Função para obter o token
    getToken() {
        return StorageUtils ? StorageUtils.getToken() : localStorage.getItem(this.TOKEN_KEY);
    },

    // Função para obter o refresh token
    getRefreshToken() {
        return StorageUtils ? StorageUtils.getRefreshToken() : localStorage.getItem(this.REFRESH_TOKEN_KEY);
    },

    // Função para salvar os tokens
    setTokens(accessToken, refreshToken, expiresIn) {
        console.log('💾 Salvando tokens:');
        console.log('  - Access Token:', accessToken ? accessToken.substring(0, 50) + '...' : 'null');
        console.log('  - Refresh Token:', refreshToken ? refreshToken.substring(0, 50) + '...' : 'null');
        console.log('  - Expires In:', expiresIn, 'segundos');
        
        if (StorageUtils) {
            StorageUtils.setLocalItem(this.TOKEN_KEY, accessToken);
            StorageUtils.setLocalItem(this.REFRESH_TOKEN_KEY, refreshToken);
            StorageUtils.setSessionItem(this.TOKEN_KEY, accessToken);
            StorageUtils.setSessionItem(this.REFRESH_TOKEN_KEY, refreshToken);
        } else {
            localStorage.setItem(this.TOKEN_KEY, accessToken);
            localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
        }
        
        // Calcular e salvar o tempo de expiração
        const expiryTime = Date.now() + (expiresIn * 1000);
        console.log('  - Tempo de expiração calculado:', new Date(expiryTime).toLocaleString());
        
        if (StorageUtils) {
            StorageUtils.setLocalItem(this.TOKEN_EXPIRY_KEY, expiryTime.toString());
        } else {
            localStorage.setItem(this.TOKEN_EXPIRY_KEY, expiryTime.toString());
        }
        
        console.log('✅ Tokens salvos com sucesso');
    },

    // Função para limpar os tokens
    clearTokens() {
        if (StorageUtils) {
            StorageUtils.removeLocalItem(this.TOKEN_KEY);
            StorageUtils.removeLocalItem(this.REFRESH_TOKEN_KEY);
            StorageUtils.removeLocalItem(this.TOKEN_EXPIRY_KEY);
            StorageUtils.removeSessionItem(this.TOKEN_KEY);
            StorageUtils.removeSessionItem(this.REFRESH_TOKEN_KEY);
        } else {
            localStorage.removeItem(this.TOKEN_KEY);
            localStorage.removeItem(this.REFRESH_TOKEN_KEY);
            localStorage.removeItem(this.TOKEN_EXPIRY_KEY);
        }
    },

    // Função para verificar se o token está expirado
    isTokenExpired() {
        const expiryTime = StorageUtils ? 
            StorageUtils.getLocalItem(this.TOKEN_EXPIRY_KEY) : 
            localStorage.getItem(this.TOKEN_EXPIRY_KEY);
            
        console.log('🔍 Verificando expiração do token:');
        console.log('  - Tempo de expiração salvo:', expiryTime);
        console.log('  - Tempo atual:', Date.now());
        
        if (!expiryTime) {
            console.log('  - ❌ Tempo de expiração não encontrado');
            return true;
        }
        
        const isExpired = Date.now() >= parseInt(expiryTime);
        console.log('  - Token expirado:', isExpired);
        return isExpired;
    },

    // Função para renovar o token
    async refreshToken() {
        const refreshToken = this.getRefreshToken();
        if (!refreshToken) {
            throw new Error('Refresh token não disponível');
        }

        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ refreshToken })
            });

            if (!response.ok) {
                throw new Error('Falha ao renovar token');
            }

            const data = await response.json();
            this.setTokens(data.accessToken, data.refreshToken, 3600);
            return data.accessToken;
        } catch (error) {
            console.error('Erro ao renovar token:', error);
            throw error;
        }
    },

    // Função para fazer requisições autenticadas (com renovação automática)
    async fetchWithAuth(url, options = {}) {
        try {
            // Verificar se o token está expirado e tentar renovar
            if (this.isTokenExpired()) {
                console.log('Token expirado, tentando renovar...');
                try {
                    await this.refreshToken();
                    console.log('Token renovado com sucesso');
                } catch (error) {
                    console.error('Falha ao renovar token:', error);
                    throw new Error('Token expirado e não foi possível renovar');
                }
            }

            // Adicionar o token ao header
            const token = this.getToken();
            if (!token) {
                console.error('Token não disponível');
                throw new Error('Token não disponível');
            }

            // Garantir que options.headers existe
            options.headers = options.headers || {};
            
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                ...options.headers
            };

            // Fazer a requisição
            const response = await fetch(url, { ...options, headers });

            // Se receber 401, tentar renovar o token e fazer a requisição novamente
            if (response.status === 401) {
                console.log('Recebido 401, tentando renovar token...');
                try {
                    await this.refreshToken();
                    const newToken = this.getToken();
                    headers.Authorization = `Bearer ${newToken}`;
                    
                    // Fazer a requisição novamente com o novo token
                    const retryResponse = await fetch(url, { ...options, headers });
                    return retryResponse;
                } catch (refreshError) {
                    console.error('Falha ao renovar token após 401:', refreshError);
                    throw new Error('Token inválido e não foi possível renovar');
                }
            }

            // Retornar a resposta para ser tratada pela função que chama
            return response;
        } catch (error) {
            console.error('Erro na requisição autenticada:', error);
            throw error;
        }
    },

    // Função para verificar se o usuário está autenticado
    isAuthenticated() {
        const token = this.getToken();
        return !!(token && !this.isTokenExpired());
    },

    // Função para verificar autenticação e redirecionar se necessário
    async checkAuthAndRedirect(redirectToLogin = true) {
        try {
            console.log('Verificando autenticação...');
            
            // Verificar se o token existe
            const token = this.getToken();
            if (!token) {
                console.error('Token não encontrado');
                if (redirectToLogin) {
                    this.logout();
                }
                return false;
            }

            // Verificar se os dados do usuário estão disponíveis
            const usuarioLogado = StorageUtils ? 
                StorageUtils.getLocalItem("usuarioLogado") : 
                localStorage.getItem("usuarioLogado");
            if (!usuarioLogado) {
                console.error('Dados do usuário não encontrados');
                if (redirectToLogin) {
                    this.logout();
                }
                return false;
            }

            console.log('Usuário autenticado com sucesso');
            return true;
        } catch (error) {
            console.error('Erro ao verificar autenticação:', error);
            if (redirectToLogin) {
                this.logout();
            }
            return false;
        }
    },

    // Função para fazer logout completo
    async logout() {
        try {
            console.log('Iniciando logout...');
            
            // Tentar fazer logout no servidor (se possível)
            const token = this.getToken();
            if (token) {
                try {
                    await fetch(`${API_CONFIG.BASE_URL}/auth/logout`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });
                } catch (error) {
                    console.warn('Erro ao fazer logout no servidor:', error);
                }
            }
            
            // Limpar todos os dados locais usando StorageUtils se disponível
            if (StorageUtils) {
                StorageUtils.clearAuthData();
            } else {
                // Fallback para limpeza manual
                this.clearTokens();
                localStorage.removeItem('usuarioLogado');
                localStorage.removeItem('usuarioEmail');
                localStorage.removeItem('isUsuarioSuperior');
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('auth_token');
                localStorage.removeItem('refresh_token');
                sessionStorage.clear();
            }
            
            // Limpar cookies (se houver)
            document.cookie.split(";").forEach(function(c) { 
                document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
            });
            
            console.log('Logout concluído, redirecionando...');
            
            // Redirecionar para login
            window.location.href = '../../pages/login/loginSystem.html';
        } catch (error) {
            console.error('Erro durante logout:', error);
            // Mesmo com erro, limpar dados locais e redirecionar
            if (StorageUtils) {
                StorageUtils.clearAll();
            } else {
                this.clearTokens();
                localStorage.clear();
                sessionStorage.clear();
            }
            window.location.href = '../../pages/login/loginSystem.html';
        }
    },

    // Função para verificar se o usuário tem permissões superiores
    isSuperiorUser() {
        if (StorageUtils) {
            return StorageUtils.isSuperiorUser();
        }
        return localStorage.getItem('isUsuarioSuperior') === 'true';
    },

    // Função para obter dados do usuário logado
    getCurrentUser() {
        if (StorageUtils) {
            return StorageUtils.getCurrentUser();
        }
        return {
            idCollaborator: localStorage.getItem('idCollaborator'),
            nome: localStorage.getItem('usuarioLogado'),
            email: localStorage.getItem('usuarioEmail'),
            isSuperior: this.isSuperiorUser()
        };
    }
};

// Exportar para compatibilidade com módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.authManager;
} 