/* Início do arquivo (sidebar.js) – Adicionar trecho para salvar token e refreshToken no localStorage */

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

document.addEventListener("DOMContentLoaded", function () {
    fetch("../../src/components/html/sidebar.html")
        .then(res => res.text())
        .then(data => {
            const sidebarContainer = document.createElement("div");
            sidebarContainer.innerHTML = data;
            document.body.insertAdjacentElement("afterbegin", sidebarContainer);
            document.dispatchEvent(new Event('sidebarLoaded'));

            const linkSidebarCss = document.createElement('link');
            linkSidebarCss.rel = 'stylesheet';
            linkSidebarCss.href = '../../src/components/css/sidebar.css';
            document.head.appendChild(linkSidebarCss);

            inicializarSidebar();
            document.body.classList.add(StorageUtils ? 
                StorageUtils.getLocalItem("theme", "dark-theme") : 
                localStorage.getItem("theme") || "dark-theme");

            // 🔥 Adiciona isto aqui:
            document.dispatchEvent(new Event('sidebarLoaded'));

            // Adiciona evento de logout
            document.getElementById("logout-sidebar")?.addEventListener("click", () => {
                realizarLogout();
            });

            // Adiciona evento nos links da sidebar
            document.querySelectorAll(".sidebar-links a").forEach(link => {
                link.addEventListener("click", async function (event) {
                    event.preventDefault();
                    // Verificar token antes de navegar
                    const token = StorageUtils ? 
                        StorageUtils.getToken() : 
                        localStorage.getItem("accessToken");
                    const refreshToken = StorageUtils ? 
                        StorageUtils.getRefreshToken() : 
                        localStorage.getItem("refreshToken");
                    if (!token || !refreshToken) {
                        Swal.fire({
                            icon: "warning",
                            title: "Atenção",
                            text: "Sua sessão expirou. Algumas funcionalidades podem estar indisponíveis.",
                            confirmButtonColor: "#ffc107"
                        });
                        return;
                    }
                    // Fecha a sidebar antes de navegar
                    fecharSidebar();
                    // Navega para a tela
                    setTimeout(() => {
                        window.location.href = this.href;
                    }, 200); // Pequeno delay para animação de fechar
                });
            });
        });
});

function inicializarSidebar() {
    const nomeUsuario = StorageUtils ? 
        StorageUtils.getLocalItem("usuarioLogado", "Usuário") : 
        localStorage.getItem("usuarioLogado") || "Usuário";
    const userNameElement = document.getElementById("user-name");
    if (userNameElement) {
        userNameElement.textContent = nomeUsuario;
    }

    const menuButton = document.getElementById("menuToggle");
    const sidebar = document.getElementById("sidebar");
    const dropdownBtn = document.querySelector(".dropdown-btn");

    if (!menuButton || !sidebar) {
        console.error("❌ ERRO: menuToggle ou sidebar não encontrados!");
        return;
    }

    menuButton.addEventListener("click", function (event) {
        event.stopPropagation();
        sidebar.classList.toggle("open");
    });

    document.addEventListener("click", function (event) {
        if (!sidebar.contains(event.target) && !menuButton.contains(event.target)) {
            sidebar.classList.remove("open");
        }
    });

    if (dropdownBtn) {
        const dropdownContainer = dropdownBtn.parentElement;
        dropdownBtn.addEventListener("click", function (event) {
            event.stopPropagation();
            dropdownContainer.classList.toggle("active");
        });
    }
}

function fecharSidebar() {
    const sidebar = document.getElementById("sidebar");
    if (sidebar) sidebar.classList.remove("open");
}

function realizarLogout() {
    localStorage.removeItem("usuarioLogado");
    window.location.href = "../../pages/login/loginSystem.html";
}
