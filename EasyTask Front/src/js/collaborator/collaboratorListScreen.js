// Configuração da API - usar API_CONFIG centralizado
const API_URL = window.API_CONFIG ? window.API_CONFIG.BASE_URL : 'http://localhost:8080';

/* Início do arquivo (collaboratorListScreen.js) – Adicionar trecho para salvar token e refreshToken no localStorage */

// Ao carregar a tela, verifica se o token e refreshToken já estão salvos no localStorage.
// Caso não estejam, salva (por exemplo, copiando de sessionStorage ou de um cookie, se disponível).
// (Observe que, em geral, o token é salvo na tela de login, mas essa verificação garante que todas as telas salvem o token.)
(function () {
  if (!localStorage.getItem("accessToken")) {
    const token = sessionStorage.getItem("accessToken");
    if (token) localStorage.setItem("accessToken", token);
  }
  if (!localStorage.getItem("refreshToken")) {
    const refreshToken = sessionStorage.getItem("refreshToken");
    if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
  }
})();

/* Fim do trecho adicionado */

// Variáveis globais
let colaboradores = [];
let colaboradorSelecionadoId = null;

// Elementos do DOM
const profileGrid = document.getElementById("profileGrid");
const sidebar = document.getElementById("sidebar");
const menuToggle = document.getElementById("menuToggle");
const searchBar = document.getElementById("searchBar");
const modalColaborador = document.getElementById("modalColaborador");
const modalVisualizar = document.getElementById("modalVisualizarColaborador");
const formCadastro = document.getElementById("formCadastroColaborador");
const fecharModal = document.getElementById("fecharModal");
const fecharVisualizar = document.getElementById("fecharVisualizacao");

// Logs para debug dos elementos do DOM
console.log('🔍 Elementos do DOM encontrados:');
console.log('  - profileGrid:', !!profileGrid);
console.log('  - sidebar:', !!sidebar);
console.log('  - menuToggle:', !!menuToggle);
console.log('  - searchBar:', !!searchBar);
console.log('  - modalColaborador:', !!modalColaborador);
console.log('  - modalVisualizar:', !!modalVisualizar);
console.log('  - formCadastro:', !!formCadastro);
console.log('  - fecharModal:', !!fecharModal);
console.log('  - fecharVisualizar:', !!fecharVisualizar);
console.log('🔗 API_URL configurada:', API_URL);

// Função para atualizar o ícone do tema
function updateThemeIcon(theme) {
    const themeIcon = document.querySelector('#themeToggle i');
    if (themeIcon) {
        themeIcon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
}

// Função para verificar se o token está expirado
function isTokenExpired(token) {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expirationTime = payload.exp * 1000; // Converter para milissegundos
        const currentTime = Date.now();
        const isExpired = currentTime >= expirationTime;
        
        return isExpired;
    } catch (error) {
        console.error('Erro ao verificar expiração do token:', error);
        return true; // Se não conseguir verificar, considera como expirado
    }
}

// Função para renovar o token
async function renovarToken() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
        throw new Error('Refresh token não encontrado');
    }

    try {
        const refreshResp = await fetch(`${API_URL}/collaborators/refresh-token`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ refreshToken })
        });

        if (!refreshResp.ok) {
            const errorData = await refreshResp.json().catch(() => ({}));
            if (refreshResp.status === 403 || refreshResp.status === 401) {
                throw new Error('Refresh token inválido ou expirado');
            }
            throw new Error(errorData.error || 'Erro ao renovar token');
        }

        const data = await refreshResp.json();
        if (!data.accessToken) {
            throw new Error('Resposta inválida do servidor');
        }

        localStorage.setItem('accessToken', data.accessToken);
        
        // Retorna o novo token sem fazer chamadas adicionais
        return data.accessToken;
    } catch (error) {
        console.error('Erro ao renovar token:', error);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        throw error;
    }
}

