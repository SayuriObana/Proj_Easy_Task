// Verifica se o usuário está logado e é superior
document.addEventListener("DOMContentLoaded", async () => {
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

    // Verificar se a configuração da API está disponível
    if (!window.API_CONFIG) {
        console.error('Configuração da API não está disponível');
        return;
    }

    // Verificar autenticação usando AuthManager
    if (!window.authManager) {
        console.error('AuthManager não está disponível');
        window.location.href = '../login/loginSystem.html';
        return;
    }

    try {
        const autenticado = await window.authManager.checkAuthAndRedirect();
        if (!autenticado) return;

        // Verificar se o usuário é superior
        const isUsuarioSuperior = StorageUtils ? 
            StorageUtils.isSuperiorUser() : 
            localStorage.getItem("isUsuarioSuperior") === "true";

    // Esconde os botões de edição e exclusão se não for usuário superior
    if (!isUsuarioSuperior) {
        document.querySelectorAll('.quadro-actions').forEach(actions => {
            actions.style.display = 'none';
        });
    }

    // Event Listeners
    const btnNovoQuadro = document.getElementById('btnNovoQuadro');
    if (btnNovoQuadro) {
        btnNovoQuadro.addEventListener('click', abrirModalNovoQuadro);
    }

    const closeModal = document.getElementById('closeModal');
    if (closeModal) {
        closeModal.addEventListener('click', fecharModalNovoQuadro);
    }

    const btnCriarQuadro = document.getElementById('btnCriarQuadro');
    if (btnCriarQuadro) {
        btnCriarQuadro.addEventListener('click', criarQuadro);
    }

        await carregarQuadros();
    } catch (error) {
        console.error('Erro ao inicializar:', error);
        Swal.fire('Erro', 'Não foi possível inicializar a página.', 'error');
    }
});

async function carregarQuadros() {
    try {
        const response = await window.authManager.fetchWithAuth(
            `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.BOARDS}`
        );
        
        if (!response.ok) throw new Error('Erro ao buscar quadros');
        
        const boards = await response.json();
        renderizarQuadros(boards);
        
        // Esconde o loader após carregar os quadros
        const loader = document.getElementById('loader');
        if (loader) loader.style.display = 'none';
        
        // Esconde a tela preta de transição
        const telaPreta = document.getElementById('telaPretaTransicao');
        if (telaPreta) telaPreta.style.display = 'none';
    } catch (error) {
        console.error('Erro ao carregar quadros:', error);
        Swal.fire('Erro', 'Não foi possível carregar os quadros.', 'error');
    }
}

