// Utilitários para manipulação segura do DOM
window.DOMUtils = {
    // Verificar se um elemento existe
    exists: function(selector, context = document) {
        try {
            return context.querySelector(selector) !== null;
        } catch (error) {
            console.warn(`Seletor inválido: ${selector}`, error);
            return false;
        }
    },

    // Obter elemento com verificação de segurança
    getElement: function(selector, context = document) {
        try {
            const element = context.querySelector(selector);
            if (!element) {
                console.warn(`Elemento não encontrado: ${selector}`);
            }
            return element;
        } catch (error) {
            console.error(`Erro ao buscar elemento: ${selector}`, error);
            return null;
        }
    },

    // Obter elemento por ID com verificação de segurança
    getElementById: function(id, context = document) {
        try {
            const element = context.getElementById(id);
            if (!element) {
                console.warn(`Elemento com ID não encontrado: ${id}`);
            }
            return element;
        } catch (error) {
            console.error(`Erro ao buscar elemento por ID: ${id}`, error);
            return null;
        }
    },

    // Obter todos os elementos com verificação de segurança
    getAllElements: function(selector, context = document) {
        try {
            const elements = context.querySelectorAll(selector);
            if (elements.length === 0) {
                console.warn(`Nenhum elemento encontrado: ${selector}`);
            }
            return Array.from(elements);
        } catch (error) {
            console.error(`Erro ao buscar elementos: ${selector}`, error);
            return [];
        }
    },

    // Adicionar event listener com verificação de segurança
    addEventListener: function(selector, event, handler, context = document) {
        const element = this.getElement(selector, context);
        if (element) {
            element.addEventListener(event, handler);
            return true;
        } else {
            console.warn(`Não foi possível adicionar event listener: elemento não encontrado - ${selector}`);
            return false;
        }
    },

    // Adicionar event listener por ID com verificação de segurança
    addEventListenerById: function(id, event, handler, context = document) {
        const element = this.getElementById(id, context);
        if (element) {
            element.addEventListener(event, handler);
            return true;
        } else {
            console.warn(`Não foi possível adicionar event listener: elemento com ID não encontrado - ${id}`);
            return false;
        }
    },

    // Definir texto com verificação de segurança
    setText: function(selector, text, context = document) {
        const element = this.getElement(selector, context);
        if (element) {
            element.textContent = text;
            return true;
        } else {
            console.warn(`Não foi possível definir texto: elemento não encontrado - ${selector}`);
            return false;
        }
    },

    // Definir texto por ID com verificação de segurança
    setTextById: function(id, text, context = document) {
        const element = this.getElementById(id, context);
        if (element) {
            element.textContent = text;
            return true;
        } else {
            console.warn(`Não foi possível definir texto: elemento com ID não encontrado - ${id}`);
            return false;
        }
    },

    // Definir valor com verificação de segurança
    setValue: function(selector, value, context = document) {
        const element = this.getElement(selector, context);
        if (element) {
            element.value = value;
            return true;
        } else {
            console.warn(`Não foi possível definir valor: elemento não encontrado - ${selector}`);
            return false;
        }
    },

    // Definir valor por ID com verificação de segurança
    setValueById: function(id, value, context = document) {
        const element = this.getElementById(id, context);
        if (element) {
            element.value = value;
            return true;
        } else {
            console.warn(`Não foi possível definir valor: elemento com ID não encontrado - ${id}`);
            return false;
        }
    },

    // Obter valor com verificação de segurança
    getValue: function(selector, context = document) {
        const element = this.getElement(selector, context);
        if (element) {
            return element.value;
        } else {
            console.warn(`Não foi possível obter valor: elemento não encontrado - ${selector}`);
            return null;
        }
    },

    // Obter valor por ID com verificação de segurança
    getValueById: function(id, context = document) {
        const element = this.getElementById(id, context);
        if (element) {
            return element.value;
        } else {
            console.warn(`Não foi possível obter valor: elemento com ID não encontrado - ${id}`);
            return null;
        }
    },

    // Verificar se o DOM está pronto
    isReady: function() {
        return document.readyState === 'complete' || document.readyState === 'interactive';
    },

    // Aguardar o DOM estar pronto
    waitForReady: function() {
        return new Promise((resolve) => {
            if (this.isReady()) {
                resolve();
            } else {
                document.addEventListener('DOMContentLoaded', resolve);
            }
        });
    },

    // Verificar se um elemento tem uma classe específica
    hasClass: function(selector, className, context = document) {
        const element = this.getElement(selector, context);
        return element ? element.classList.contains(className) : false;
    },

    // Adicionar classe com verificação de segurança
    addClass: function(selector, className, context = document) {
        const element = this.getElement(selector, context);
        if (element) {
            element.classList.add(className);
            return true;
        } else {
            console.warn(`Não foi possível adicionar classe: elemento não encontrado - ${selector}`);
            return false;
        }
    },

    // Remover classe com verificação de segurança
    removeClass: function(selector, className, context = document) {
        const element = this.getElement(selector, context);
        if (element) {
            element.classList.remove(className);
            return true;
        } else {
            console.warn(`Não foi possível remover classe: elemento não encontrado - ${selector}`);
            return false;
        }
    },

    // Toggle classe com verificação de segurança
    toggleClass: function(selector, className, context = document) {
        const element = this.getElement(selector, context);
        if (element) {
            element.classList.toggle(className);
            return true;
        } else {
            console.warn(`Não foi possível alternar classe: elemento não encontrado - ${selector}`);
            return false;
        }
    },

    // Verificar se um elemento está visível
    isVisible: function(selector, context = document) {
        const element = this.getElement(selector, context);
        if (!element) return false;
        
        const style = window.getComputedStyle(element);
        return style.display !== 'none' && style.visibility !== 'hidden' && element.offsetParent !== null;
    },

    // Mostrar elemento
    show: function(selector, context = document) {
        const element = this.getElement(selector, context);
        if (element) {
            element.style.display = '';
            element.style.visibility = 'visible';
            return true;
        } else {
            console.warn(`Não foi possível mostrar elemento: elemento não encontrado - ${selector}`);
            return false;
        }
    },

    // Ocultar elemento
    hide: function(selector, context = document) {
        const element = this.getElement(selector, context);
        if (element) {
            element.style.display = 'none';
            return true;
        } else {
            console.warn(`Não foi possível ocultar elemento: elemento não encontrado - ${selector}`);
            return false;
        }
    }
};

console.log('🔧 DOMUtils carregado'); 