// Função utilitária para requisições autenticadas
const fetchComToken = async (url, options = {}) => {
    let token = localStorage.getItem('accessToken');
    let tentativas = 0;
    const MAX_TENTATIVAS = 2; // Reduzido para evitar loops infinitos
    
    if (!token) {
        try {
            token = await renovarToken();
        } catch (error) {
            console.error('❌ Não foi possível renovar o token:', error);
            localStorage.clear();
            Swal.fire({
                title: "Sessão expirada",
                text: "Sua sessão expirou ou você não tem permissão. Faça login novamente.",
                icon: "warning",
                confirmButtonText: "OK"
            });
            throw new Error('Sessão expirada ou sem permissão');
        }
    }

    while (tentativas < MAX_TENTATIVAS) {
        try {
            if (isTokenExpired(token)) {
                token = await renovarToken();
            }

            const fetchOptions = {
                ...options,
                headers: {
                    ...(options.headers || {}),
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            };

            const response = await fetch(url, fetchOptions);

            if (response.ok) {
                return response;
            }

            // Se for erro 403, não tentar renovar token (problema de permissão)
            if (response.status === 403) {
                console.warn('⚠️ Erro 403 - Problema de permissão, não renovando token');
                throw new Error(`Erro de permissão: ${response.status}`);
            }

            // Só renovar token para erros 401
            if (response.status === 401) {
                token = await renovarToken();
                tentativas++;
                continue;
            }

            throw new Error(`Erro na requisição: ${response.status}`);
        } catch (error) {
            console.error('Erro na requisição:', error);
            
            // Se for erro de permissão ou refresh token inválido, não tentar novamente
            if (error.message.includes('Erro de permissão') || 
                error.message === 'Refresh token inválido ou expirado' || 
                tentativas >= MAX_TENTATIVAS - 1) {
                
                if (error.message.includes('Refresh token inválido')) {
                    localStorage.clear();
                    Swal.fire({
                        title: "Sessão expirada",
                        text: "Sua sessão expirou ou você não tem permissão. Faça login novamente.",
                        icon: "warning",
                        confirmButtonText: "OK"
                    });
                }
                
                throw error;
            }
            tentativas++;
        }
    }
};

// Funções de manipulação do DOM
const renderizarColaborador = (colaborador) => {
    console.log('🔍 Dados do colaborador:', colaborador); // Debug
    
    // Verificar se o usuário tem permissão de SUPERIOR
    const isUsuarioSuperior = localStorage.getItem('isUsuarioSuperior') === 'true';
    console.log('🔍 Usuário é SUPERIOR:', isUsuarioSuperior); // Debug
    
    const card = document.createElement("div");
    card.className = "profile-card";
    card.innerHTML = `
        <p>${colaborador.name}</p>
        <div class="buttons-container">
            <button class="view-btn" data-id="${colaborador.idCollaborator}">Visualizar</button>
            ${isUsuarioSuperior ? `<button class="edit-btn" data-id="${colaborador.idCollaborator}">Editar</button>` : ''}
            ${isUsuarioSuperior ? `<button class="delete-btn" data-id="${colaborador.idCollaborator}">Excluir</button>` : ''}
        </div>
    `;

    const collaboratorId = colaborador.idCollaborator;
    console.log('🔍 ID do colaborador:', collaboratorId); // Debug
    console.log('🔍 Tipo do ID:', typeof collaboratorId); // Debug
    console.log('🔍 Colaborador tem idCollaborator?', 'idCollaborator' in colaborador); // Debug
    console.log('🔍 Todas as chaves do colaborador:', Object.keys(colaborador)); // Debug

    // Duplo clique para ver tarefas
    card.addEventListener("dblclick", () => {
        window.location.href = `../task/taskListScreen.html?colaboradorId=${collaboratorId}`;
    });

    return card;
};

const renderizarColaboradores = (listaColaboradores = colaboradores) => {
    console.log('🔍 Iniciando renderização de colaboradores...'); // Debug
    console.log('🔍 Lista de colaboradores:', listaColaboradores); // Debug
    console.log('🔍 ProfileGrid encontrado:', !!profileGrid); // Debug
    
    if (!profileGrid) {
        console.error('❌ ProfileGrid não encontrado!');
        return;
    }
    
    profileGrid.innerHTML = "";

    if (listaColaboradores.length === 0) {
        console.log('🔍 Nenhum colaborador encontrado, mostrando mensagem vazia'); // Debug
        profileGrid.innerHTML = `
            <div class="mensagem-vazia">
                <i class="fas fa-user-times"></i>
                <p>Nenhum colaborador encontrado.</p>
            </div>
        `;
        return;
    }

    console.log('🔍 Renderizando', listaColaboradores.length, 'colaboradores...'); // Debug
    listaColaboradores.forEach((colaborador, index) => {
        console.log(`🔍 Renderizando colaborador ${index + 1}:`, colaborador.name); // Debug
        const card = renderizarColaborador(colaborador);
        profileGrid.appendChild(card);
    });
    
    console.log('🔍 Renderização concluída!'); // Debug
};

// Funções de manipulação de dados
const carregarColaboradores = async () => {
    try {
        console.log('🔍 Iniciando carregamento de colaboradores...'); // Debug
        
        const response = await fetchComToken(`${API_URL}/collaborators`);
        console.log('🔍 Response status:', response.status); // Debug
        
        if (!response.ok) throw new Error('Erro ao carregar colaboradores');
        
        colaboradores = await response.json();
        console.log('🔍 Colaboradores carregados:', colaboradores); // Debug
        console.log('🔍 Quantidade de colaboradores:', colaboradores.length); // Debug
        
        renderizarColaboradores();
        console.log('🔍 Colaboradores renderizados com sucesso!'); // Debug
        
        // Reaplicar event listeners após renderizar
        setTimeout(() => {
            reaplicarEventListeners();
        }, 100);
        
    } catch (error) {
        console.error('❌ Erro ao carregar colaboradores:', error);
        Swal.fire({
            title: "Erro!",
            text: "Não foi possível carregar os colaboradores.",
            icon: "error",
            confirmButtonColor: "#d33"
        });
    }
};

// Função para fechar o modal de visualização
const fecharModalVisualizacao = () => {
    console.log('🔍 Fechando modal de visualização...'); // Debug
    modalVisualizar.classList.remove("show");
    // Aguardar a animação terminar antes de esconder
    setTimeout(() => {
        modalVisualizar.style.display = "none";
        modalVisualizar.style.zIndex = "-1"; // Garantir que não interfira com cliques
        console.log('🔍 Modal de visualização fechado completamente'); // Debug
    }, 300);
};

// Event listener para o botão de fechar visualização
fecharVisualizar.addEventListener("click", fecharModalVisualizacao);

// Event listener para fechar ao clicar fora do modal
modalVisualizar.addEventListener("click", (e) => {
    if (e.target === modalVisualizar) {
        fecharModalVisualizacao();
    }
});

// Event listener para fechar com a tecla ESC
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modalVisualizar.style.display === "block") {
        fecharModalVisualizacao();
    }
});

