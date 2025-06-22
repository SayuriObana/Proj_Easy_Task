/* Início do arquivo (mainMenu.js) – Adicionar trecho para salvar token e refreshToken no localStorage */

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

// Garante que o tema seja carregado corretamente ao abrir a página
window.addEventListener('DOMContentLoaded', () => {
    // Verifica se o usuário está logado
    const usuarioLogado = StorageUtils ? 
        StorageUtils.getLocalItem("usuarioLogado") : 
        localStorage.getItem("usuarioLogado");
    const isUsuarioSuperior = StorageUtils ? 
        StorageUtils.isSuperiorUser() : 
        localStorage.getItem("isUsuarioSuperior") === "true";

    if (!usuarioLogado) {
        window.location.href = '../../pages/login/loginSystem.html';
        return;
    }

    // Controle da sidebar (menu lateral)
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');

    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            menuToggle.classList.toggle('hidden');
    });

        document.addEventListener('click', (event) => {
            if (sidebar.classList.contains('open') &&
            !sidebar.contains(event.target) &&
            !menuToggle.contains(event.target)) {
                sidebar.classList.remove('open');
                menuToggle.classList.remove('hidden');
        }
    });
    }

    // Inicializa nome do colaborador e status de superior
    document.getElementById('colaborador-nome').textContent = usuarioLogado;
    
    // Adiciona indicador visual de usuário superior
    if (isUsuarioSuperior) {
        const nomeElement = document.getElementById('colaborador-nome');
        nomeElement.innerHTML += ' <span class="superior-badge">(Superior)</span>';
    }

    // Lógica para logout
    const logoutSidebar = document.getElementById('logout-sidebar');
    if (logoutSidebar) {
        logoutSidebar.addEventListener('click', () => {
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = '../../pages/login/loginSystem.html';
        });
    }
});
