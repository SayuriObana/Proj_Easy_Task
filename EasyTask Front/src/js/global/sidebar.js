document.addEventListener('DOMContentLoaded', () => {
    // Selecionar elementos usando o ID para o menuToggle
    const sidebar = document.querySelector('.sidebar');
    const menuToggle = document.getElementById('menuToggle');
    const sidebarOverlay = document.querySelector('.sidebar-overlay');

    // Verificar se os elementos foram encontrados
    if (!sidebar || !menuToggle) {
        console.error('Elementos da sidebar não encontrados:', {
            sidebar: !!sidebar,
            menuToggle: !!menuToggle
        });
        return;
    }

    console.log('Elementos da sidebar encontrados:', {
        sidebar: sidebar,
        menuToggle: menuToggle
    });

    // Função para abrir a sidebar
    function openSidebar() {
        console.log('Abrindo sidebar');
        sidebar.classList.add('open');
        if (sidebarOverlay) sidebarOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    // Função para fechar a sidebar
    function closeSidebar() {
        console.log('Fechando sidebar');
        sidebar.classList.remove('open');
        if (sidebarOverlay) sidebarOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    // Adicionar evento de clique ao botão de menu
    menuToggle.addEventListener('click', (e) => {
        console.log('Clique no botão de menu');
        e.stopPropagation();
        if (sidebar.classList.contains('open')) {
            closeSidebar();
        } else {
            openSidebar();
        }
    });

    // Fechar a sidebar ao clicar fora dela
    document.addEventListener('click', (e) => {
        if (sidebar.classList.contains('open') &&
            !sidebar.contains(e.target) &&
            !menuToggle.contains(e.target)) {
            closeSidebar();
        }
    });

    // Fechar a sidebar ao pressionar ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && sidebar.classList.contains('open')) {
            closeSidebar();
        }
    });

    // Carregar informações do usuário
    const userData = authUtils.getUserData();
    if (userData) {
        const userNameElement = document.getElementById('userNameSidebar');
        const userLevelElement = document.getElementById('userLevel');
        
        if (userNameElement) {
            userNameElement.textContent = userData.nome;
        }
        
        if (userLevelElement) {
            userLevelElement.textContent = userData.accessLevel.replace('ROLE_', '');
        }
    }

    // Configurar o botão de logout
    const logoutBtn = document.getElementById('logout-sidebar');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            authUtils.logout();
        });
    }

    // Garantir que o botão de menu esteja visível
    menuToggle.style.display = 'flex';
    
    console.log('Inicialização da sidebar concluída');
}); 