async function criarQuadro() {
    const nome = document.getElementById("nomeNovoQuadro").value.trim();
    if (!nome) {
        Swal.fire("Campo Obrigatório", "Digite o nome do quadro!", "warning");
        return;
    }

    const colaboradoresSelecionados = getColaboradoresSelecionados();
    if (colaboradoresSelecionados.length === 0) {
        Swal.fire("Atenção", "Selecione pelo menos um colaborador para o quadro!", "warning");
        return;
    }

    try {
        const response = await window.authManager.fetchWithAuth(
            `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.BOARDS}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: nome,
                    collaboratorIds: colaboradoresSelecionados
                })
            }
        );

        if (!response.ok) throw new Error('Erro ao criar quadro');

        await Swal.fire("Sucesso!", "Quadro criado com sucesso!", "success");
        fecharModalNovoQuadro();
        await carregarQuadros();
    } catch (error) {
        console.error('Erro ao criar quadro:', error);
        Swal.fire("Erro", "Não foi possível criar o quadro.", "error");
    }
}

function renderizarQuadros(boards) {
    const container = document.querySelector('.quadro-container');
    if (!container) {
        console.error('Container de quadros não encontrado');
        return;
    }
    
    container.innerHTML = '';
    
    boards.forEach(board => {
        const div = document.createElement('div');
        div.className = 'quadro';
        div.innerHTML = `
            <div class="quadro-header">
                <h3>${board.name}</h3>
            </div>
            <div class="quadro-info">
                <p>Fases: ${board.phases ? board.phases.length : 0}</p>
                <p>Tarefas: ${board.tasks ? board.tasks.length : 0}</p>
                <p>Colaboradores: ${board.collaborators ? board.collaborators.length : 0}</p>
            </div>
            <button class="btn-entrar-quadro" data-id="${board.id}">Entrar no quadro</button>
            ${StorageUtils ? StorageUtils.isSuperiorUser() : localStorage.getItem("isUsuarioSuperior") === "true" ? `
                <div class="quadro-actions">
                    <button class="btn-editar-quadro" data-id="${board.id}">Editar</button>
                <button class="btn-excluir-quadro" data-id="${board.id}">Excluir</button>
                </div>
            ` : ''}
        `;

        // Event listeners
        div.querySelector('.btn-entrar-quadro').addEventListener('click', () => {
            window.location.href = `../task/taskListScreen.html?id=${board.id}`;

        });

        if (StorageUtils ? StorageUtils.isSuperiorUser() : localStorage.getItem("isUsuarioSuperior") === "true") {
            const btnEditar = div.querySelector('.btn-editar-quadro');
            const btnExcluir = div.querySelector('.btn-excluir-quadro');
            if (btnEditar) btnEditar.addEventListener('click', () => editarQuadro(board));
            if (btnExcluir) btnExcluir.addEventListener('click', () => excluirQuadro(board.id));
        }

        container.appendChild(div);
    });
}

async function excluirQuadro(id) {
    const result = await Swal.fire({
        title: 'Excluir Quadro?',
        text: 'Essa ação não pode ser desfeita!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#FFD700',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sim, excluir',
        cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
        try {
            const response = await window.authManager.fetchWithAuth(
                `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.BOARDS}/${id}`,
                { method: 'DELETE' }
            );

            if (!response.ok) throw new Error('Erro ao excluir quadro');
            
            await Swal.fire('Excluído!', 'Quadro removido com sucesso.', 'success');
            await carregarQuadros();
        } catch (error) {
            console.error('Erro ao excluir quadro:', error);
            Swal.fire('Erro', 'Não foi possível excluir o quadro.', 'error');
        }
    }
}

async function editarQuadro(board) {
    const { value: novoNome } = await Swal.fire({
        title: 'Editar Quadro',
        input: 'text',
        inputLabel: 'Novo nome do quadro',
        inputValue: board.name,
        showCancelButton: true,
        inputValidator: (value) => {
            if (!value) return 'Digite um nome para o quadro!';
        }
    });

    if (novoNome) {
        try {
            const response = await window.authManager.fetchWithAuth(
                `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.BOARDS}/${board.id}`,
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: novoNome,
                        collaboratorIds: board.collaborators.map(c => c.id_collaborator)
                    })
                }
            );

            if (!response.ok) throw new Error('Erro ao atualizar quadro');
            
            await Swal.fire('Sucesso!', 'Quadro atualizado com sucesso.', 'success');
            await carregarQuadros();
        } catch (error) {
            console.error('Erro ao atualizar quadro:', error);
            Swal.fire('Erro', 'Não foi possível atualizar o quadro.', 'error');
        }
    }
}

function abrirModalNovoQuadro() {
    const isUsuarioSuperior = localStorage.getItem("isUsuarioSuperior") === "true";
    if (!isUsuarioSuperior) {
        Swal.fire({
            title: "Acesso Restrito",
            text: "Apenas usuários superiores podem criar quadros.",
            icon: "warning",
            confirmButtonColor: "#3085d6"
        });
        return;
    }
    document.getElementById("modalNovoQuadro").style.display = "flex";
    carregarColaboradoresNoModal();
}

function fecharModalNovoQuadro() {
    document.getElementById("modalNovoQuadro").style.display = "none";
    document.getElementById("nomeNovoQuadro").value = "";
    const checkboxes = document.querySelectorAll('#collaboratorsList input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = false);
}

function getColaboradoresSelecionados() {
    const checkboxes = document.querySelectorAll('#collaboratorsList input[type="checkbox"]:checked');
    return Array.from(checkboxes).map(cb => parseInt(cb.value));
}

async function carregarColaboradoresNoModal() {
    try {
        const response = await window.authManager.fetchWithAuth(
            `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.COLLABORATORS}`
        );
        
        if (!response.ok) throw new Error('Erro ao buscar colaboradores');
        
        const colaboradores = await response.json();
        const lista = document.getElementById('collaboratorsList');
        if (!lista) {
            console.error('Lista de colaboradores não encontrada');
            return;
        }
        
        lista.innerHTML = colaboradores.map(col => `
            <div class="collaborator-item">
                <input type="checkbox" id="col_${col.id_collaborator}" value="${col.id_collaborator}">
                <label for="col_${col.id_collaborator}">${col.name}</label>
            </div>
        `).join('');
    } catch (error) {
        console.error('Erro ao carregar colaboradores:', error);
        Swal.fire('Erro', 'Não foi possível carregar a lista de colaboradores.', 'error');
    }
}

function alternarTema() {
  const body = document.body;
  if (body.classList.contains("modo-escuro")) {
    body.classList.remove("modo-escuro");
    body.classList.add("modo-claro");
  } else {
    body.classList.remove("modo-claro");
    body.classList.add("modo-escuro");
  }
}

let quadroSelecionado = null; // Guarda o quadro onde vai adicionar o estágio

function abrirModalNovoEstagio(botao) {
  quadroSelecionado = botao.parentElement.querySelector(".estagios");
  document.getElementById("modalNovoEstagio").style.display = "block";
}

function fecharModalNovoEstagio() {
  document.getElementById("modalNovoEstagio").style.display = "none";
}

function criarEstagio() {
  const nome = document.getElementById("nomeNovoEstagio").value.trim();
  if (!nome) {
    alert("Digite o nome do estágio!");
    return;
  }

  const novoEstagio = document.createElement("div");
  novoEstagio.className = "estagio";
  novoEstagio.textContent = nome;

  quadroSelecionado.appendChild(novoEstagio);

  fecharModalNovoEstagio();
  document.getElementById("nomeNovoEstagio").value = "";
}

function editarNomeQuadro(elemento) {
    const isUsuarioSuperior = localStorage.getItem("isUsuarioSuperior") === "true";
    if (!isUsuarioSuperior) {
        Swal.fire({
            title: "Acesso Restrito",
            text: "Apenas usuários superiores podem editar quadros.",
            icon: "warning",
            confirmButtonColor: "#3085d6"
        });
        return;
    }

  const quadroHeader = elemento.closest(".quadro-header");
  const titulo = quadroHeader.querySelector("h3");
    const quadroId = elemento.closest(".quadro").dataset.id;

  const input = document.createElement("input");
  input.type = "text";
  input.value = titulo.textContent;
  input.className = "input-editar-titulo";

  quadroHeader.replaceChild(input, titulo);
  input.focus();

    input.addEventListener("blur", function() {
        const novoNome = input.value.trim();
        if (novoNome) {
            // Atualiza no localStorage
            const quadros = StorageUtils ? 
                StorageUtils.getLocalJSON("quadros", []) : 
                JSON.parse(localStorage.getItem("quadros")) || [];
            const quadroIndex = quadros.findIndex(q => q.id_board === quadroId);
            if (quadroIndex !== -1) {
                quadros[quadroIndex].nome = novoNome;
                StorageUtils ? 
                    StorageUtils.setLocalJSON("quadros", quadros) : 
                    localStorage.setItem("quadros", JSON.stringify(quadros));
            }

            // Atualiza na interface
    const novoTitulo = document.createElement("h3");
            novoTitulo.textContent = novoNome;
    quadroHeader.replaceChild(novoTitulo, input);

            Swal.fire({
                title: "Sucesso!",
                text: "Nome do quadro atualizado!",
                icon: "success",
                confirmButtonColor: "#28a745",
                timer: 1500,
                showConfirmButton: false
            });
        } else {
            quadroHeader.replaceChild(titulo, input);
        }
  });

    input.addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
      input.blur();
    }
  });
}

function excluirQuadro(botao) {
    const isUsuarioSuperior = localStorage.getItem("isUsuarioSuperior") === "true";
    if (!isUsuarioSuperior) {
        Swal.fire({
            title: "Acesso Restrito",
            text: "Apenas usuários superiores podem excluir quadros.",
            icon: "warning",
            confirmButtonColor: "#3085d6"
        });
        return;
    }

  const quadro = botao.closest(".quadro");
  const id = quadro.dataset.id;

  Swal.fire({
    title: 'Tem certeza?',
    text: "Esta ação não poderá ser desfeita!",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Sim, excluir!',
    cancelButtonText: 'Cancelar'
  }).then((result) => {
    if (result.isConfirmed) {
            // Remove do localStorage
      let quadros = StorageUtils ? 
          StorageUtils.getLocalJSON("quadros", []) : 
          JSON.parse(localStorage.getItem("quadros")) || [];
      quadros = quadros.filter(q => q.id_board !== id);
      StorageUtils ? 
          StorageUtils.setLocalJSON("quadros", quadros) : 
          localStorage.setItem("quadros", JSON.stringify(quadros));

            // Remove da interface
      quadro.remove();

            Swal.fire({
                title: 'Excluído!',
                text: 'O quadro foi removido com sucesso.',
                icon: 'success',
                confirmButtonColor: '#28a745',
                timer: 1500,
                showConfirmButton: false
            });
    }
  });
}

document.addEventListener('DOMContentLoaded', carregarQuadros);

/* Início do arquivo (board.js) – Adicionar trecho para salvar token e refreshToken no localStorage */

// Ao carregar a tela, verifica se o token e refreshToken já estão salvos no localStorage.
// Caso não estejam, salva (por exemplo, copiando de sessionStorage ou de um cookie, se disponível).
// (Observe que, em geral, o token é salvo na tela de login, mas essa verificação garante que todas as telas salvem o token.)
(function () {
  if (!StorageUtils ? !localStorage.getItem("accessToken") : !StorageUtils.getToken()) {
    const token = StorageUtils ? 
        StorageUtils.getSessionItem("accessToken") : 
        sessionStorage.getItem("accessToken");
    if (token) StorageUtils ? 
        StorageUtils.setToken(token) : 
        localStorage.setItem("accessToken", token);
  }
  if (!StorageUtils ? !localStorage.getItem("refreshToken") : !StorageUtils.getRefreshToken()) {
    const refreshToken = StorageUtils ? 
        StorageUtils.getSessionItem("refreshToken") : 
        sessionStorage.getItem("refreshToken");
    if (refreshToken) StorageUtils ? 
        StorageUtils.setRefreshToken(refreshToken) : 
        localStorage.setItem("refreshToken", refreshToken);
  }
})();

async function carregarFasesDoQuadro(quadroId) {
    try {
        const response = await window.authManager.fetchWithAuth(
            `${API_CONFIG.BASE_URL}/boards/${quadroId}/phases`
        );

        if (!response.ok) throw new Error("Erro ao buscar fases do quadro");

        const fases = await response.json();
        const select = document.getElementById("fase");
        if (!select) return;

        select.innerHTML = '';
        fases.forEach(fase => {
            const option = document.createElement("option");
            option.value = fase.id_phase;
            option.textContent = fase.name;
            select.appendChild(option);
        });

    } catch (error) {
        console.error("Erro ao carregar fases do quadro:", error);
        Swal.fire("Erro", "Não foi possível carregar as fases deste quadro.", "error");
    }
}

function abrirModalNovaTarefa() {
    const urlParams = new URLSearchParams(window.location.search);
    const quadroId = urlParams.get('id'); // Pega o ID do quadro atual pela URL

    if (!quadroId) {
        Swal.fire("Erro", "ID do quadro não encontrado na URL.", "error");
        return;
    }

    carregarFasesDoQuadro(quadroId); // Aqui carrega as fases vinculadas ao quadro correto
    document.getElementById("modalNovaTarefa").style.display = "flex"; // Abre o modal
}





