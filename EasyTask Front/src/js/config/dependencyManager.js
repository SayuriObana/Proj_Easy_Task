// Gerenciador de Dependências do EasyTask
class DependencyManager {
    constructor() {
        this.dependencies = new Map();
        this.callbacks = [];
        this.initialized = false;
        this.initializationPromise = null;
    }

    // Registrar uma dependência
    register(name, checkFunction, required = true) {
        this.dependencies.set(name, {
            check: checkFunction,
            required: required,
            available: false
        });
    }

    // Verificar se uma dependência está disponível
    checkDependency(name) {
        const dep = this.dependencies.get(name);
        if (!dep) {
            console.warn(`Dependência '${name}' não registrada`);
            return false;
        }

        try {
            dep.available = dep.check();
            return dep.available;
        } catch (error) {
            console.error(`Erro ao verificar dependência '${name}':`, error);
            dep.available = false;
            return false;
        }
    }

    // Verificar todas as dependências
    checkAllDependencies() {
        console.log('🔍 Verificando dependências...');
        
        const results = {};
        let allRequiredAvailable = true;

        for (const [name, dep] of this.dependencies) {
            const available = this.checkDependency(name);
            results[name] = available;
            
            if (dep.required && !available) {
                allRequiredAvailable = false;
                console.error(`❌ Dependência obrigatória '${name}' não está disponível`);
            } else if (available) {
                console.log(`✅ Dependência '${name}' está disponível`);
            } else {
                console.warn(`⚠️ Dependência opcional '${name}' não está disponível`);
            }
        }

        return { results, allRequiredAvailable };
    }

    // Aguardar até que todas as dependências estejam disponíveis
    async waitForDependencies(timeout = 10000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            const check = () => {
                const { results, allRequiredAvailable } = this.checkAllDependencies();
                
                if (allRequiredAvailable) {
                    console.log('✅ Todas as dependências obrigatórias estão disponíveis');
                    resolve(results);
                    return;
                }
                
                if (Date.now() - startTime > timeout) {
                    console.error('❌ Timeout aguardando dependências');
                    reject(new Error('Timeout aguardando dependências'));
                    return;
                }
                
                // Tentar novamente em 100ms
                setTimeout(check, 100);
            };
            
            check();
        });
    }

    // Registrar callback para ser executado quando as dependências estiverem prontas
    onReady(callback) {
        if (this.initialized) {
            callback();
        } else {
            this.callbacks.push(callback);
        }
    }

    // Inicializar o sistema
    async initialize() {
        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        this.initializationPromise = this.waitForDependencies()
            .then(() => {
                this.initialized = true;
                console.log('🚀 Sistema inicializado com sucesso');
                
                // Executar todos os callbacks registrados
                this.callbacks.forEach(callback => {
                    try {
                        callback();
                    } catch (error) {
                        console.error('Erro ao executar callback de inicialização:', error);
                    }
                });
                
                this.callbacks = [];
            })
            .catch(error => {
                console.error('❌ Falha na inicialização:', error);
                this.showInitializationError(error);
                throw error;
            });

        return this.initializationPromise;
    }

    // Mostrar erro de inicialização
    showInitializationError(error) {
        const errorMessage = `
            <h3>Erro de Inicialização</h3>
            <p>Não foi possível inicializar o sistema. Verifique:</p>
            <ul>
                <li>Se todas as dependências estão carregadas</li>
                <li>Se a API está disponível</li>
                <li>Se o usuário está autenticado</li>
            </ul>
            <p><strong>Erro:</strong> ${error.message}</p>
            <button onclick="window.location.reload()">Tentar Novamente</button>
        `;

        // Criar modal de erro
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: white;
            padding: 30px;
            border-radius: 10px;
            max-width: 500px;
            text-align: center;
        `;
        content.innerHTML = errorMessage;

        modal.appendChild(content);
        document.body.appendChild(modal);
    }

    // Verificar se o sistema está inicializado
    isInitialized() {
        return this.initialized;
    }

    // Obter status das dependências
    getDependencyStatus() {
        const status = {};
        for (const [name, dep] of this.dependencies) {
            status[name] = {
                available: dep.available,
                required: dep.required
            };
        }
        return status;
    }
}

// Criar instância global
window.dependencyManager = new DependencyManager();

// Registrar dependências padrão
window.dependencyManager.register('API_CONFIG', () => {
    return typeof window.API_CONFIG !== 'undefined' && window.API_CONFIG !== null;
}, true);

window.dependencyManager.register('AuthManager', () => {
    return typeof window.authManager !== 'undefined' && window.authManager !== null;
}, true);

window.dependencyManager.register('SweetAlert2', () => {
    return typeof window.Swal !== 'undefined' && window.Swal !== null;
}, false);

window.dependencyManager.register('DOM', () => {
    return document.readyState === 'complete' || document.readyState === 'interactive';
}, true);

// Função helper para aguardar inicialização
window.waitForSystemReady = function(callback) {
    window.dependencyManager.onReady(callback);
};

// Auto-inicialização quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    console.log('📋 DOM carregado, iniciando sistema...');
    window.dependencyManager.initialize();
});

// Log de inicialização
console.log('🔧 DependencyManager carregado'); 