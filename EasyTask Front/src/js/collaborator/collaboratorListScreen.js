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
        return Date.now() >= expirationTime;
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
        const refreshResp = await fetch('http://localhost:8080/collaborators/refresh', {
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
        if (!data.accessToken || !data.refreshToken) {
            throw new Error('Resposta inválida do servidor');
        }

        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
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
    const MAX_TENTATIVAS = 3;
    
    if (!token) {
        try {
            token = await renovarToken();
        } catch (error) {
            console.error('Não foi possível renovar o token:', error);
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

            const response = await fetch(url, {
                ...options,
                headers: {
                    ...(options.headers || {}),
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            if (response.ok) {
                return response;
            }

            if (response.status === 401 || response.status === 403) {
                token = await renovarToken();
                tentativas++;
                continue;
            }

            throw new Error(`Erro na requisição: ${response.status}`);
        } catch (error) {
            console.error('Erro na requisição:', error);
            if (error.message === 'Refresh token inválido ou expirado' || tentativas >= MAX_TENTATIVAS - 1) {
                localStorage.clear();
                Swal.fire({
                    title: "Sessão expirada",
                    text: "Sua sessão expirou ou você não tem permissão. Faça login novamente.",
                    icon: "warning",
                    confirmButtonText: "OK"
                });
                throw new Error('Sessão expirada ou sem permissão');
            }
            tentativas++;
        }
    }
};

// Funções de manipulação do DOM
const renderizarColaborador = (colaborador) => {
    const card = document.createElement("div");
    card.className = "profile-card";
    card.innerHTML = `
        <p>${colaborador.name}</p>
        <div class="buttons-container">
            <button class="view-btn" data-id="${colaborador.id_collaborator}">Visualizar</button>
            <button class="edit-btn" data-id="${colaborador.id_collaborator}">Editar</button>
            <button class="delete-btn" data-id="${colaborador.id_collaborator}">Excluir</button>
        </div>
    `;

    // Event listeners para os botões
    card.querySelector('.view-btn').addEventListener('click', () => visualizarColaborador(colaborador.id_collaborator));
    card.querySelector('.edit-btn').addEventListener('click', () => editarColaborador(colaborador.id_collaborator));
    card.querySelector('.delete-btn').addEventListener('click', () => excluirColaborador(colaborador.id_collaborator));
    
    // Duplo clique para ver tarefas
    card.addEventListener("dblclick", () => {
        window.location.href = `../task/taskListScreen.html?colaboradorId=${colaborador.id_collaborator}`;
    });

    return card;
};

const renderizarColaboradores = (listaColaboradores = colaboradores) => {
    profileGrid.innerHTML = "";

    if (listaColaboradores.length === 0) {
        profileGrid.innerHTML = `
            <div class="mensagem-vazia">
                <i class="fas fa-user-times"></i>
                <p>Nenhum colaborador encontrado.</p>
            </div>
        `;
        return;
    }

    listaColaboradores.forEach(colaborador => {
        profileGrid.appendChild(renderizarColaborador(colaborador));
    });
};

// Funções de manipulação de dados
const carregarColaboradores = async () => {
    try {
        const response = await fetchComToken('http://localhost:8080/collaborators');
        if (!response.ok) throw new Error('Erro ao carregar colaboradores');
        
        colaboradores = await response.json();
        renderizarColaboradores();
    } catch (error) {
        console.error('Erro ao carregar colaboradores:', error);
        Swal.fire({
            title: "Erro!",
            text: "Não foi possível carregar os colaboradores.",
            icon: "error",
            confirmButtonColor: "#d33"
        });
    }
};

const visualizarColaborador = async (id) => {
    try {
        const colaborador = colaboradores.find(c => c.id_collaborator === id);
        if (!colaborador) throw new Error('Colaborador não encontrado');

        document.getElementById("detalheNome").textContent = `Nome: ${colaborador.name}`;
        document.getElementById("detalheEmail").textContent = `Email: ${colaborador.email}`;
        document.getElementById("detalheTelefone").textContent = `Telefone: ${colaborador.phone}`;
        document.getElementById("detalheCargo").textContent = `Cargo: ${colaborador.position}`;

        modalVisualizar.style.display = "flex";
    } catch (error) {
        Swal.fire({
            title: "Erro!",
            text: error.message,
            icon: "error",
            confirmButtonColor: "#d33"
        });
    }
};

const editarColaborador = async (id) => {
    try {
        const colaborador = colaboradores.find(c => c.id_collaborator === id);
        if (!colaborador) throw new Error('Colaborador não encontrado');

        colaboradorSelecionadoId = id;
        document.getElementById("nome").value = colaborador.name;
        document.getElementById("email").value = colaborador.email;
        document.getElementById("telefone").value = colaborador.phone;
        document.getElementById("cargo").value = colaborador.position;
        document.getElementById("accessLevel").value = colaborador.access_level;
        document.getElementById("senha").value = ""; // Não preenchemos a senha por segurança

        modalColaborador.querySelector("h2").textContent = "Editar Colaborador";
        modalColaborador.style.display = "flex";
    } catch (error) {
        Swal.fire({
            title: "Erro!",
            text: error.message,
            icon: "error",
            confirmButtonColor: "#d33"
        });
    }
};

const excluirColaborador = async (id) => {
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

        const response = await fetchComToken(`http://localhost:8080/collaborators/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Erro ao excluir colaborador');

        await Swal.fire({
            title: "Excluído!",
            text: "Colaborador excluído com sucesso.",
            icon: "success",
            timer: 1500,
            showConfirmButton: false
        });

        await carregarColaboradores();
    } catch (error) {
        Swal.fire({
            title: "Erro!",
            text: error.message || "Não foi possível excluir o colaborador.",
            icon: "error",
            confirmButtonColor: "#d33"
        });
    }
};

// Event Listeners
document.addEventListener("DOMContentLoaded", () => {
    // Controle de tema - Padronizado para todo o sistema
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        // Verifica se há um tema salvo e aplica
        const savedTheme = localStorage.getItem('theme') || 'dark';
        if (savedTheme === 'light') {
            document.body.classList.add('light-theme');
        } else {
            document.body.classList.remove('light-theme');
        }
        updateThemeIcon(savedTheme);

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
            updateThemeIcon(newTheme);
        });
    }

    // Carregar colaboradores
    carregarColaboradores();

    // Pesquisa
    if (searchBar) {
        searchBar.addEventListener("input", () => {
            const termo = searchBar.value.toLowerCase();
            const resultados = colaboradores.filter(colaborador => 
                colaborador.name.toLowerCase().includes(termo)
            );
            renderizarColaboradores(resultados);
        });
    }

    // Fechar modais
    if (fecharModal) {
        fecharModal.addEventListener("click", () => {
            modalColaborador.style.display = "none";
            formCadastro.reset();
            colaboradorSelecionadoId = null;
            modalColaborador.querySelector("h2").textContent = "Cadastrar Novo Colaborador";
        });
    }

    if (fecharVisualizar) {
        fecharVisualizar.addEventListener("click", () => {
            modalVisualizar.style.display = "none";
        });
    }

    // Form de cadastro/edição
    if (formCadastro) {
        formCadastro.addEventListener('submit', async (event) => {
            event.preventDefault();

            const nome = document.getElementById("nome").value.trim();
            const email = document.getElementById("email").value.trim();
            const telefone = document.getElementById("telefone").value.trim();
            const cargo = document.getElementById("cargo").value.trim();
            const senha = document.getElementById("senha").value;
            const accessLevel = document.getElementById("accessLevel").value;

            // Validações
            if (!nome || !email || !telefone || !cargo || !accessLevel) {
                Swal.fire({
                    title: "Campos Obrigatórios",
                    text: "Por favor, preencha todos os campos.",
                    icon: "warning",
                    confirmButtonColor: "#3085d6"
                });
                return;
            }

            if (!colaboradorSelecionadoId && !senha) {
                Swal.fire({
                    title: "Senha Obrigatória",
                    text: "Por favor, digite uma senha para o novo colaborador.",
                    icon: "warning",
                    confirmButtonColor: "#3085d6"
                });
                return;
            }

            try {
                const url = colaboradorSelecionadoId 
                    ? `http://localhost:8080/collaborators/${colaboradorSelecionadoId}`
                    : 'http://localhost:8080/collaborators';

                const method = colaboradorSelecionadoId ? 'PUT' : 'POST';
                const body = {
                    name: nome,
                    email: email,
                    phone: telefone,
                    position: cargo,
                    access_level: accessLevel
                };

                // Só inclui a senha se estiver preenchida (edição) ou for novo colaborador
                if (senha) {
                    body.password = senha;
                }

                console.log('🔍 Dados enviados para o backend:', body);

                const response = await fetchComToken(url, {
                    method: method,
                    body: JSON.stringify(body)
                });

                if (!response.ok) {
                    let errorMsg = 'Erro ao salvar colaborador';
                    try {
                        const errorData = await response.json();
                        errorMsg = errorData.error || errorData.message || errorMsg;
                    } catch (e) {
                        const errorText = await response.text();
                        if (errorText) errorMsg = errorText;
                    }
                    throw new Error(errorMsg);
                }

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
                formCadastro.reset();
                modalColaborador.style.display = "none";
                colaboradorSelecionadoId = null;
                modalColaborador.querySelector("h2").textContent = "Cadastrar Novo Colaborador";

                // Recarregar lista
                await carregarColaboradores();

            } catch (error) {
                Swal.fire({
                    title: "Erro!",
                    text: error.message || "Não foi possível salvar o colaborador.",
                    icon: "error",
                    confirmButtonColor: "#d33"
                });
            }
        });
    }

    // Botão FAB para adicionar colaborador
    const fabAddColaborador = document.getElementById("fabAddColaborador");
    if (fabAddColaborador) {
        fabAddColaborador.addEventListener("click", () => {
            modalColaborador.style.display = "flex";
            formCadastro.reset();
            colaboradorSelecionadoId = null;
            modalColaborador.querySelector("h2").textContent = "Cadastrar Novo Colaborador";
        });
    }

    // 🔹 Abrir e fechar sidebar
    if (menuToggle) {
        menuToggle.addEventListener("click", () => {
            sidebar.classList.toggle("open");
        });
    }
});
