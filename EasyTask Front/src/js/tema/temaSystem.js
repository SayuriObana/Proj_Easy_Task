/* Início do arquivo (temaSystem.js) – Adicionar trecho para salvar token e refreshToken no localStorage */

// Verificar autenticação
if (!StorageUtils ? !localStorage.getItem("auth_token") : !StorageUtils.getToken()) {
    const token = StorageUtils ? 
        StorageUtils.getSessionItem("auth_token") : 
        sessionStorage.getItem("auth_token");
    if (token) {
        StorageUtils ? 
            StorageUtils.setLocalItem("auth_token", token) : 
            localStorage.setItem("auth_token", token);
    }
}

if (!StorageUtils ? !localStorage.getItem("refresh_token") : !StorageUtils.getRefreshToken()) {
    const refreshToken = StorageUtils ? 
        StorageUtils.getSessionItem("refresh_token") : 
        sessionStorage.getItem("refresh_token");
    if (refreshToken) {
        StorageUtils ? 
            StorageUtils.setLocalItem("refresh_token", refreshToken) : 
            localStorage.setItem("refresh_token", refreshToken);
    }
}

/* Fim do trecho adicionado */

// Sistema de Temas para EasyTask

// Padronização do tema para todo o sistema EasyTask
// Usa body.light-theme para tema claro, body padrão para escuro
// O tema é salvo em localStorage na chave 'theme' ('dark' ou 'light')
// O ícone do botão é atualizado automaticamente

// Sistema de Temas Melhorado
class ThemeManager {
    constructor() {
        this.currentTheme = this.getSavedTheme();
        this.init();
    }

    getSavedTheme() {
        return StorageUtils ? 
            StorageUtils.getLocalItem('theme', 'dark') : 
            localStorage.getItem('theme') || 'dark';
    }

    applyTheme(theme) {
        if (theme === 'light') {
            document.body.classList.add('light-theme');
        } else {
            document.body.classList.remove('light-theme');
        }
        
        // Salva o tema no localStorage
        if (StorageUtils) {
            StorageUtils.setLocalItem('theme', theme);
        } else {
            localStorage.setItem('theme', theme);
        }

        // Atualiza o ícone do botão
        this.updateThemeIcon();
        
        // Atualiza a logo se existir
        this.updateLogo();
        
        // Dispara evento para outras partes do sistema
        document.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme } }));
    }

    updateThemeIcon() {
        const themeToggles = document.querySelectorAll('.theme-toggle');
        themeToggles.forEach(toggle => {
            const sunIcon = toggle.querySelector('.fa-sun');
            const moonIcon = toggle.querySelector('.fa-moon');
            
            if (sunIcon && moonIcon) {
                if (document.body.classList.contains('light-theme')) {
                    sunIcon.style.display = 'inline';
                    moonIcon.style.display = 'none';
                } else {
                    sunIcon.style.display = 'none';
                    moonIcon.style.display = 'inline';
                }
            }
        });
    }

    updateLogo() {
        const logos = document.querySelectorAll('.modal-logo, .logo, .logo2-icon, .logo-easytask');
        logos.forEach(logo => {
            if (document.body.classList.contains('light-theme')) {
                if (logo.src.includes('LOGO_BRANCA') || logo.src.includes('IMAGEM_LOGO_EASYTASK')) {
                    logo.src = logo.src.replace('IMAGEM_LOGO_EASYTASK', 'LOGO_PRETA');
                }
            } else {
                if (logo.src.includes('LOGO_PRETA')) {
                    logo.src = logo.src.replace('LOGO_PRETA', 'IMAGEM_LOGO_EASYTASK');
                }
            }
        });
    }

    toggleTheme() {
        const isLight = document.body.classList.contains('light-theme');
        const newTheme = isLight ? 'dark' : 'light';
        this.applyTheme(newTheme);
        
        // Sincroniza com outras abas
        this.syncThemeAcrossTabs(newTheme);
    }

    syncThemeAcrossTabs(theme) {
        // Dispara evento para sincronizar com outras abas
        window.dispatchEvent(new StorageEvent('storage', {
            key: 'theme',
            newValue: theme,
            oldValue: this.currentTheme
        }));
    }

    init() {
        // Aplica o tema salvo
        this.applyTheme(this.currentTheme);

        // Adiciona listeners para botões de tema
        this.addThemeToggleListeners();

        // Listener para mudanças em outras abas
        window.addEventListener('storage', (event) => {
            if (event.key === 'theme') {
                const newTheme = event.newValue || 'dark';
                this.applyTheme(newTheme);
            }
        });

        // Listener para mudanças de tema via evento customizado
        document.addEventListener('themeChanged', (event) => {
            this.currentTheme = event.detail.theme;
        });
    }

    addThemeToggleListeners() {
        // Função para adicionar listeners aos botões de tema
        const addListeners = () => {
            const themeToggles = document.querySelectorAll('.theme-toggle');
            themeToggles.forEach(toggle => {
                // Remove listeners existentes para evitar duplicação
                toggle.removeEventListener('click', this.toggleTheme.bind(this));
                // Adiciona novo listener
                toggle.addEventListener('click', this.toggleTheme.bind(this));
            });
        };

        // Adiciona listeners imediatamente
        addListeners();

        // Adiciona listeners quando o DOM mudar (para páginas dinâmicas)
        const observer = new MutationObserver(() => {
            addListeners();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
}

// Inicializa o sistema de temas quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.themeManager = new ThemeManager();
});

// Função global para compatibilidade com código existente
function toggleTheme() {
    if (window.themeManager) {
        window.themeManager.toggleTheme();
    }
}

// Função para aplicar tema diretamente
function applyTheme(theme) {
    if (window.themeManager) {
        window.themeManager.applyTheme(theme);
    }
}

// Função para atualizar logo
function updateLogo() {
    if (window.themeManager) {
        window.themeManager.updateLogo();
    }
}