const visualizarColaborador = async (id) => {
    console.log('🔍 Visualizando colaborador com ID:', id); // Debug
    
    if (!id || id === 'undefined') {
        console.error('❌ ID do colaborador é undefined ou inválido');
        Swal.fire({
            title: "Erro",
            text: "ID do colaborador inválido",
            icon: "error",
            confirmButtonText: "OK"
        });
        return;
    }
    
    try {
        // Primeiro, tentar encontrar o colaborador no array local (mais rápido)
        let colaborador = colaboradores.find(c => c.idCollaborator == id || c.id == id);
        
        // Se não encontrar no array local, buscar na API
        if (!colaborador) {
            console.log('🔍 Colaborador não encontrado no array local, buscando na API...');
            const response = await fetchComToken(`${API_URL}/collaborators/${id}`);
            if (!response.ok) throw new Error('Erro ao carregar dados do colaborador');
            colaborador = await response.json();
        } else {
            console.log('🔍 Colaborador encontrado no array local:', colaborador);
        }
        
        // Atualizar os campos do modal
        document.getElementById("detalheNome").innerHTML = `<strong>Nome:</strong> ${colaborador.name || colaborador.nome}`;
        document.getElementById("detalheEmail").innerHTML = `<strong>Email:</strong> ${colaborador.email}`;
        document.getElementById("detalheTelefone").innerHTML = `<strong>Telefone:</strong> ${colaborador.phone || colaborador.telefone || 'Não informado'}`;
        document.getElementById("detalheCargo").innerHTML = `<strong>Cargo:</strong> ${colaborador.position || colaborador.cargo || 'Não informado'}`;
        
        // Exibir o modal com animação
        modalVisualizar.style.zIndex = "1000"; // Garantir z-index correto
        modalVisualizar.style.display = "block";
        modalVisualizar.classList.add("show");
        
    } catch (error) {
        console.error('Erro ao visualizar colaborador:', error);
        Swal.fire({
            title: "Erro",
            text: "Não foi possível carregar os dados do colaborador",
            icon: "error",
            confirmButtonText: "OK"
        });
    }
};

const editarColaborador = async (id) => {
    console.log('🔍 Editando colaborador com ID:', id); // Debug
    
    // Verificar se o usuário tem permissão de SUPERIOR
    const isUsuarioSuperior = localStorage.getItem('isUsuarioSuperior') === 'true';
    
    if (!isUsuarioSuperior) {
        Swal.fire({
            title: "Acesso Negado",
            text: "Você não tem permissão para editar colaboradores. Apenas usuários com nível SUPERIOR podem realizar esta ação.",
            icon: "warning",
            confirmButtonColor: "#3085d6"
        });
        return;
    }
    
    if (!id || id === 'undefined') {
        console.error('❌ ID do colaborador é undefined ou inválido');
        Swal.fire({
            title: "Erro",
            text: "ID do colaborador inválido",
            icon: "error",
            confirmButtonText: "OK"
        });
        return;
    }
    
    try {
        // Primeiro, tentar encontrar o colaborador no array local (mais rápido)
        let colaborador = colaboradores.find(c => c.idCollaborator == id || c.id == id);
        
        // Se não encontrar no array local, buscar na API
        if (!colaborador) {
            console.log('🔍 Colaborador não encontrado no array local, buscando na API...');
            const response = await fetchComToken(`${API_URL}/collaborators/${id}`);
            
            if (!response.ok) {
                throw new Error(`Erro ao buscar colaborador: ${response.status}`);
            }
            
            colaborador = await response.json();
            console.log('🔍 Colaborador encontrado na API:', colaborador);
        } else {
            console.log('🔍 Colaborador encontrado no array local:', colaborador);
        }

        colaboradorSelecionadoId = id;
        
        // Preencher campos do formulário
        document.getElementById('nome').value = colaborador.name || colaborador.nome;
        document.getElementById('email').value = colaborador.email;
        document.getElementById('telefone').value = colaborador.phone || colaborador.telefone;
        document.getElementById('cargo').value = colaborador.position || colaborador.cargo;
        document.getElementById('accessLevel').value = colaborador.accessLevel;
        var campoSenha = document.getElementById('senha');
        if (campoSenha) campoSenha.value = ""; // Só limpa se existir
        
        // Mostrar botão de alterar senha apenas para edição
        document.getElementById('btnAlterarSenha').style.display = 'block';

        // Mostrar/ocultar campo de senha baseado no modo
        const campoSenhaCadastro = document.getElementById('campoSenhaCadastro');
        if (campoSenhaCadastro) {
            campoSenhaCadastro.style.display = 'none'; // Ocultar na edição
        }

        modalColaborador.style.zIndex = "1000"; // Garantir z-index correto
        modalColaborador.querySelector("h2").textContent = "Editar Colaborador";
        modalColaborador.style.display = "flex";
        
        console.log('🔍 Modal de edição aberto com sucesso!');
    } catch (error) {
        console.error('❌ Erro ao editar colaborador:', error);
        Swal.fire({
            title: "Erro!",
            text: error.message || "Não foi possível carregar os dados do colaborador",
            icon: "error",
            confirmButtonColor: "#d33"
        });
    }
};

