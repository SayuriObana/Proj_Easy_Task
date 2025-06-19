/* Início do arquivo (clientListScreen.js) – Adicionar trecho para salvar token e refreshToken no localStorage */

// Ao carregar a tela, verifica se o token e refreshToken já estão salvos no localStorage.
// Caso não estejam, salva (por exemplo, copiando de sessionStorage ou de um cookie, se disponível).
// (Observe que, em geral, o token é salvo na tela de login, mas essa verificação garante que todas as telas salvem o token.)
(function () {
  if (!localStorage.getItem("accessToken")) {
    // Exemplo: se o token estiver em sessionStorage, copie-o para localStorage.
    const token = sessionStorage.getItem("accessToken");
    if (token) localStorage.setItem("accessToken", token);
  }
  if (!localStorage.getItem("refreshToken")) {
    const refreshToken = sessionStorage.getItem("refreshToken");
    if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
  }
})();

/* Fim do trecho adicionado */

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

    const profileGrid = document.getElementById("profileGrid");
    const sidebar = document.getElementById("sidebar");
    const menuToggle = document.getElementById("menuToggle");
    const modal = document.getElementById("detalhesCliente");
    const searchBar = document.getElementById("searchBar");

    const nomeCliente = document.getElementById("nomeCliente");
    const emailCliente = document.getElementById("emailCliente");
    const telefoneCliente = document.getElementById("telefoneCliente");

    let clientes = []; // Array para armazenar os clientes do backend
    let clienteSelecionadoId = null; // ID do cliente selecionado

    // 🔹 Sidebar - Abrir e fechar corretamente
    menuToggle.addEventListener("click", (event) => {
        event.stopPropagation();
        sidebar.classList.toggle("open");
    });

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
    async function fetchComToken(url, options = {}) {
        let token = localStorage.getItem('accessToken');
        let tentativas = 0;
        const MAX_TENTATIVAS = 3;
        
        if (!token) {
            try {
                token = await renovarToken();
            } catch (error) {
                console.error('Não foi possível renovar o token:', error);
                localStorage.clear();
                await Swal.fire({
                    title: "Sessão expirada",
                    text: "Sua sessão expirou ou você não tem permissão. Faça login novamente.",
                    icon: "warning",
                    confirmButtonText: "Fazer login"
                }).then(() => {
                    window.location.href = '../login/loginSystem.html';
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
                    await Swal.fire({
                        title: "Sessão expirada",
                        text: "Sua sessão expirou ou você não tem permissão. Faça login novamente.",
                        icon: "warning",
                        confirmButtonText: "Fazer login"
                    }).then(() => {
                        window.location.href = '../login/loginSystem.html';
                    });
                    throw new Error('Sessão expirada ou sem permissão');
                }
                tentativas++;
            }
        }
    }

    // 🔹 Função para carregar clientes do backend (com token)
    const carregarClientes = async () => {
        try {
            const response = await fetchComToken("http://localhost:8080/clients");
            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                const errorMessage = errorData?.message || "Erro ao buscar clientes. Tente novamente.";
                Swal.fire({ title: "Erro ao carregar clientes!", text: errorMessage, icon: "error", confirmButtonColor: "#d33", confirmButtonText: "OK" });
                throw new Error(errorMessage);
            }
            clientes = await response.json();
            profileGrid.innerHTML = "";
            if (clientes.length === 0) {
                profileGrid.innerHTML = `<div class="mensagem-vazia"><i class="fas fa-info-circle"></i><p>Nenhum cliente cadastrado.</p></div>`;
                return;
            }
            clientes.forEach((cliente) => {
                const card = document.createElement("div");
                card.className = "profile-card";
                card.innerHTML = `
                    <p>${cliente.name}</p>
                    <div class="buttons-container">
                        <button class="view-btn" onclick="visualizarCliente(${cliente.id_client})">Visualizar</button>
                        <button class="edit-btn" onclick="editarCliente(${cliente.id_client})">Editar</button>
                        <button class="delete-btn" onclick="excluirCliente(${cliente.id_client})">Excluir</button>
                    </div>
                `;
                profileGrid.appendChild(card);
            });
        } catch (error) {
            console.error("Erro ao carregar clientes:", error);
            Swal.fire({ title: "Erro ao carregar clientes!", text: "Houve um problema ao buscar os clientes. Tente novamente mais tarde.", icon: "error", confirmButtonColor: "#d33", confirmButtonText: "OK" });
            profileGrid.innerHTML = `<div class="mensagem-erro"><i class="fas fa-exclamation-triangle"></i><p>Erro ao carregar clientes. Tente novamente mais tarde.</p></div>`;
        }
    };

    // 🔹 Função para buscar clientes pelo nome
    searchBar.addEventListener("keyup", () => {
        const termo = searchBar.value.toLowerCase();
        const resultados = clientes.filter(cliente => cliente.name.toLowerCase().includes(termo));

        profileGrid.innerHTML = "";
        if (resultados.length === 0) {
            profileGrid.innerHTML = `
                <div class="mensagem-vazia">
                    <i class="fas fa-search"></i>
                    <p>Nenhum cliente encontrado.</p>
                </div>
            `;
            return;
        }

        resultados.forEach((cliente, index) => {
            const card = document.createElement("div");
            card.className = "profile-card";
            card.innerHTML = `
                <p>${cliente.name}</p>
                <div class="buttons-container">
                    <button class="view-btn" onclick="visualizarCliente(${cliente.id_client})">Visualizar</button>
                    <button class="edit-btn" onclick="editarCliente(${cliente.id_client})">Editar</button>
                    <button class="delete-btn" onclick="excluirCliente(${cliente.id_client})">Excluir</button>
                </div>
            `;
            profileGrid.appendChild(card);
        });
    });

    window.visualizarCliente = (id_client) => {
        console.log("Tentando visualizar cliente com ID:", id_client);
        console.log("Array clientes:", clientes);
        const clientId = Number(id_client);
        if (isNaN(clientId)) {
            Swal.fire({
                title: "Erro!",
                text: "ID do cliente não foi passado corretamente.",
                icon: "error",
                confirmButtonColor: "#d33",
                confirmButtonText: "OK"
            });
            console.error("Erro: ID do cliente não é um número válido.", id_client);
            return;
        }
        const cliente = clientes.find(c => c.id_client === clientId);
        if (!cliente) {
            Swal.fire({
                title: "Erro!",
                text: "Cliente não encontrado.",
                icon: "error",
                confirmButtonColor: "#d33",
                confirmButtonText: "OK"
            });
            console.error("Erro: Cliente não existe na lista.");
            return;
        }
        document.getElementById("nomeCliente").textContent = cliente.name;
        document.getElementById("emailCliente").textContent = cliente.email;
        document.getElementById("telefoneCliente").textContent = cliente.phone;
        document.getElementById("cnpjCliente").textContent = cliente.cnpj || '';
        document.getElementById("detalhesCliente").style.display = "flex";
    };

    // 🔹 Função para fechar o modal de detalhes
    window.fecharDetalhes = () => {
        modal.style.display = "none";
    };

    // 🔹 Edição de cliente (usando modal estático estilizado)
    window.editarCliente = (id_client) => {
        clienteSelecionadoId = Number(id_client);
        const cliente = clientes.find(c => c.id_client === clienteSelecionadoId);
        if (!cliente) {
            Swal.fire({ title: "Erro!", text: "Cliente não encontrado.", icon: "error", confirmButtonColor: "#d33", confirmButtonText: "OK" });
            return;
        }
        document.getElementById("nomeClienteEditar").value = cliente.name || '';
        document.getElementById("emailClienteEditar").value = cliente.email || '';
        document.getElementById("telefoneClienteEditar").value = cliente.phone || '';
        document.getElementById("cnpjClienteEditar").value = cliente.cnpj || '';
        document.getElementById("modalEdicaoCliente").style.display = "flex";
    };

    // Fechar o modal de edição estilizado
    window.fecharModalEdicaoCliente = () => {
        document.getElementById("modalEdicaoCliente").style.display = "none";
    };

    // Submeter edição de cliente
    document.getElementById("formEdicaoCliente").addEventListener("submit", async (e) => {
        e.preventDefault();
        const nome = document.getElementById("nomeClienteEditar").value.trim();
        const email = document.getElementById("emailClienteEditar").value.trim();
        const telefone = document.getElementById("telefoneClienteEditar").value.trim();
        const cnpj = document.getElementById("cnpjClienteEditar").value.trim();
        if (!nome) {
            Swal.fire('Campo obrigatório', 'O nome é obrigatório.', 'warning');
            return;
        }
        if (!email) {
            Swal.fire('Campo obrigatório', 'O e-mail é obrigatório.', 'warning');
            return;
        }
        if (!/^\S+@\S+\.\S+$/.test(email)) {
            Swal.fire('E-mail inválido', 'Digite um e-mail válido.', 'warning');
            return;
        }
        if (!telefone) {
            Swal.fire('Campo obrigatório', 'O telefone é obrigatório.', 'warning');
            return;
        }
        if (!cnpj) {
            Swal.fire('Campo obrigatório', 'O CNPJ é obrigatório.', 'warning');
            return;
        }
        try {
            const response = await fetchComToken(`http://localhost:8080/clients/${clienteSelecionadoId}`, {
                method: "PUT",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: nome, email, phone: telefone, cnpj: cnpj })
            });
            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                Swal.fire("Erro ao editar!", error.error || error.message || "Verifique os dados e tente novamente.", "error");
                return;
            }
            Swal.fire("Sucesso!", "Cliente editado com sucesso!", "success");
            window.fecharModalEdicaoCliente();
            carregarClientes();
        } catch (err) {
            Swal.fire("Erro", "Não foi possível conectar ao servidor.", "error");
        }
    });

    // 🔹 Excluir cliente
    window.excluirCliente = async (id_client) => {
        const clientId = Number(id_client);
        const confirm = await Swal.fire({
            title: 'Tem certeza?',
            text: 'Deseja realmente excluir este cliente?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sim, excluir',
            cancelButtonText: 'Cancelar'
        });
        if (!confirm.isConfirmed) return;
        try {
            const response = await fetchComToken(`http://localhost:8080/clients/${clientId}`, { method: "DELETE" });
            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                Swal.fire("Erro ao excluir!", error.error || error.message || "Verifique os dados e tente novamente.", "error");
                return;
            }
            Swal.fire("Sucesso!", "Cliente excluído com sucesso!", "success");
            carregarClientes();
        } catch (err) {
            Swal.fire("Erro", "Não foi possível conectar ao servidor.", "error");
        }
    };

    // 🔹 Função para abrir modal de cadastro de cliente
    window.abrirModalCadastroCliente = () => {
        document.getElementById("modalCadastroCliente").style.display = "flex";
    };

    // 🔹 Função para fechar modal de cadastro de cliente
    window.fecharModalCadastroCliente = () => {
        document.getElementById("modalCadastroCliente").style.display = "none";
        document.getElementById("formCadastroCliente").reset();
    };

    // 🔹 Submeter cadastro de cliente
    document.getElementById("formCadastroCliente").addEventListener("submit", async (e) => {
        e.preventDefault();
        const nome = document.getElementById("nomeClienteNovo").value.trim();
        const email = document.getElementById("emailClienteNovo").value.trim();
        const telefone = document.getElementById("telefoneClienteNovo").value.trim();
        const cnpj = document.getElementById("cnpjClienteNovo").value.trim();

        if (!nome) {
            Swal.fire('Campo obrigatório', 'O nome é obrigatório.', 'warning');
            return;
        }
        if (!email) {
            Swal.fire('Campo obrigatório', 'O e-mail é obrigatório.', 'warning');
            return;
        }
        if (!/^\S+@\S+\.\S+$/.test(email)) {
            Swal.fire('E-mail inválido', 'Digite um e-mail válido.', 'warning');
            return;
        }
        if (!telefone) {
            Swal.fire('Campo obrigatório', 'O telefone é obrigatório.', 'warning');
            return;
        }
        if (!cnpj) {
            Swal.fire('Campo obrigatório', 'O CNPJ é obrigatório.', 'warning');
            return;
        }

        try {
            const response = await fetchComToken("http://localhost:8080/clients", {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: nome, email, phone: telefone, cnpj: cnpj })
            });
            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                Swal.fire("Erro ao cadastrar!", error.error || error.message || "Verifique os dados e tente novamente.", "error");
                return;
            }
            Swal.fire("Sucesso!", "Cliente cadastrado com sucesso!", "success");
            window.fecharModalCadastroCliente();
            carregarClientes();
        } catch (err) {
            Swal.fire("Erro", "Não foi possível conectar ao servidor.", "error");
        }
    });

    // 🔹 Carregar clientes ao inicializar
    carregarClientes();

    // 🔹 Função para aplicar máscara no telefone
    window.mascaraTelefone = (input) => {
        let value = input.value.replace(/\D/g, '');
        if (value.length <= 11) {
            value = value.replace(/(\d{2})(\d)/, '($1) $2');
            value = value.replace(/(\d{5})(\d)/, '$1-$2');
        }
        input.value = value;
    };

    // 🔹 Função para aplicar máscara no CNPJ
    window.mascaraCNPJ = (input) => {
        let value = input.value.replace(/\D/g, '');
        if (value.length <= 14) {
            value = value.replace(/(\d{2})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d)/, '$1/$2');
            value = value.replace(/(\d{4})(\d)/, '$1-$2');
        }
        input.value = value;
    };

    // 🔹 Função para validar CNPJ
    function validarCNPJ(cnpj) {
        cnpj = cnpj.replace(/[^\d]/g, '');
        
        if (cnpj.length !== 14) return false;
        
        if (/^(\d)\1+$/.test(cnpj)) return false;
        
        let soma = 0;
        let peso = 2;
        
        for (let i = 11; i >= 0; i--) {
            soma += parseInt(cnpj.charAt(i)) * peso;
            peso = peso === 9 ? 2 : peso + 1;
        }
        
        let digito1 = 11 - (soma % 11);
        if (digito1 > 9) digito1 = 0;
        
        soma = 0;
        peso = 2;
        
        for (let i = 12; i >= 0; i--) {
            soma += parseInt(cnpj.charAt(i)) * peso;
            peso = peso === 9 ? 2 : peso + 1;
        }
        
        let digito2 = 11 - (soma % 11);
        if (digito2 > 9) digito2 = 0;
        
        return parseInt(cnpj.charAt(12)) === digito1 && parseInt(cnpj.charAt(13)) === digito2;
    }
});
