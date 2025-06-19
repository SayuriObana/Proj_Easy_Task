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

// Padronização do tema para todo o sistema EasyTask
// Usa body.light-theme para tema claro, body padrão para escuro
// O tema é salvo em localStorage na chave 'theme' ('dark' ou 'light')
// O ícone do botão é atualizado automaticamente

function applyTheme(theme) {
    if (theme === 'light') {
        document.body.classList.add('light-theme');
    } else {
        document.body.classList.remove('light-theme');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Sempre leia o tema do localStorage, padrão 'dark'
    const savedTheme = StorageUtils ? 
        StorageUtils.getLocalItem('theme', 'dark') : 
        localStorage.getItem('theme') || 'dark';
    applyTheme(savedTheme);

    // Procura por botões de tema com diferentes seletores
    const themeToggle = document.querySelector('.theme-toggle') || document.getElementById('themeToggle');
    
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const isLight = document.body.classList.contains('light-theme');
            const newTheme = isLight ? 'dark' : 'light';
            localStorage.setItem('theme', newTheme);
            applyTheme(newTheme);
        });
    }
});

// Sincronização automática do tema entre abas/janelas
window.addEventListener('storage', function(event) {
    if (event.key === 'theme') {
        const newTheme = localStorage.getItem('theme') || 'dark';
        applyTheme(newTheme);
    }
});

function updateLogo() {
    const logo = document.querySelector(".modal-logo"); // Seletor correto para a logo

    if (!logo) {
        console.warn("");
        return;
    }

    if (document.body.classList.contains("light-theme")) {
        logo.src = "../../imagens/LOGO_PRETA.PNG";  // Logo preta no tema claro
    } else {
        logo.src = "../../imagens/LOGO_BRANCA.PNG"; // Logo branca no tema escuro
    }
}

function toggleTheme() {
    console.log("Alternando tema...");

    document.body.classList.toggle("light-theme");

    // Verifica e salva o tema no localStorage
    const isLight = document.body.classList.contains("light-theme");
    localStorage.setItem("theme", isLight ? "light" : "dark");

    // ✅ Aplica o tema salvo a todas as abas abertas
    document.querySelectorAll("iframe").forEach(iframe => {
        iframe.contentWindow.localStorage.setItem("theme", isLight ? "light" : "dark");
    });

    console.log("Tema atual salvo:", StorageUtils ? 
        StorageUtils.getLocalItem("theme") : 
        localStorage.getItem("theme"));

    // ✅ Atualiza a logo sempre que o tema for alterado
    updateLogo();
}