const excluirColaborador = async (id) => {
    console.log('🔍 Excluindo colaborador com ID:', id); // Debug
    
    // Verificar se o usuário tem permissão de SUPERIOR
    const isUsuarioSuperior = localStorage.getItem('isUsuarioSuperior') === 'true';
    const token = localStorage.getItem('accessToken');
    const usuarioLogado = localStorage.getItem('usuarioLogado');
    const accessLevel = localStorage.getItem('accessLevel');
    console.log('🔍 Permissões e token:', {
        isUsuarioSuperior,
        usuarioLogado,
        accessLevel,
        tokenPresente: !!token,
        tokenInicio: token ? token.substring(0, 20) + '...' : 'null'
    });
    
    if (!isUsuarioSuperior) {
        Swal.fire({
            title: "Acesso Negado",
            text: "Você não tem permissão para excluir colaboradores. Apenas usuários com nível SUPERIOR podem realizar esta ação.",
            icon: "warning",
            confirmButtonColor: "#3085d6"
        });
        return;
    }
    
    if (!id || id === 'undefined') {
        console.error('❌ ID do colaborador é undefined ou inválido');
        Swal.fire({
            title: "Erro",
            text: "ID do colaborador inválido",
            icon: "error",
            confirmButtonText: "OK"
        });
        return;
    }
    
    try {
        const result = await Swal.fire({
            title: "Tem certeza?",
            text: "Esta ação não poderá ser revertida!",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonColor: "#3085d6",
            confirmButtonText: "Sim, excluir!",
            cancelButtonText: "Cancelar"
        });

        if (!result.isConfirmed) return;

        const url = `${API_URL}/collaborators/${id}`;
        console.log('🔍 Enviando DELETE para:', url);
        const response = await fetchComToken(url, {
            method: 'DELETE'
        });
        console.log('🔍 Status da resposta:', response.status);
        let responseBody = null;
        try {
            responseBody = await response.clone().json();
        } catch (e) {
            try {
                responseBody = await response.clone().text();
            } catch (e2) {
                responseBody = null;
            }
        }
        console.log('🔍 Corpo da resposta:', responseBody);

        if (response.status === 403) {
            Swal.fire({
                title: "Não é possível excluir!",
                text: "Este colaborador está vinculado a uma tarefa e não pode ser excluído.",
                icon: "warning",
                confirmButtonColor: "#FFD600"
            });
            return;
        }

        if (!response.ok) throw new Error('Erro ao excluir colaborador: ' + (responseBody && responseBody.message ? responseBody.message : response.status));

        await Swal.fire({
            title: "Excluído!",
            text: "Colaborador excluído com sucesso.",
            icon: "success",
            timer: 1500,
            showConfirmButton: false
        });

        await carregarColaboradores();
    } catch (error) {
        console.error('❌ Erro ao excluir colaborador:', error);
        Swal.fire({
            title: "Erro!",
            text: error.message || "Não foi possível excluir o colaborador.",
            icon: "error",
            confirmButtonColor: "#d33"
        });
    }
};

// Flag para evitar verificações múltiplas de permissões
let permissoesVerificadas = false;

