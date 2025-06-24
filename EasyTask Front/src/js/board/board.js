// Função para fazer requisições com token de autenticação
async function fetchComToken(url, options = {}) {
    const token = localStorage.getItem('accessToken');
    const defaultOptions = {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...options.headers
        }
    };
    return fetch(url, { ...defaultOptions, ...options });
}

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

let modalEditar = null;
let inputNomeEditar = null;
let idQuadroEditando = null;
let colaboradoresCache = [];

function criarModalEditarQuadro() {
    if (document.getElementById('modal-editar-quadro')) return; // já existe
    const modal = document.createElement('div');
    modal.id = 'modal-editar-quadro';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.background = 'rgba(0,0,0,0.5)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = '9999';
    modal.innerHTML = `
        <div style="background:#222;padding:24px 32px;border-radius:8px;min-width:400px;max-width:90vw;max-height:80vh;overflow-y:auto;box-shadow:0 2px 16px #000">
            <h2 style="color:#ffd700;margin-bottom:16px;">Editar Quadro</h2>
            <label for="input-nome-editar" style="color:#fff;font-weight:bold;">Nome:</label>
            <input id="input-nome-editar" type="text" style="width:100%;margin:8px 0 16px 0;padding:8px;border-radius:4px;border:1px solid #ccc;" />
            <div style="margin: 16px 0;">
                <h3 style="color:#ffd700;margin-bottom:12px;font-size:16px;">Colaboradores Vinculados:</h3>
                <div id="colaboradoresContainer" style="max-height:200px;overflow-y:auto;border:1px solid #444;padding:12px;border-radius:4px;background:#333;"></div>
            </div>
            <div style="display:flex;gap:8px;justify-content:flex-end;">
                <button id="btn-cancelar-editar" style="padding:8px 16px;border-radius:4px;border:none;background:#888;color:#fff;cursor:pointer;">Cancelar</button>
                <button id="btn-salvar-editar" style="padding:8px 16px;border-radius:4px;border:none;background:#ffd700;color:#222;font-weight:bold;cursor:pointer;">Salvar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modalEditar = modal;
    inputNomeEditar = document.getElementById('input-nome-editar');
    document.getElementById('btn-cancelar-editar').onclick = fecharModalEditarQuadro;
    document.getElementById('btn-salvar-editar').onclick = salvarEdicaoQuadro;
}

async function abrirModalEditarQuadro(board) {
    criarModalEditarQuadro();
    idQuadroEditando = board.id;
    inputNomeEditar.value = board.name;
    modalEditar.style.display = 'flex';
    inputNomeEditar.focus();

    try {
        // Buscar todos os colaboradores disponíveis
        const respColaboradores = await fetchComToken('http://localhost:8080/collaborators');
        const colaboradores = await respColaboradores.json();
        colaboradoresCache = colaboradores;

        // Usar os colaboradores que já vêm no objeto board
        const colaboradoresVinculados = board.collaborators || [];

        console.log('Colaboradores disponíveis:', colaboradores);
        console.log('Colaboradores vinculados ao board:', colaboradoresVinculados);
        console.log('Board completo:', board);

        // Renderizar usando nomes para comparação (já que board.collaborators contém nomes)
        renderizarColaboradoresNoModal(colaboradores, colaboradoresVinculados);
    } catch (e) {
        console.error('Erro ao carregar colaboradores:', e);
        Swal.fire('Erro', 'Não foi possível carregar os colaboradores.', 'error');
    }
}

function renderizarColaboradoresNoModal(colaboradores, colaboradoresVinculados) {
    const container = document.getElementById('colaboradoresContainer');
    if (!container) return;
    
    if (colaboradores.length === 0) {
        container.innerHTML = '<p style="color:#888;text-align:center;margin:20px 0;">Nenhum colaborador disponível</p>';
        return;
    }
    
    // board.collaborators é um array de nomes, então comparamos por nome
    container.innerHTML = colaboradores.map(colab => {
        const isVinculado = colaboradoresVinculados.includes(colab.name);
        return `
            <label style="display:flex;align-items:center;margin-bottom:8px;padding:6px;border-radius:4px;background:${isVinculado ? '#2a4a2a' : '#333'};cursor:pointer;">
                <input type="checkbox" value="${colab.idCollaborator}" 
                    ${isVinculado ? 'checked' : ''} style="margin-right:8px;">
                <span style="color:#fff;font-size:14px;">${colab.name}</span>
                ${isVinculado ? '<span style="color:#4CAF50;font-size:12px;margin-left:auto;">(Vinculado)</span>' : ''}
            </label>
        `;
    }).join('');
}

async function salvarEdicaoQuadro() {
    const novoNome = inputNomeEditar.value.trim();
    if (!novoNome) {
        if (typeof Swal !== 'undefined') {
            await Swal.fire('Campo Obrigatório', 'O nome não pode ser vazio!', 'warning');
        } else {
            alert('O nome não pode ser vazio!');
        }
        return;
    }

    try {
        const token = localStorage.getItem('accessToken');
        
        // Primeiro, atualiza o nome do board
        const respNome = await fetch(`http://localhost:8080/boards/${idQuadroEditando}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name: novoNome })
        });
        
        if (!respNome.ok) throw new Error('Erro ao atualizar nome do quadro');

        // Pega os checkboxes marcados e não marcados
        const checkboxes = document.querySelectorAll('#colaboradoresContainer input[type=checkbox]');
        const colaboradoresMarcados = Array.from(checkboxes).filter(cb => cb.checked).map(cb => Number(cb.value));
        const colaboradoresDesmarcados = Array.from(checkboxes).filter(cb => !cb.checked).map(cb => Number(cb.value));

        // Adiciona colaboradores marcados
        for (const collaboratorId of colaboradoresMarcados) {
            const respAdd = await fetch(`http://localhost:8080/boards/${idQuadroEditando}/collaborators/${collaboratorId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!respAdd.ok) {
                console.warn(`Erro ao adicionar colaborador ${collaboratorId}`);
            }
        }

        // Remove colaboradores desmarcados
        for (const collaboratorId of colaboradoresDesmarcados) {
            const respRemove = await fetch(`http://localhost:8080/boards/${idQuadroEditando}/collaborators/${collaboratorId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!respRemove.ok) {
                console.warn(`Erro ao remover colaborador ${collaboratorId}`);
            }
        }

        fecharModalEditarQuadro();
        if (typeof Swal !== 'undefined') {
            await Swal.fire({
                title: 'Sucesso!',
                text: 'Quadro editado com sucesso!',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });
        }
        await carregarQuadros();
    } catch (e) {
        console.error('Erro ao salvar edição:', e);
        if (typeof Swal !== 'undefined') {
            Swal.fire('Erro', 'Erro ao salvar edição!', 'error');
        } else {
            alert('Erro ao salvar edição!');
        }
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
            <div class="quadro-actions">
                <button class="btn-editar-quadro" data-id="${board.id}">Editar</button>
                <button class="btn-excluir-quadro" data-id="${board.id}">Excluir</button>
            </div>
        `;

        // Event listeners
        div.querySelector('.btn-entrar-quadro').addEventListener('click', () => {
            window.location.href = `../task/taskListScreen.html?id=${board.id}`;
        });

        // Adiciona funcionalidade ao botão editar
        div.querySelector('.btn-editar-quadro').addEventListener('click', (e) => {
            e.stopPropagation();
            abrirModalEditarQuadro(board);
        });

        // Adiciona funcionalidade ao botão excluir
        div.querySelector('.btn-excluir-quadro').addEventListener('click', (e) => {
            e.stopPropagation();
            excluirQuadro(board.id, board.name);
        });

        container.appendChild(div);
    });
}

async function excluirQuadro(id, nome) {
    if (typeof Swal === 'undefined') {
        // fallback se SweetAlert2 não estiver disponível
        if (!confirm(`Tem certeza que deseja excluir o quadro "${nome}"? Essa ação não pode ser desfeita!`)) return;
    } else {
        const result = await Swal.fire({
            title: 'Excluir Quadro?',
            text: `Tem certeza que deseja excluir o quadro "${nome}"? Essa ação não pode ser desfeita!`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sim, excluir!',
            cancelButtonText: 'Cancelar'
        });
        if (!result.isConfirmed) return;
    }
    try {
        const token = localStorage.getItem('accessToken');
        const resp = await fetch(`http://localhost:8080/boards/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!resp.ok) throw new Error('Erro ao excluir quadro');
        if (typeof Swal !== 'undefined') {
            await Swal.fire({
                title: 'Excluído!',
                text: 'O quadro foi removido com sucesso.',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });
        }
        if (typeof carregarBoards === 'function') carregarBoards();
        else window.location.reload();
    } catch (e) {
        if (typeof Swal !== 'undefined') {
            Swal.fire('Erro', 'Erro ao excluir quadro!', 'error');
        } else {
            alert('Erro ao excluir quadro!');
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
            `${API_CONFIG.BASE_URL}/phases/board/${quadroId}`
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

// Adicionando a função para fechar o modal de edição do quadro
function fecharModalEditarQuadro() {
    if (modalEditar) {
        modalEditar.remove();
        modalEditar = null;
        inputNomeEditar = null;
        idQuadroEditando = null;
    }
}





