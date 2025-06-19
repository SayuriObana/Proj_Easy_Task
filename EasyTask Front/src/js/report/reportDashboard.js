document.addEventListener("DOMContentLoaded", () => {
    // Controle de tema - Padronizado para todo o sistema
    const themeToggle = document.querySelector('.theme-toggle');
    if (themeToggle) {
        // Verifica se há um tema salvo e aplica
        const savedTheme = localStorage.getItem('theme') || 'dark';
        if (savedTheme === 'light') {
            document.body.classList.add('light-theme');
        } else {
            document.body.classList.remove('light-theme');
        }

        // Alterna entre temas
        themeToggle.addEventListener('click', () => {
            const isLight = document.body.classList.contains('light-theme');
            const newTheme = isLight ? 'dark' : 'light';
            
            if (newTheme === 'light') {
                document.body.classList.add('light-theme');
            } else {
                document.body.classList.remove('light-theme');
            }
            localStorage.setItem('theme', newTheme);
        });
    }

    // Carrega a sidebar dinamicamente (usando o arquivo sidebar.js)
    const sidebar = document.getElementById("sidebar");
    const menuToggle = document.getElementById("menuToggle");
    if (sidebar && menuToggle) {
        menuToggle.addEventListener("click", (event) => {
            event.stopPropagation();
            sidebar.classList.toggle("open");
        });
    }
    
    // Verificar autenticação ao carregar a página
    checkAuthentication();
    
    // (O toggle de tema é carregado via temaSystem.js, então não é necessário inicializá-lo aqui.)
});

// Função para verificar autenticação
function checkAuthentication() {
    const token = StorageUtils ? 
        StorageUtils.getToken() : 
        localStorage.getItem('accessToken') || localStorage.getItem('auth_token');
    const refreshToken = StorageUtils ? 
        StorageUtils.getRefreshToken() : 
        localStorage.getItem('refreshToken') || localStorage.getItem('refresh_token');
    
    console.log('🔍 Verificando autenticação...');
    console.log('Token:', token ? 'Presente' : 'Ausente');
    console.log('Refresh Token:', refreshToken ? 'Presente' : 'Ausente');
    
    if (!token || !refreshToken) {
        console.log('❌ Usuário não autenticado - redirecionando para login');
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'warning',
                title: 'Acesso Negado',
                text: 'Você precisa estar logado para acessar os relatórios.',
                confirmButtonColor: '#FFD700'
            }).then(() => {
                window.location.href = '../../pages/login/loginSystem.html';
            });
        } else {
            alert('Você precisa estar logado para acessar os relatórios.');
            window.location.href = '../../pages/login/loginSystem.html';
        }
        return false;
    }
    
    // Verificar se o token não está expirado
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expirationTime = payload.exp * 1000;
        const now = Date.now();
        
        console.log('Token expira em:', new Date(expirationTime));
        console.log('Agora:', new Date(now));
        
        if (now >= expirationTime) {
            console.log('❌ Token expirado');
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'warning',
                    title: 'Sessão Expirada',
                    text: 'Sua sessão expirou. Faça login novamente.',
                    confirmButtonColor: '#FFD700'
                }).then(() => {
                    localStorage.clear();
                    window.location.href = '../../pages/login/loginSystem.html';
                });
            } else {
                alert('Sua sessão expirou. Faça login novamente.');
                localStorage.clear();
                window.location.href = '../../pages/login/loginSystem.html';
            }
            return false;
        }
        
        console.log('✅ Token válido');
    } catch (error) {
        console.log('❌ Erro ao verificar token:', error);
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'error',
                title: 'Erro de Autenticação',
                text: 'Erro ao verificar sua sessão. Faça login novamente.',
                confirmButtonColor: '#FFD700'
            }).then(() => {
                localStorage.clear();
                window.location.href = '../../pages/login/loginSystem.html';
            });
        } else {
            alert('Erro ao verificar sua sessão. Faça login novamente.');
            localStorage.clear();
            window.location.href = '../../pages/login/loginSystem.html';
        }
        return false;
    }
    
    console.log('✅ Usuário autenticado');
    return true;
}

// Função para navegar para relatórios com verificação de autenticação
function navigateToReport(reportPage) {
    console.log('🔍 Tentando navegar para:', reportPage);
    console.log('📍 Página atual:', window.location.pathname);
    
    // Verificar apenas se o usuário está logado (sem fazer requisições)
    const token = StorageUtils ? 
        StorageUtils.getToken() : 
        localStorage.getItem('accessToken') || localStorage.getItem('auth_token');
    const refreshToken = StorageUtils ? 
        StorageUtils.getRefreshToken() : 
        localStorage.getItem('refreshToken') || localStorage.getItem('refresh_token');
    
    console.log('🔑 Token encontrado:', !!token);
    console.log('🔄 Refresh token encontrado:', !!refreshToken);
    
    if (!token || !refreshToken) {
        console.log('❌ Usuário não autenticado');
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'warning',
                title: 'Acesso Negado',
                text: 'Você precisa estar logado para acessar os relatórios.',
                confirmButtonColor: '#FFD700'
            }).then(() => {
                window.location.href = '../../pages/login/loginSystem.html';
            });
        } else {
            alert('Você precisa estar logado para acessar os relatórios.');
            window.location.href = '../../pages/login/loginSystem.html';
        }
        return;
    }
    
    // Verificar se o token não está expirado
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expirationTime = payload.exp * 1000;
        const now = Date.now();
        
        console.log('⏰ Token expira em:', new Date(expirationTime));
        console.log('🕐 Agora:', new Date(now));
        console.log('⏳ Tempo restante:', Math.floor((expirationTime - now) / 1000), 'segundos');
        
        if (now >= expirationTime) {
            console.log('❌ Token expirado');
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'warning',
                    title: 'Sessão Expirada',
                    text: 'Sua sessão expirou. Faça login novamente.',
                    confirmButtonColor: '#FFD700'
                }).then(() => {
                    localStorage.clear();
                    window.location.href = '../../pages/login/loginSystem.html';
                });
            } else {
                alert('Sua sessão expirou. Faça login novamente.');
                localStorage.clear();
                window.location.href = '../../pages/login/loginSystem.html';
            }
            return;
        }
        
        console.log('✅ Token válido - navegando...');
    } catch (error) {
        console.log('❌ Erro ao verificar token:', error);
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'error',
                title: 'Erro de Autenticação',
                text: 'Erro ao verificar sua sessão. Faça login novamente.',
                confirmButtonColor: '#FFD700'
            }).then(() => {
                localStorage.clear();
                window.location.href = '../../pages/login/loginSystem.html';
            });
        } else {
            alert('Erro ao verificar sua sessão. Faça login novamente.');
            localStorage.clear();
            window.location.href = '../../pages/login/loginSystem.html';
        }
        return;
    }
    
    // Construir o caminho correto
    const currentPath = window.location.pathname;
    const basePath = currentPath.substring(0, currentPath.lastIndexOf('/'));
    const reportPath = `${basePath}/${reportPage}`;
    
    console.log('📍 Navegando para:', reportPath);
    
    // Navegar diretamente para a página do relatório
    try {
        window.location.href = reportPath;
    } catch (error) {
        console.error('Erro ao navegar:', error);
        // Fallback: tentar navegação simples
        window.location.href = reportPage;
    }
} 