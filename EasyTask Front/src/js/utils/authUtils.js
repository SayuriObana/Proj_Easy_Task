// Constantes para níveis de acesso (exatamente como no backend)
const ACCESS_LEVELS = {
    BASICO: 'ROLE_BASICO',
    INTERMEDIARIO: 'ROLE_INTERMEDIARIO',
    SUPERIOR: 'ROLE_SUPERIOR'
};

// Tempo de expiração do token em milissegundos (5 minutos)
const TOKEN_EXPIRATION = 5 * 60 * 1000;

// Tempo para renovar o token antes de expirar (1 minuto)
const TOKEN_REFRESH_THRESHOLD = 1 * 60 * 1000;

const authUtils = {
    // Salvar token e informações do usuário
    setAuth: (tokens, userData) => {
        const expirationTime = Date.now() + TOKEN_EXPIRATION;
        localStorage.setItem('accessToken', tokens.accessToken);
        localStorage.setItem('refreshToken', tokens.refreshToken);
        localStorage.setItem('tokenExpiration', expirationTime.toString());
        localStorage.setItem('userData', JSON.stringify({
            email: userData.email,
            nome: userData.nome,
            position: userData.position,
            accessLevel: userData.accessLevel
        }));

        // Iniciar verificação periódica do token
        authUtils.startTokenCheck();
    },

    // Obter token
    getToken: () => {
        const token = localStorage.getItem('accessToken');
        if (!token) return null;

        // Verifica se o token está próximo de expirar
        const expirationTime = parseInt(localStorage.getItem('tokenExpiration') || '0');
        if (Date.now() + TOKEN_REFRESH_THRESHOLD > expirationTime) {
            // Tenta renovar o token em background
            authUtils.refreshToken().catch(console.error);
        }

        return token;
    },

    // Obter refresh token
    getRefreshToken: () => localStorage.getItem('refreshToken'),

    // Obter dados do usuário
    getUserData: () => {
        const userData = localStorage.getItem('userData');
        return userData ? JSON.parse(userData) : null;
    },

    // Verificar se usuário está autenticado
    isAuthenticated: () => {
        const token = localStorage.getItem('accessToken');
        const expirationTime = parseInt(localStorage.getItem('tokenExpiration') || '0');
        return !!token && Date.now() < expirationTime;
    },

    // Verificar nível de acesso
    hasAccessLevel: (requiredLevel) => {
        const userData = authUtils.getUserData();
        if (!userData) return false;

        // Verifica se o usuário tem o nível de acesso requerido
        return userData.accessLevel === requiredLevel;
    },

    // Refresh token
    refreshToken: async () => {
        try {
            const refreshToken = authUtils.getRefreshToken();
            if (!refreshToken) {
                throw new APIError('Refresh token não encontrado', 401);
            }

            const response = await fetch(`${config.API.BASE_URL}${config.API.ENDPOINTS.AUTH.REFRESH}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ refreshToken })
            });

            if (!response.ok) {
                throw new APIError('Erro ao renovar token', response.status);
            }

            const data = await response.json();
            
            // Atualiza o token e o tempo de expiração
            const expirationTime = Date.now() + TOKEN_EXPIRATION;
            localStorage.setItem('accessToken', data.accessToken);
            localStorage.setItem('tokenExpiration', expirationTime.toString());
            
            return true;
        } catch (error) {
            console.error('Erro ao fazer refresh do token:', error);
            // Se falhar ao renovar o token, faz logout
            authUtils.logout();
            return false;
        }
    },

    // Logout
    logout: async () => {
        try {
            const token = authUtils.getToken();
            if (token) {
                await fetch(`${config.API.BASE_URL}${config.API.ENDPOINTS.AUTH.LOGOUT}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
            }
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
        } finally {
            // Limpa todos os dados de autenticação
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('tokenExpiration');
            localStorage.removeItem('userData');
            
            // Para a verificação periódica do token
            authUtils.stopTokenCheck();
            
            // Redireciona para a página de login
            window.location.href = config.ROUTES.LOGIN;
        }
    },

    // Verificar permissão para acessar recurso
    checkPermission: (resource, method = 'GET') => {
        const userData = authUtils.getUserData();
        if (!userData) {
            console.log("❌ Usuário não autenticado");
            return false;
        }

        // Se for nível superior, tem acesso a tudo
        if (userData.accessLevel === ACCESS_LEVELS.SUPERIOR) {
            return true;
        }

        // Regras de permissão
        const permissions = {
            boards: {
                GET: 'authenticated',
                POST: [ACCESS_LEVELS.SUPERIOR],
                PUT: [ACCESS_LEVELS.SUPERIOR],
                DELETE: [ACCESS_LEVELS.SUPERIOR]
            },
            tasks: {
                GET: 'authenticated',
                POST: 'authenticated',
                PUT: 'authenticated',
                DELETE: [ACCESS_LEVELS.SUPERIOR]
            },
            collaborators: {
                GET: [ACCESS_LEVELS.SUPERIOR],
                POST: [ACCESS_LEVELS.SUPERIOR],
                PUT: [ACCESS_LEVELS.SUPERIOR],
                DELETE: [ACCESS_LEVELS.SUPERIOR]
            },
            clients: {
                GET: 'authenticated',
                POST: [ACCESS_LEVELS.SUPERIOR],
                PUT: [ACCESS_LEVELS.SUPERIOR],
                DELETE: [ACCESS_LEVELS.SUPERIOR]
            },
            reports: {
                GET: [ACCESS_LEVELS.SUPERIOR],
                POST: [ACCESS_LEVELS.SUPERIOR],
                PUT: [ACCESS_LEVELS.SUPERIOR],
                DELETE: [ACCESS_LEVELS.SUPERIOR]
            }
        };

        const permission = permissions[resource]?.[method];
        if (!permission) return false;

        if (permission === 'authenticated') return true;

        return permission.includes(userData.accessLevel);
    },

    // Iniciar verificação periódica do token
    startTokenCheck: () => {
        // Limpa qualquer verificação anterior
        authUtils.stopTokenCheck();
        
        // Verifica o token a cada minuto
        authUtils.tokenCheckInterval = setInterval(() => {
            const token = authUtils.getToken();
            if (!token) {
                authUtils.logout();
            }
        }, 60000);
    },

    // Parar verificação periódica do token
    stopTokenCheck: () => {
        if (authUtils.tokenCheckInterval) {
            clearInterval(authUtils.tokenCheckInterval);
            authUtils.tokenCheckInterval = null;
        }
    }
};

// Exportando as funções
window.authUtils = authUtils;
window.ACCESS_LEVELS = ACCESS_LEVELS; 