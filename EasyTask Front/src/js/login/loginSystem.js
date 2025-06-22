// Constante para a URL da API
const API_URL = 'http://localhost:8080';

// Funções para abrir e fechar o modal de login
window.abrirModal = function() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.classList.add('modal-open');
    }
}

window.fecharModal = function() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
    }
}

// Fechar modal ao clicar fora
window.onclick = function(event) {
    const modal = document.getElementById('loginModal');
    if (event.target === modal) {
        fecharModal();
    }
};

window.validarLogin = async function(event) {
    event.preventDefault();

    const email = document.getElementById("email")?.value?.trim();
    const senha = document.getElementById("password")?.value;

    if (!email || !senha) {
        Swal.fire('Campos obrigatórios', 'Por favor, preencha todos os campos.', 'warning');
        return;
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
        Swal.fire('E-mail inválido', 'Digite um e-mail válido.', 'warning');
        return;
    }

    try {
        console.log('Tentando login...');
        const response = await fetch(`${API_URL}/collaborators/login`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ email, senha })
        });

        console.log('Resposta do servidor:', response.status);
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            console.error('Erro no login:', error);
            Swal.fire("Erro ao entrar!", error.error || "Email ou senha incorretos.", "error");
            return;
        }

        const data = await response.json();
        console.log('Login bem sucedido, configurando tokens...');

        if (window.authManager) {
            window.authManager.setTokens(data.accessToken, data.refreshToken, data.expiresIn);

            localStorage.setItem("accessToken", data.accessToken);
            localStorage.setItem("refreshToken", data.refreshToken);

            try {
                const meResp = await window.authManager.fetchWithAuth(`${API_URL}/collaborators/me`);
                if (!meResp.ok) {
                    throw new Error('Erro ao buscar dados do usuário');
                }

                const me = await meResp.json();
                const isSuperior = me.accessLevel === 'SUPERIOR';

                localStorage.setItem('usuarioLogado', me.nome);
                localStorage.setItem('usuarioEmail', me.email);
                localStorage.setItem('isUsuarioSuperior', isSuperior.toString());
                localStorage.setItem('idCollaborator', me.idCollaborator);

                console.log('Redirecionando para o menu principal...');
                window.location.href = "../../pages/globalMenu/mainMenu.html";
            } catch (error) {
                console.error('Erro ao buscar dados do usuário:', error);
                Swal.fire("Erro", "Não foi possível carregar os dados do usuário.", "error");
            }
        } else {
            console.error('AuthManager não encontrado');
            Swal.fire("Erro", "Sistema de autenticação não disponível.", "error");
        }
    } catch (err) {
        console.error("Erro no login:", err);
        Swal.fire("Erro", "Não foi possível conectar ao servidor.", "error");
    }
}

// Função para verificar se é o primeiro usuário
async function verificarPrimeiroUsuario() {
    try {
        const response = await fetch(`${API_URL}/collaborators/count`);
        if (!response.ok) {
            return false;
        }
        const count = await response.json();
        return count === 1; // Se for o primeiro usuário (count = 1)
    } catch (error) {
        console.error('Erro ao verificar primeiro usuário:', error);
        return false;
    }
}

window.abrirModalCadastro = function() {
    const modal = document.getElementById('cadastroModal');
    modal.style.display = 'flex';
    document.body.classList.add('modal-open');
}

window.fecharModalCadastro = function() {
    const cadastroModal = document.getElementById('cadastroModal');
    const loginModal = document.getElementById('loginModal');

    cadastroModal.style.display = 'none';
    loginModal.style.display = 'flex';
    document.body.classList.add('modal-open');
}

window.criarUsuario = async function(event) {
    event.preventDefault();

    const nome = document.getElementById('nome')?.value;
    const email = document.getElementById('emailCadastro')?.value;
    const senha = document.getElementById('passwordCadastro')?.value;
    const phone = document.getElementById('phone')?.value;
    const position = document.getElementById('position')?.value;

    if (!nome || !email || !senha) {
        Swal.fire('Campos obrigatórios', 'Por favor, preencha todos os campos obrigatórios.', 'warning');
        return;
    }

    try {
        console.log('Tentando criar usuário...');
        const response = await fetch(`${API_URL}/collaborators/register`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                name: nome,
                email: email,
                password: senha,
                phone: phone || '',
                position: position || ''
            })
        });

        console.log('Resposta do servidor:', response.status);

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            console.error('Erro no cadastro:', error);
            Swal.fire("Erro", error.error || "Não foi possível cadastrar.", "error");
            return;
        }

        const data = await response.json();
        console.log('Cadastro bem sucedido');
        Swal.fire("Sucesso!", data.message || "Conta criada com sucesso!", "success");
        fecharModalCadastro();
    } catch (err) {
        console.error("Erro no cadastro:", err);
        Swal.fire("Erro", "Não foi possível conectar ao servidor.", "error");
    }
}

// O sistema de temas é gerenciado pelo temaSystem.js
// Removida a implementação duplicada para evitar conflitos

