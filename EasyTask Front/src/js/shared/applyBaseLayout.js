/**
 * Função para aplicar o layout base em uma página
 * @param {Object} options - Opções de configuração do layout
 * @param {string} options.title - Título da página
 * @param {string} options.header - Cabeçalho da página
 * @param {string} options.subtitle - Subtítulo da página (opcional)
 * @param {string} options.actions - Botões de ação do cabeçalho (opcional)
 * @param {string} options.content - Conteúdo principal da página
 * @param {string} options.footer - Rodapé da página (opcional)
 * @param {string} options.modals - Modais da página (opcional)
 * @param {string[]} options.styles - Array de URLs de estilos específicos da página
 * @param {string[]} options.scripts - Array de URLs de scripts específicos da página
 */
async function applyBaseLayout(options) {
    try {
        // Carrega o template base
        const response = await fetch('../../src/components/html/baseLayout.html');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        let template = await response.text();

        // Substitui os placeholders
        template = template
            .replace('{{PAGE_TITLE}}', options.title)
            .replace('{{PAGE_HEADER}}', options.header)
            .replace('{{PAGE_SUBTITLE}}', options.subtitle ? `<p>${options.subtitle}</p>` : '')
            .replace('{{PAGE_ACTIONS}}', options.actions || '')
            .replace('{{PAGE_CONTENT}}', options.content)
            .replace('{{PAGE_FOOTER}}', options.footer || '')
            .replace('{{PAGE_MODALS}}', options.modals || '');

        // Adiciona os estilos específicos da página
        const stylesHtml = (options.styles || [])
            .map(style => `<link rel="stylesheet" href="${style}">`)
            .join('\n    ');
        template = template.replace('{{PAGE_STYLES}}', stylesHtml);

        // Adiciona os scripts específicos da página
        const scriptsHtml = (options.scripts || [])
            .map(script => `<script src="${script}" defer></script>`)
            .join('\n    ');
        template = template.replace('{{PAGE_SCRIPTS}}', scriptsHtml);

        // Substitui o conteúdo da página
        document.documentElement.innerHTML = template;

        // Reinicializa os scripts necessários
        if (typeof initializePage === 'function') {
            initializePage();
        }

        // Dispara evento de layout aplicado
        document.dispatchEvent(new Event('baseLayoutApplied'));

    } catch (error) {
        console.error('Erro ao aplicar o layout base:', error);
        Swal.fire({
            title: 'Erro ao carregar a página',
            text: 'Não foi possível carregar o layout da página. Por favor, recarregue.',
            icon: 'error',
            confirmButtonText: 'OK'
        });
    }
}

// Exemplo de uso:
/*
document.addEventListener('DOMContentLoaded', () => {
    applyBaseLayout({
        title: 'Lista de Tarefas',
        header: 'Tarefas',
        subtitle: 'Gerencie suas tarefas e projetos',
        actions: `
            <button class="btn btn-primary" onclick="criarNovaTarefa()">
                <i class="fas fa-plus"></i>
                Nova Tarefa
            </button>
        `,
        content: `
            <div class="task-list">
                <!-- Conteúdo da página -->
            </div>
        `,
        footer: '© 2024 EasyTask - Todos os direitos reservados',
        styles: [
            '../../src/css/task/taskList.css'
        ],
        scripts: [
            '../../src/js/task/taskList.js'
        ]
    });
});
*/ 