const verificarPermissoesUsuario = async () => {
    // Evitar verificações múltiplas
    if (permissoesVerificadas) {
        return;
    }
    
    try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            console.warn('⚠️ Token não encontrado');
            return;
        }
        
        // Verificar se já temos as permissões salvas e se o token não expirou
        const isUsuarioSuperior = localStorage.getItem('isUsuarioSuperior');
        const accessLevel = localStorage.getItem('accessLevel');
        
        if (isUsuarioSuperior && accessLevel && !isTokenExpired(token)) {
            permissoesVerificadas = true;
            return;
        }
        
        const response = await fetch(`${API_URL}/collaborators/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const me = await response.json();
            const isSuperior = me.accessLevel === 'SUPERIOR';
            
            localStorage.setItem('isUsuarioSuperior', isSuperior.toString());
            localStorage.setItem('accessLevel', me.accessLevel || 'BASICO');
            
            permissoesVerificadas = true;
        } else if (response.status === 401 || response.status === 403) {
            console.warn('⚠️ Token inválido ou sem permissão para verificar permissões');
            // Não limpar o localStorage aqui, deixar para a função fetchComToken tratar
        } else {
            console.warn('⚠️ Não foi possível verificar permissões:', response.status);
        }
    } catch (error) {
        console.error('❌ Erro ao verificar permissões:', error);
        // Não propagar o erro para evitar loops
    }
};

// 🔹 Função para abrir modal de alteração de senha
const abrirModalAlterarSenha = (colaboradorId, colaboradorNome) => {
    console.log('🔐 Abrindo modal de alteração de senha para:', colaboradorNome, 'ID:', colaboradorId);
    
    // Armazenar o ID do colaborador que está alterando a senha
    window.colaboradorAlterandoSenhaId = colaboradorId;
    
    // Atualizar título do modal
    const modalTitle = document.querySelector('#modalAlterarSenha h2');
    if (modalTitle) {
        modalTitle.textContent = `Alterar Senha - ${colaboradorNome}`;
    }
    
    // Limpar formulário
    const formAlterarSenha = document.getElementById('formAlterarSenha');
    if (formAlterarSenha) {
        formAlterarSenha.reset();
    }
    
    // Mostrar modal com z-index adequado
    const modalAlterarSenha = document.getElementById('modalAlterarSenha');
    if (modalAlterarSenha) {
        // Garantir que o modal de edição não interfira
        const modalColaborador = document.getElementById('modalColaborador');
        if (modalColaborador) {
            modalColaborador.style.zIndex = '9998'; // Abaixo do modal de alterar senha
        }
        
        modalAlterarSenha.style.display = 'flex';
        modalAlterarSenha.classList.add('show');
        modalAlterarSenha.style.zIndex = '9999'; // Garantir que fique acima de outros elementos
        
        // Debug: verificar se o modal está visível
        console.log('🔐 Modal de alterar senha - display:', modalAlterarSenha.style.display);
        console.log('🔐 Modal de alterar senha - z-index:', modalAlterarSenha.style.zIndex);
        console.log('🔐 Modal de alterar senha - classList:', modalAlterarSenha.classList.toString());
        console.log('🔐 Modal de alterar senha exibido com sucesso');
    } else {
        console.error('❌ Modal de alterar senha não encontrado');
    }
};

// 🔹 Função para fechar modal de alteração de senha
const fecharModalAlterarSenha = () => {
    console.log('🔐 Fechando modal de alteração de senha...'); // Debug
    
    const modalAlterarSenha = document.getElementById('modalAlterarSenha');
    if (modalAlterarSenha) {
        modalAlterarSenha.style.display = 'none';
        modalAlterarSenha.classList.remove('show');
        modalAlterarSenha.style.zIndex = '-1'; // Garantir que não interfira com cliques
    }
    
    const formAlterarSenha = document.getElementById('formAlterarSenha');
    if (formAlterarSenha) {
        formAlterarSenha.reset();
    }
    
    window.colaboradorAlterandoSenhaId = null;
    console.log('🔐 Modal de alteração de senha fechado completamente'); // Debug
};

// 🔹 Função para fechar modal de edição
const fecharModalEdicao = () => {
    console.log('🔍 Fechando modal de edição...'); // Debug
    modalColaborador.style.display = "none";
    modalColaborador.style.zIndex = "-1"; // Garantir que não interfira com cliques
    modalColaborador.setAttribute('aria-hidden', 'true');
    document.getElementById('formCadastroColaborador').reset();
    colaboradorSelecionadoId = null;
    document.getElementById('btnAlterarSenha').style.display = 'none';
    modalColaborador.querySelector('h2').textContent = 'Cadastrar Novo Colaborador';
    console.log('🔍 Modal de edição fechado completamente'); // Debug
};

// 🔹 Função para alterar senha do colaborador
const alterarSenhaColaborador = async (colaboradorId, senhaAtual, novaSenha) => {
    try {
        console.log('🔐 Alterando senha do colaborador ID:', colaboradorId);
        console.log('🔐 Senha atual:', senhaAtual ? '***' : 'vazia');
        console.log('🔐 Nova senha:', novaSenha ? '***' : 'vazia');
        
        // Verificar token antes da requisição
        const token = localStorage.getItem('accessToken');
        console.log('🔐 Token disponível:', !!token);
        console.log('🔐 Token (primeiros 20 chars):', token ? token.substring(0, 20) + '...' : 'null');
        
        const requestBody = {
            currentPassword: senhaAtual,
            newPassword: novaSenha
        };
        
        console.log('🔐 Request body:', JSON.stringify(requestBody, null, 2));
        
        const response = await fetchComToken(`${API_URL}/collaborators/${colaboradorId}/change-password`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        console.log('🔐 Response status:', response.status);
        console.log('🔐 Response headers:', response.headers);
        
        if (!response.ok) {
            let errorMessage = 'Erro ao alterar senha';
            let errorDetails = '';
            
            if (response.status === 400) {
                throw new Error('Senha atual incorreta. Tente novamente.');
            }
            
            try {
                const errorData = await response.json();
                console.log('🔐 Error data:', errorData);
                errorMessage = errorData.error || errorData.message || errorData.details || errorMessage;
                errorDetails = errorData.details || errorData.error || '';
            } catch (e) {
                console.log('🔐 Erro ao parsear JSON de erro:', e);
                const errorText = await response.text();
                console.log('🔐 Error text:', errorText);
                if (errorText) {
                    errorMessage = errorText;
                    errorDetails = errorText;
                }
            }
            
            console.log('🔐 Error message:', errorMessage);
            console.log('🔐 Error details:', errorDetails);
            
            throw new Error(errorMessage);
        }
        
        const result = await response.text();
        console.log('✅ Senha alterada com sucesso:', result);
        
        return true;
    } catch (error) {
        console.error('❌ Erro ao alterar senha:', error);
        console.error('❌ Error stack:', error.stack);
        throw error;
    }
};

// Função para reaplicar event listeners nos botões dos cards
const reaplicarEventListeners = () => {
    console.log('🔍 Reaplicando event listeners...'); // Debug
    
    // Limpar todos os modais primeiro
    limparTodosModais();
    
    // Usar event delegation para os botões dos cards
    const profileGrid = document.getElementById("profileGrid");
    if (!profileGrid) {
        console.error('❌ ProfileGrid não encontrado para reaplicar event listeners');
        return;
    }
    
    // Event delegation para todos os botões
    profileGrid.addEventListener('click', (e) => {
        console.log('🔍 Clique detectado no profileGrid:', e.target.className); // Debug
        
        if (e.target.classList.contains('view-btn')) {
            e.preventDefault();
            e.stopPropagation();
            const collaboratorId = e.target.getAttribute('data-id');
            console.log('🔍 Clique no botão Visualizar detectado via delegation!', collaboratorId);
            visualizarColaborador(collaboratorId);
        } else if (e.target.classList.contains('edit-btn')) {
            e.preventDefault();
            e.stopPropagation();
            const collaboratorId = e.target.getAttribute('data-id');
            console.log('🔍 Clique no botão Editar detectado via delegation!', collaboratorId);
            editarColaborador(collaboratorId);
        } else if (e.target.classList.contains('delete-btn')) {
            e.preventDefault();
            e.stopPropagation();
            const collaboratorId = e.target.getAttribute('data-id');
            console.log('🔍 Clique no botão Excluir detectado via delegation!', collaboratorId);
            excluirColaborador(collaboratorId);
        }
    });
    
    // Reaplicar event listener do botão alterar senha
    const btnAlterarSenha = document.getElementById('btnAlterarSenha');
    if (btnAlterarSenha) {
        // Remover event listeners antigos
        btnAlterarSenha.replaceWith(btnAlterarSenha.cloneNode(true));
        
        // Adicionar novo event listener
        document.getElementById('btnAlterarSenha').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🔐 Botão alterar senha clicado!'); // Debug
            const colaboradorId = colaboradorSelecionadoId;
            const colaboradorNome = document.getElementById('nome').value;
            
            if (!colaboradorId) {
                console.error('❌ ID do colaborador não encontrado');
                return;
            }
            
            console.log('🔐 Abrindo modal de alterar senha para:', colaboradorNome, 'ID:', colaboradorId);
            
            // Não fechar o modal de edição imediatamente, apenas abrir o modal de alterar senha
            abrirModalAlterarSenha(colaboradorId, colaboradorNome);
        });
    }
    
    // Ajustar z-index dos modais para ficarem abaixo dos alerts
    if (modalColaborador) {
        modalColaborador.style.zIndex = '9999';
    }
    if (modalVisualizar) {
        modalVisualizar.style.zIndex = '9999';
    }
    const modalAlterarSenha = document.getElementById('modalAlterarSenha');
    if (modalAlterarSenha) {
        modalAlterarSenha.style.zIndex = '9999';
    }
    
    console.log('🔍 Event listeners reaplicados com sucesso!'); // Debug
};

// Função para limpar todos os modais
const limparTodosModais = () => {
    console.log('🔍 Limpando todos os modais...'); // Debug
    
    // Limpar modal de visualização
    if (modalVisualizar) {
        modalVisualizar.classList.remove("show");
        modalVisualizar.style.display = "none";
        modalVisualizar.style.zIndex = "-1";
    }
    
    // Limpar modal de edição
    if (modalColaborador) {
        modalColaborador.style.display = "none";
        modalColaborador.style.zIndex = "-1";
    }
    
    // Limpar modal de alterar senha
    const modalAlterarSenha = document.getElementById('modalAlterarSenha');
    if (modalAlterarSenha) {
        modalAlterarSenha.style.display = "none";
        modalAlterarSenha.style.zIndex = "-1";
    }
    
    console.log('🔍 Todos os modais foram limpos'); // Debug
};

// Inicialização quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 DOM carregado, iniciando configuração...');
    
    // Verificar se todos os elementos necessários estão presentes
    const elementosNecessarios = {
        'profileGrid': profileGrid,
        'sidebar': sidebar,
        'menuToggle': menuToggle,
        'searchBar': searchBar,
        'modalColaborador': modalColaborador,
        'modalVisualizar': modalVisualizar,
        'formCadastro': formCadastro,
        'fecharModal': fecharModal,
        'fecharVisualizar': fecharVisualizar
    };
    
    console.log('🔍 Verificando elementos do DOM:');
    let todosElementosPresentes = true;
    for (const [nome, elemento] of Object.entries(elementosNecessarios)) {
        const presente = !!elemento;
        console.log(`  - ${nome}: ${presente ? '✅' : '❌'}`);
        if (!presente) todosElementosPresentes = false;
    }
    
    if (!todosElementosPresentes) {
        console.error('❌ Alguns elementos necessários não foram encontrados!');
        return;
    }
    
    console.log('✅ Todos os elementos necessários encontrados!');
    
    // Verificar permissões do usuário
    await verificarPermissoesUsuario();
    
    // Carregar colaboradores
    await carregarColaboradores();
    
    // Configurar event listeners
    reaplicarEventListeners();
    
    // Form de cadastro/edição
    if (formCadastro) {
        console.log('🔍 Configurando formulário de cadastro...');
        let formularioSubmetendo = false; // Flag para evitar submissões múltiplas
        
        // Verificar se o formulário já tem event listener
        const formClone = formCadastro.cloneNode(true);
        formCadastro.parentNode.replaceChild(formClone, formCadastro);
        const newFormCadastro = document.getElementById("formCadastroColaborador");
        
        newFormCadastro.addEventListener('submit', async (event) => {
            event.preventDefault();
            console.log('🔍 Formulário submetido!');
            
            // Evitar submissões múltiplas
            if (formularioSubmetendo) {
                console.log('🔍 Formulário já está sendo submetido, ignorando...');
                return;
            }
            
            formularioSubmetendo = true;
            console.log('🔍 Iniciando submissão do formulário...');

            const nome = document.getElementById("nome").value.trim();
            const email = document.getElementById("email").value.trim();
            const telefone = document.getElementById("telefone").value.trim();
            const cargo = document.getElementById("cargo").value.trim();
            const accessLevel = document.getElementById("accessLevel").value;
            
            // Verificar se o campo de senha existe (apenas para cadastro)
            const campoSenha = document.getElementById("senha");
            const senha = campoSenha ? campoSenha.value : "";

            // Logs para debug dos valores dos campos
            console.log('🔍 Valores dos campos do formulário:');
            console.log('🔍 Nome:', nome);
            console.log('🔍 Email:', email);
            console.log('🔍 Telefone:', telefone);
            console.log('🔍 Cargo:', cargo);
            console.log('🔍 Senha (length):', senha ? senha.length : 0);
            console.log('🔍 Access Level:', accessLevel);
            console.log('🔍 Modo:', colaboradorSelecionadoId ? 'Edição' : 'Cadastro');

            // Validações
            if (!nome || !email || !telefone || !cargo || !accessLevel) {
                console.log('🔍 Validação falhou - campos vazios:', {
                    nome: !!nome,
                    email: !!email,
                    telefone: !!telefone,
                    cargo: !!cargo,
                    accessLevel: !!accessLevel
                });
                formularioSubmetendo = false;
                Swal.fire({
                    title: "Campos Obrigatórios",
                    text: "Por favor, preencha todos os campos.",
                    icon: "warning",
                    confirmButtonColor: "#3085d6"
                });
                return;
            }

            // Só validar senha para cadastro de novo colaborador
            if (!colaboradorSelecionadoId && !senha) {
                console.log('🔍 Validação falhou - senha obrigatória para novo colaborador');
                formularioSubmetendo = false;
                Swal.fire({
                    title: "Senha Obrigatória",
                    text: "Por favor, digite uma senha para o novo colaborador.",
                    icon: "warning",
                    confirmButtonColor: "#3085d6"
                });
                return;
            }

            // Validar senha se for cadastro (novo colaborador)
            if (!colaboradorSelecionadoId) {
                if (!senha || senha.length < 6) {
                    console.log('🔍 Validação falhou - senha inválida para novo colaborador');
                    formularioSubmetendo = false;
                    Swal.fire({
                        title: "Senha Inválida",
                        text: "A senha deve ter pelo menos 6 caracteres.",
                        icon: "warning",
                        confirmButtonColor: "#3085d6"
                    });
                    return;
                }
            }

            try {
                const url = colaboradorSelecionadoId 
                    ? `${API_URL}/collaborators/${colaboradorSelecionadoId}`
                    : `${API_URL}/collaborators`;

                const method = colaboradorSelecionadoId ? 'PUT' : 'POST';
                const body = {
                    name: nome,
                    email: email,
                    phone: telefone,
                    position: cargo,
                    accessLevel: accessLevel
                };

                // Só inclui a senha se estiver preenchida (edição) ou for novo colaborador
                if (senha) {
                    body.password = senha;
                }

                console.log('🔍 Enviando requisição:', {
                    url: url,
                    method: method,
                    body: body,
                    colaboradorSelecionadoId: colaboradorSelecionadoId
                });

                // Log detalhado da requisição
                console.log('📡 URL da requisição:', url);
                console.log('📡 Método:', method);
                console.log('📡 Body da requisição:', JSON.stringify(body, null, 2));

                const response = await fetchComToken(url, {
                    method: method,
                    body: JSON.stringify(body)
                });

                console.log('🔍 Resposta recebida:', {
                    status: response.status,
                    ok: response.ok,
                    statusText: response.statusText
                });

                // Log da resposta completa para debug
                const responseText = await response.text();
                console.log('📡 Resposta completa:', responseText);

                if (!response || !response.ok) {
                    let errorMsg = 'Erro ao salvar colaborador';
                    
                    // Verificar se é erro de permissão
                    if (response && response.status === 403) {
                        const isUsuarioSuperior = localStorage.getItem('isUsuarioSuperior') === 'true';
                        const usuarioLogado = localStorage.getItem('usuarioLogado');
                        
                        errorMsg = 'Você não tem permissão para criar/editar colaboradores. Apenas usuários com nível SUPERIOR podem realizar esta ação.';
                    } else if (response) {
                        try {
                            // Tentar parsear a resposta como JSON
                            const errorData = JSON.parse(responseText);
                            errorMsg = errorData.error || errorData.message || errorMsg;
                        } catch (e) {
                            // Se não for JSON, usar o texto da resposta
                            if (responseText) errorMsg = responseText;
                        }
                    } else {
                        errorMsg = 'Falha na comunicação com o servidor. Verifique suas permissões ou se o servidor está online.';
                    }
                    throw new Error(errorMsg);
                }

                console.log('🔍 Sucesso! Colaborador salvo com sucesso');

                await Swal.fire({
                    title: colaboradorSelecionadoId ? "Atualizado!" : "Cadastrado!",
                    text: colaboradorSelecionadoId 
                        ? "Colaborador atualizado com sucesso."
                        : "Colaborador cadastrado com sucesso.",
                    icon: "success",
                    timer: 1500,
                    showConfirmButton: false
                });

                // Limpar formulário e fechar modal
                newFormCadastro.reset();
                modalColaborador.style.display = "none";
                colaboradorSelecionadoId = null;
                modalColaborador.querySelector("h2").textContent = "Cadastrar Novo Colaborador";

                // Mostrar campo de senha para cadastro
                const campoSenhaCadastro = document.getElementById('campoSenhaCadastro');
                if (campoSenhaCadastro) {
                    campoSenhaCadastro.style.display = 'block';
                }
                
                // Ocultar botão de alterar senha no cadastro
                const btnAlterarSenha = document.getElementById('btnAlterarSenha');
                if (btnAlterarSenha) {
                    btnAlterarSenha.style.display = 'none';
                }

                // Recarregar lista
                await carregarColaboradores();

            } catch (error) {
                console.log('🔍 Erro capturado no formulário:', error);
                console.log('🔍 Stack trace:', error.stack);
                Swal.fire({
                    title: "Erro!",
                    text: error.message || "Não foi possível salvar o colaborador.",
                    icon: "error",
                    confirmButtonColor: "#d33"
                });
            } finally {
                // Sempre resetar a flag ao final
                formularioSubmetendo = false;
                console.log('🔍 Submissão do formulário finalizada');
            }
        });
        
        console.log('✅ Formulário de cadastro configurado com sucesso!');
    } else {
        console.error('❌ Formulário de cadastro não encontrado!');
    }
    
    // Botão FAB para adicionar colaborador
    const fabAddColaborador = document.getElementById("fabAddColaborador");
    if (fabAddColaborador) {
        console.log('🔍 Configurando botão FAB para adicionar colaborador...');
        fabAddColaborador.addEventListener("click", () => {
            // Verificar se o usuário tem permissão de SUPERIOR
            const isUsuarioSuperior = localStorage.getItem('isUsuarioSuperior') === 'true';
            
            if (!isUsuarioSuperior) {
                Swal.fire({
                    title: "Acesso Negado",
                    text: "Você não tem permissão para criar colaboradores. Apenas usuários com nível SUPERIOR podem realizar esta ação.",
                    icon: "warning",
                    confirmButtonColor: "#3085d6"
                });
                return;
            }
            
            // Abrir modal corretamente
            modalColaborador.style.display = "flex";
            modalColaborador.style.zIndex = "9999";
            modalColaborador.removeAttribute('aria-hidden');
            formCadastro.reset();
            colaboradorSelecionadoId = null;
            modalColaborador.querySelector("h2").textContent = "Cadastrar Novo Colaborador";
            
            // Mostrar campo de senha para cadastro
            const campoSenhaCadastro = document.getElementById('campoSenhaCadastro');
            if (campoSenhaCadastro) {
                campoSenhaCadastro.style.display = 'block';
            }
            
            // Ocultar botão de alterar senha no cadastro
            const btnAlterarSenha = document.getElementById('btnAlterarSenha');
            if (btnAlterarSenha) {
                btnAlterarSenha.style.display = 'none';
            }
        });
        console.log('✅ Botão FAB configurado com sucesso!');
    } else {
        console.error('❌ Botão FAB não encontrado!');
    }

    // 🔹 Abrir e fechar sidebar
    if (menuToggle) {
        menuToggle.addEventListener("click", () => {
            sidebar.classList.toggle("open");
        });
    }

    // Event listener para fechar modal de edição
    const fecharModalBtn = document.getElementById('fecharModal');
    if (fecharModalBtn) {
        fecharModalBtn.addEventListener('click', fecharModalEdicao);
    }
    
    // Event listener para fechar modal de alteração de senha
    const fecharModalSenhaBtn = document.getElementById('fecharModalSenha');
    if (fecharModalSenhaBtn) {
        fecharModalSenhaBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            fecharModalAlterarSenha();
        });
    }
    
    const cancelarAlterarSenhaBtn = document.getElementById('cancelarAlterarSenha');
    if (cancelarAlterarSenhaBtn) {
        cancelarAlterarSenhaBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            fecharModalAlterarSenha();
        });
    }
    
    // Event listener para formulário de alteração de senha
    const formAlterarSenha = document.getElementById('formAlterarSenha');
    if (formAlterarSenha) {
        formAlterarSenha.addEventListener('submit', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const senhaAtual = document.getElementById('senhaAtual').value;
            const novaSenha = document.getElementById('novaSenha').value;
            const confirmarNovaSenha = document.getElementById('confirmarNovaSenha').value;
            
            console.log('🔐 Formulário de alteração de senha submetido');
            console.log('🔐 ID do colaborador:', window.colaboradorAlterandoSenhaId);
            console.log('🔐 Senha atual (length):', senhaAtual ? senhaAtual.length : 0);
            console.log('🔐 Nova senha (length):', novaSenha ? novaSenha.length : 0);
            console.log('🔐 Confirmar nova senha (length):', confirmarNovaSenha ? confirmarNovaSenha.length : 0);
            
            // Validações
            if (!senhaAtual || !novaSenha || !confirmarNovaSenha) {
                console.log('🔐 Validação falhou: campos vazios');
                Swal.fire({
                    title: "Campos Obrigatórios",
                    text: "Por favor, preencha todos os campos.",
                    icon: "warning",
                    confirmButtonColor: "#3085d6"
                });
                return;
            }
            
            if (novaSenha !== confirmarNovaSenha) {
                console.log('🔐 Validação falhou: senhas não coincidem');
                Swal.fire({
                    title: "Senhas Diferentes",
                    text: "A nova senha e a confirmação não coincidem.",
                    icon: "error",
                    confirmButtonColor: "#d33"
                });
                return;
            }
            
            if (novaSenha.length < 6) {
                console.log('🔐 Validação falhou: senha muito curta');
                Swal.fire({
                    title: "Senha Muito Curta",
                    text: "A nova senha deve ter pelo menos 6 caracteres.",
                    icon: "warning",
                    confirmButtonColor: "#3085d6"
                });
                return;
            }
            
            if (senhaAtual === novaSenha) {
                console.log('🔐 Validação falhou: nova senha igual à atual');
                Swal.fire({
                    title: "Senha Inválida",
                    text: "A nova senha deve ser diferente da senha atual.",
                    icon: "warning",
                    confirmButtonColor: "#3085d6"
                });
                return;
            }
            
            console.log('🔐 Validações passaram, iniciando alteração de senha...');
            
            // Mostrar loading
            Swal.fire({
                title: "Alterando Senha...",
                text: "Aguarde enquanto processamos sua solicitação.",
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });
            
            try {
                await alterarSenhaColaborador(window.colaboradorAlterandoSenhaId, senhaAtual, novaSenha);
                
                Swal.fire({
                    title: "Sucesso!",
                    text: "Senha alterada com sucesso!",
                    icon: "success",
                    timer: 2000,
                    showConfirmButton: false
                });
                
                fecharModalAlterarSenha();
            } catch (error) {
                console.log('🔐 Erro capturado no formulário:', error);
                
                Swal.fire({
                    title: "Erro ao Alterar Senha",
                    text: error.message || "Não foi possível alterar a senha. Verifique os dados e tente novamente.",
                    icon: "error",
                    confirmButtonColor: "#d33"
                });
            }
        });
    }
    
    // Funcionalidade de mostrar/ocultar senha
    const setupPasswordToggles = () => {
        const toggles = document.querySelectorAll('.toggle-password');
        toggles.forEach(toggle => {
            toggle.addEventListener('click', function() {
                const input = this.previousElementSibling;
                const type = input.getAttribute('type');
                
                if (type === 'password') {
                    input.setAttribute('type', 'text');
                    this.classList.remove('fa-eye');
                    this.classList.add('fa-eye-slash');
                } else {
                    input.setAttribute('type', 'password');
                    this.classList.remove('fa-eye-slash');
                    this.classList.add('fa-eye');
                }
            });
        });
    };
    
    // Configurar toggles de senha
    setupPasswordToggles();

    // Detectar quando a página volta a ficar visível (quando o usuário volta de outra tela)
    let visibilityTimeout;
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            clearTimeout(visibilityTimeout);
            visibilityTimeout = setTimeout(() => {
                console.log('🔍 Página voltou a ficar visível, reaplicando event listeners...'); // Debug
                reaplicarEventListeners();
            }, 500); // Delay maior para evitar múltiplas execuções
        }
    });
    
    // Também detectar quando a janela ganha foco
    let focusTimeout;
    window.addEventListener('focus', () => {
        clearTimeout(focusTimeout);
        focusTimeout = setTimeout(() => {
            console.log('🔍 Janela ganhou foco, reaplicando event listeners...'); // Debug
            reaplicarEventListeners();
        }, 500); // Delay maior para evitar múltiplas execuções
    });
    
    console.log('🚀 Configuração concluída com sucesso!');
});
