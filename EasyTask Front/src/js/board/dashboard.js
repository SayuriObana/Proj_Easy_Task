document.addEventListener("DOMContentLoaded", () => {
    // Controle de tema - Padronizado para todo o sistema
    const themeToggle = document.getElementById('theme-toggle');
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

    // Controle da sidebar
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }

    // Carregar dados do dashboard
    carregarDadosDashboard();
});

async function carregarDadosDashboard() {
    try {
        // Aqui você pode adicionar a lógica para carregar dados do dashboard
        // Por exemplo, estatísticas, tarefas recentes, etc.
        console.log('Dashboard carregado com sucesso');
    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
    }
} 