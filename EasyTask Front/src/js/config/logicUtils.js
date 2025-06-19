// Utilitários para gerenciamento seguro de lógica, loops e recursão
window.LogicUtils = {
    // Configurações padrão
    DEFAULT_TIMEOUT: 30000, // 30 segundos
    DEFAULT_MAX_ITERATIONS: 1000,
    DEFAULT_RETRY_DELAY: 1000, // 1 segundo

    // Contador de loops para detectar loops infinitos
    loopCounters: new Map(),

    // Verificar se um loop está em risco de ser infinito
    checkLoopSafety: function(loopId, maxIterations = this.DEFAULT_MAX_ITERATIONS) {
        const currentCount = this.loopCounters.get(loopId) || 0;
        this.loopCounters.set(loopId, currentCount + 1);

        if (currentCount > maxIterations) {
            console.error(`🚨 Loop infinito detectado: ${loopId} (${currentCount} iterações)`);
            this.loopCounters.delete(loopId);
            throw new Error(`Loop infinito detectado: ${loopId}`);
        }

        return true;
    },

    // Resetar contador de loop
    resetLoopCounter: function(loopId) {
        this.loopCounters.delete(loopId);
    },

    // Executar função com timeout
    withTimeout: function(promise, timeoutMs = this.DEFAULT_TIMEOUT) {
        return Promise.race([
            promise,
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error(`Timeout após ${timeoutMs}ms`)), timeoutMs)
            )
        ]);
    },

    // Executar função com retry
    withRetry: function(fn, maxRetries = 3, delay = this.DEFAULT_RETRY_DELAY) {
        return async function(...args) {
            let lastError;
            
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    return await fn(...args);
                } catch (error) {
                    lastError = error;
                    console.warn(`Tentativa ${attempt}/${maxRetries} falhou:`, error.message);
                    
                    if (attempt < maxRetries) {
                        await this.sleep(delay * attempt); // Backoff exponencial
                    }
                }
            }
            
            throw lastError;
        }.bind(this);
    },

    // Sleep utilitário
    sleep: function(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    // Debounce para evitar execução excessiva
    debounce: function(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Throttle para limitar frequência de execução
    throttle: function(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    // Verificar se uma função está sendo chamada recursivamente
    checkRecursion: function(fnName, maxDepth = 10) {
        const stack = new Error().stack;
        const functionCalls = stack.split('\n').filter(line => line.includes(fnName));
        
        if (functionCalls.length > maxDepth) {
            console.error(`🚨 Recursão excessiva detectada em: ${fnName}`);
            throw new Error(`Recursão excessiva em: ${fnName}`);
        }
    },

    // Executar função com proteção contra recursão
    withRecursionProtection: function(fn, fnName, maxDepth = 10) {
        return function(...args) {
            this.checkRecursion(fnName, maxDepth);
            return fn.apply(this, args);
        }.bind(this);
    },

    // Verificar se uma operação está em progresso
    operationInProgress: new Set(),

    // Executar função apenas se não estiver em progresso
    withOperationLock: function(operationId, fn) {
        return async function(...args) {
            if (this.operationInProgress.has(operationId)) {
                console.warn(`Operação ${operationId} já está em progresso`);
                return;
            }

            this.operationInProgress.add(operationId);
            try {
                return await fn.apply(this, args);
            } finally {
                this.operationInProgress.delete(operationId);
            }
        }.bind(this);
    },

    // Validar dados antes de processar
    validateData: function(data, schema) {
        if (!data) {
            throw new Error('Dados não fornecidos');
        }

        if (schema) {
            for (const [key, validator] of Object.entries(schema)) {
                if (!validator(data[key])) {
                    throw new Error(`Validação falhou para: ${key}`);
                }
            }
        }

        return true;
    },

    // Validadores comuns
    validators: {
        isString: (value) => typeof value === 'string',
        isNumber: (value) => typeof value === 'number' && !isNaN(value),
        isArray: (value) => Array.isArray(value),
        isObject: (value) => typeof value === 'object' && value !== null,
        isFunction: (value) => typeof value === 'function',
        isNotEmpty: (value) => value !== null && value !== undefined && value !== '',
        isPositive: (value) => typeof value === 'number' && value > 0,
        isUrl: (value) => {
            try {
                new URL(value);
                return true;
            } catch {
                return false;
            }
        }
    },

    // Executar função com validação de dados
    withValidation: function(fn, schema) {
        return function(...args) {
            this.validateData(args[0], schema);
            return fn.apply(this, args);
        }.bind(this);
    },

    // Monitorar performance de uma função
    withPerformanceMonitoring: function(fn, fnName) {
        return function(...args) {
            const startTime = performance.now();
            try {
                const result = fn.apply(this, args);
                const endTime = performance.now();
                console.log(`⏱️ ${fnName} executou em ${(endTime - startTime).toFixed(2)}ms`);
                return result;
            } catch (error) {
                const endTime = performance.now();
                console.error(`❌ ${fnName} falhou após ${(endTime - startTime).toFixed(2)}ms:`, error);
                throw error;
            }
        };
    },

    // Executar função com proteção completa
    withFullProtection: function(fn, options = {}) {
        const {
            fnName = 'anonymous',
            timeout = this.DEFAULT_TIMEOUT,
            maxRetries = 3,
            maxDepth = 10,
            schema = null,
            operationId = null
        } = options;

        let protectedFn = fn;

        // Adicionar proteções
        if (operationId) {
            protectedFn = this.withOperationLock(operationId, protectedFn);
        }

        if (schema) {
            protectedFn = this.withValidation(protectedFn, schema);
        }

        protectedFn = this.withRecursionProtection(protectedFn, fnName, maxDepth);
        protectedFn = this.withRetry(protectedFn, maxRetries);
        protectedFn = this.withPerformanceMonitoring(protectedFn, fnName);

        return async function(...args) {
            try {
                return await this.withTimeout(protectedFn(...args), timeout);
            } catch (error) {
                console.error(`❌ Erro em ${fnName}:`, error);
                throw error;
            }
        }.bind(this);
    },

    // Limpar todos os contadores e locks
    cleanup: function() {
        this.loopCounters.clear();
        this.operationInProgress.clear();
        console.log('🧹 LogicUtils limpo');
    }
};

console.log('🔧 LogicUtils carregado'); 