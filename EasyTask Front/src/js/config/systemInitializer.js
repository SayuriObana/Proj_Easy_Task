// Inicializador Global do Sistema EasyTask
class SystemInitializer {
    constructor() {
        this.initialized = false;
        this.initializationPromise = null;
    }

    // Inicializar o sistema
    async initialize() {
        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        this.initializationPromise = this.performInitialization();
        return this.initializationPromise;
    }

    // Realizar a inicialização
    async performInitialization() {
        try {
            console.log('🚀 Iniciando sistema EasyTask...');

            // Aguardar o DependencyManager estar disponível
            await this.waitForDependencyManager();

            // Verificar se o DependencyManager está funcionando
            if (!window.dependencyManager) {
                throw new Error('DependencyManager não está disponível');
            }

            // Aguardar todas as dependências estarem prontas
            await window.dependencyManager.initialize();

            // Verificar autenticação
            await this.checkAuthentication();

            // Configurar tema
            this.setupTheme();

            // Configurar sidebar
            this.setupSidebar();

            this.initialized = true;
            console.log('✅ Sistema EasyTask inicializado com sucesso');

            // Disparar evento de inicialização
            window.dispatchEvent(new CustomEvent('easytask:initialized'));

        } catch (error) {
            console.error('❌ Erro na inicialização do sistema:', error);
            this.handleInitializationError(error);
            throw error;
        }
    }

    // Aguardar o DependencyManager estar disponível
    async waitForDependencyManager(timeout = 5000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();

            const check = () => {
                if (window.dependencyManager) {
                    resolve();
                    return;
                }

                if (Date.now() - startTime > timeout) {
                    reject(new Error('Timeout aguardando DependencyManager'));
                    return;
                }

                setTimeout(check, 100);
            };

            check();
        });
    }

    // Verificar autenticação
    async checkAuthentication() {
        if (!window.authManager) {
            throw new Error('AuthManager não está disponível');
        }

        const autenticado = await window.authManager.checkAuthAndRedirect();
        if (!autenticado) {
            throw new Error('Usuário não autenticado');
        }

        console.log('✅ Autenticação verificada');
    }

    // Configurar tema
    setupTheme() {
        try {
            const savedTheme = StorageUtils ? 
                StorageUtils.getLocalItem('theme', 'dark') : 
                localStorage.getItem('theme') || 'dark';
            document.body.classList.add(`${savedTheme}-theme`);
            console.log('✅ Tema configurado:', savedTheme);
        } catch (error) {
            console.warn('⚠️ Erro ao configurar tema:', error);
        }
    }

    // Configurar sidebar
    setupSidebar() {
        try {
            const sidebar = document.getElementById('sidebar');
            const menuToggle = document.getElementById('menuToggle');

            if (sidebar && menuToggle) {
                menuToggle.addEventListener('click', (event) => {
                    event.preventDefault();
                    sidebar.classList.toggle('open');
                });
                console.log('✅ Sidebar configurada');
            }
        } catch (error) {
            console.warn('⚠️ Erro ao configurar sidebar:', error);
        }
    }

    // Tratar erro de inicialização
    handleInitializationError(error) {
        const errorMessage = `
            <h3>Erro de Inicialização do Sistema</h3>
            <p>Não foi possível inicializar o EasyTask. Verifique:</p>
            <ul>
                <li>Se todas as dependências estão carregadas</li>
                <li>Se a API está disponível</li>
                <li>Se o usuário está autenticado</li>
                <li>Se há erros no console do navegador</li>
            </ul>
            <p><strong>Erro:</strong> ${error.message}</p>
            <div style="margin-top: 20px;">
                <button onclick="window.location.reload()" style="margin-right: 10px;">Tentar Novamente</button>
                <button onclick="window.location.href='../login/loginSystem.html'">Ir para Login</button>
            </div>
        `;

        // Criar modal de erro
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            font-family: Arial, sans-serif;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: white;
            padding: 30px;
            border-radius: 10px;
            max-width: 600px;
            text-align: left;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        `;
        content.innerHTML = errorMessage;

        modal.appendChild(content);
        document.body.appendChild(modal);
    }

    // Verificar se o sistema está inicializado
    isInitialized() {
        return this.initialized;
    }

    // Obter status da inicialização
    getStatus() {
        return {
            initialized: this.initialized,
            dependencyManager: !!window.dependencyManager,
            authManager: !!window.authManager,
            apiConfig: !!window.API_CONFIG
        };
    }
}

// Criar instância global
window.systemInitializer = new SystemInitializer();

// Função helper para aguardar inicialização
window.waitForSystemReady = function(callback) {
    if (window.systemInitializer.isInitialized()) {
        callback();
    } else {
        window.systemInitializer.initialize().then(callback).catch(console.error);
    }
};

// Auto-inicialização quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    console.log('📋 DOM carregado, iniciando sistema global...');
    window.systemInitializer.initialize().catch(console.error);
});

// Log de inicialização
console.log('🔧 SystemInitializer carregado'); 