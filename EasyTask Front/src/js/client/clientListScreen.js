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
    console.log("🚀 DOM carregado - Iniciando clientListScreen.js");
    
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

    console.log("🔍 Elementos encontrados:", {
        profileGrid: !!profileGrid,
        sidebar: !!sidebar,
        menuToggle: !!menuToggle,
        modal: !!modal,
        searchBar: !!searchBar
    });

    // 🔹 Sidebar - Abrir e fechar corretamente
    if (menuToggle) {
        menuToggle.addEventListener("click", (event) => {
            event.stopPropagation();
            if (sidebar) {
                sidebar.classList.toggle("open");
                console.log("🔘 Menu toggle clicado");
            }
        });
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
            const refreshResp = await fetch('http://localhost:8080/collaborators/refresh-token', {
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
            // Não atualiza o refreshToken, mantém o mesmo
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

                // Sempre retornar a resposta, mesmo se não for ok
                return response;

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
        
        // Se chegou aqui, algo deu errado
        throw new Error('Erro na requisição após múltiplas tentativas');
    }

    // 🔹 Função para carregar clientes do backend (com token)
    const carregarClientes = async () => {
        console.log("🔄 Iniciando carregamento de clientes...");
        try {
            const response = await fetchComToken("http://localhost:8080/clients");
            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                const errorMessage = errorData?.message || "Erro ao buscar clientes. Tente novamente.";
                Swal.fire({ title: "Erro ao carregar clientes!", text: errorMessage, icon: "error", confirmButtonColor: "#d33", confirmButtonText: "OK" });
                throw new Error(errorMessage);
            }
            clientes = await response.json();
            console.log("📋 Clientes carregados:", clientes);
            console.log("🔍 Estrutura detalhada do primeiro cliente:", JSON.stringify(clientes[0], null, 2));
            profileGrid.innerHTML = "";
            if (clientes.length === 0) {
                profileGrid.innerHTML = `<div class="mensagem-vazia"><i class="fas fa-info-circle"></i><p>Nenhum cliente cadastrado.</p></div>`;
                return;
            }
            clientes.forEach((cliente, index) => {
                console.log(`📝 Criando card para cliente ${index + 1}:`, cliente);
                console.log(`🔍 Campos disponíveis no cliente ${index + 1}:`, Object.keys(cliente));
                console.log(`🔍 Valores dos campos do cliente ${index + 1}:`, {
                    idClient: cliente.idClient,
                    id_client: cliente.id_client,
                    id: cliente.id,
                    clientId: cliente.clientId,
                    client_id: cliente.client_id,
                    name: cliente.name,
                    email: cliente.email
                });
                
                // Determinar o ID correto do cliente - Priorizar idClient (campo do backend)
                const clienteId = cliente.idClient || cliente.id_client || cliente.id || cliente.clientId || cliente.client_id;
                console.log(`🎯 ID determinado para cliente ${cliente.name}:`, clienteId);
                
                const card = document.createElement("div");
                card.className = "profile-card";
                card.innerHTML = `
                    <p>${cliente.name}</p>
                    <div class="buttons-container">
                        <button class="view-btn" onclick="console.log('🔘 Visualizar clicado para cliente ${cliente.name} com ID:', ${clienteId}); viewClient(${clienteId})">Visualizar</button>
                        <button class="edit-btn" onclick="console.log('🔘 Editar clicado para cliente ${cliente.name} com ID:', ${clienteId}); editClient(${clienteId})">Editar</button>
                        <button class="delete-btn" onclick="console.log('🔘 Excluir clicado para cliente ${cliente.name} com ID:', ${clienteId}); deleteClient(${clienteId})">Excluir</button>
                    </div>
                `;
                profileGrid.appendChild(card);
                console.log(`✅ Card criado para cliente ${cliente.name} (ID: ${clienteId})`);
            });
            console.log("🎉 Carregamento de clientes concluído");
        } catch (error) {
            console.error("❌ Erro ao carregar clientes:", error);
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
            // Determinar o ID correto do cliente - Priorizar idClient (campo do backend)
            const clienteId = cliente.idClient || cliente.id_client || cliente.id || cliente.clientId || cliente.client_id;
            
            const card = document.createElement("div");
            card.className = "profile-card";
            card.innerHTML = `
                <p>${cliente.name}</p>
                <div class="buttons-container">
                    <button class="view-btn" onclick="console.log('🔘 Visualizar clicado para cliente ${cliente.name} com ID:', ${clienteId}); viewClient(${clienteId})">Visualizar</button>
                    <button class="edit-btn" onclick="console.log('🔘 Editar clicado para cliente ${cliente.name} com ID:', ${clienteId}); editClient(${clienteId})">Editar</button>
                    <button class="delete-btn" onclick="console.log('🔘 Excluir clicado para cliente ${cliente.name} com ID:', ${clienteId}); deleteClient(${clienteId})">Excluir</button>
                </div>
            `;
            profileGrid.appendChild(card);
        });
    });

    function viewClient(clientId) {
        console.log('Visualizando cliente com ID:', clientId);
        
        if (!clientId) {
            console.error('ID do cliente é undefined ou null');
            alert('Erro: ID do cliente não encontrado');
            return;
        }
        
        // Buscar dados do cliente específico
        fetch(`http://localhost:8080/clients/${clientId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            }
        })
        .then(response => {
            console.log('Response status:', response.status);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(client => {
            console.log('Dados do cliente:', client);
            
            // Preencher o modal com os dados do cliente usando os IDs corretos do HTML
            document.getElementById('nomeCliente').textContent = client.name || 'N/A';
            document.getElementById('emailCliente').textContent = client.email || 'N/A';
            document.getElementById('telefoneCliente').textContent = client.phone || 'N/A';
            document.getElementById('cnpjCliente').textContent = client.cnpj || 'N/A';
            
            // Mostrar o modal
            document.getElementById('detalhesCliente').style.display = 'block';
        })
        .catch(error => {
            console.error('Erro ao buscar cliente:', error);
            alert('Erro ao carregar dados do cliente: ' + error.message);
        });
    }

    function editClient(clientId) {
        console.log('Editando cliente com ID:', clientId);
        
        if (!clientId) {
            console.error('ID do cliente é undefined ou null');
            alert('Erro: ID do cliente não encontrado');
            return;
        }
        
        // Armazenar o ID do cliente que está sendo editado
        window.currentEditingClientId = clientId;
        
        // Buscar dados do cliente específico
        fetch(`http://localhost:8080/clients/${clientId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            }
        })
        .then(response => {
            console.log('Response status:', response.status);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(client => {
            console.log('Dados do cliente para edição:', client);
            
            // Preencher o formulário com os dados atuais usando os IDs corretos do HTML
            document.getElementById('nomeClienteEditar').value = client.name || '';
            document.getElementById('emailClienteEditar').value = client.email || '';
            document.getElementById('telefoneClienteEditar').value = client.phone || '';
            document.getElementById('cnpjClienteEditar').value = client.cnpj || '';
            
            // Mostrar o modal
            document.getElementById('modalEdicaoCliente').style.display = 'block';
        })
        .catch(error => {
            console.error('Erro ao buscar cliente para edição:', error);
            alert('Erro ao carregar dados do cliente: ' + error.message);
        });
    }

    // 🔹 Função para verificar se o cliente tem tarefas associadas
    async function verificarTarefasCliente(clientId) {
        try {
            const response = await fetchComToken(`http://localhost:8080/clients/${clientId}/tasks`);
            console.log('🔍 Verificando tarefas do cliente - Status:', response.status);
            
            if (response.ok) {
                const tasks = await response.json();
                console.log('📋 Tarefas encontradas:', tasks.length);
                return tasks.length > 0;
            }
            return false;
        } catch (error) {
            console.error('Erro ao verificar tarefas:', error);
            return false;
        }
    }

    async function deleteClient(clientId) {
        console.log('Excluindo cliente com ID:', clientId);
        
        if (!clientId) {
            console.error('ID do cliente é undefined ou null');
            Swal.fire('Erro', 'ID do cliente não encontrado', 'error');
            return;
        }
        
        // Verificar permissão de SUPERIOR
        const isUsuarioSuperior = localStorage.getItem('isUsuarioSuperior') === 'true';
        console.log("👤 Usuário é superior:", isUsuarioSuperior);
        
        if (!isUsuarioSuperior) {
            Swal.fire('Acesso Negado', 'Apenas usuários com nível SUPERIOR podem excluir clientes.', 'error');
            return;
        }
        
        const result = await Swal.fire({
            title: 'Confirmar exclusão',
            text: 'Tem certeza que deseja excluir este cliente?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sim, excluir!',
            cancelButtonText: 'Cancelar'
        });
        
        if (result.isConfirmed) {
            try {
                // Primeiro, testar se conseguimos acessar o cliente
                console.log('🔍 Verificando se o cliente existe...');
                const checkResponse = await fetchComToken(`http://localhost:8080/clients/${clientId}`);
                
                if (!checkResponse.ok) {
                    throw new Error(`Cliente não encontrado ou sem permissão de acesso (${checkResponse.status})`);
                }
                
                const client = await checkResponse.json();
                console.log('✅ Cliente encontrado:', client.name);
                
                // Verificar se o cliente tem tarefas associadas
                console.log('🔍 Verificando se o cliente tem tarefas associadas...');
                const temTarefas = await verificarTarefasCliente(clientId);
                
                if (temTarefas) {
                    Swal.fire({
                        title: 'Não é possível excluir este cliente',
                        text: 'Este cliente possui tarefas vinculadas. Remova todas as tarefas associadas antes de excluir o cliente.',
                        icon: 'warning',
                        confirmButtonColor: '#3085d6',
                        confirmButtonText: 'Entendi'
                    });
                    return;
                }
                
                // Agora tentar excluir
                console.log('🗑️ Tentando excluir cliente...');
                const deleteResponse = await fetchComToken(`http://localhost:8080/clients/${clientId}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                console.log('Response status:', deleteResponse.status);
                
                if (!deleteResponse.ok) {
                    let errorMessage = `Erro ao excluir cliente (${deleteResponse.status})`;
                    try {
                        const errorText = await deleteResponse.text();
                        if (errorText) {
                            const errorData = JSON.parse(errorText);
                            errorMessage = errorData.error || errorData.message || errorMessage;
                        }
                    } catch (e) {
                        console.log('Não foi possível ler detalhes do erro');
                    }
                    throw new Error(errorMessage);
                }
                
                console.log('✅ Cliente excluído com sucesso');
                await Swal.fire('Sucesso!', 'Cliente excluído com sucesso!', 'success');
                carregarClientes(); // Recarregar a lista
                
            } catch (error) {
                console.error('❌ Erro ao excluir cliente:', error);
                
                // Se for erro 403, mostrar mensagem específica
                if (error.message.includes('403') || error.message.includes('Forbidden')) {
                    Swal.fire('Acesso Negado', 'Você não tem permissão para excluir clientes. Verifique se seu nível de acesso é SUPERIOR.', 'error');
                } else {
                    Swal.fire('Erro', 'Erro ao excluir cliente: ' + error.message, 'error');
                }
            }
        }
    }

    // 🔹 Função para abrir modal de cadastro de cliente
    window.abrirModalCadastroCliente = () => {
        console.log("🔍 Função abrirModalCadastroCliente chamada");
        
        // Verificar permissão de SUPERIOR
        const isUsuarioSuperior = localStorage.getItem('isUsuarioSuperior') === 'true';
        console.log("👤 Usuário é superior:", isUsuarioSuperior);
        
        if (!isUsuarioSuperior) {
            Swal.fire('Acesso Negado', 'Apenas usuários com nível SUPERIOR podem criar clientes.', 'error');
            return;
        }

        const modal = document.getElementById("modalCadastroCliente");
        console.log("🔍 Modal encontrado:", modal);
        
        if (modal) {
            modal.classList.add('mostrar');
            console.log("✅ Modal de cadastro de cliente aberto");
            console.log("🔍 Classes do modal:", modal.className);
        } else {
            console.error("❌ Modal de cadastro de cliente não encontrado");
        }
    };

    // 🔹 Função para fechar modal de cadastro de cliente
    window.fecharModalCadastroCliente = () => {
        const modal = document.getElementById("modalCadastroCliente");
        if (modal) {
            modal.classList.remove('mostrar');
            document.getElementById("formCadastroCliente").reset();
            console.log("✅ Modal de cadastro de cliente fechado");
        }
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

    // 🔹 Função para verificar e definir o nível de acesso do usuário
    function verificarNivelAcesso() {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            console.log('❌ Token não encontrado');
            return;
        }
        
        try {
            // Decodificar o token JWT para extrair o nível de acesso
            const payload = JSON.parse(atob(token.split('.')[1]));
            const accessLevel = payload.accessLevel;
            console.log('🔐 Nível de acesso extraído do token:', accessLevel);
            
            // Definir se o usuário é SUPERIOR
            const isSuperior = accessLevel === 'SUPERIOR';
            localStorage.setItem('isUsuarioSuperior', isSuperior.toString());
            console.log('👤 Usuário é SUPERIOR:', isSuperior);
            
        } catch (error) {
            console.error('❌ Erro ao decodificar token:', error);
            localStorage.setItem('isUsuarioSuperior', 'false');
        }
    }

    // 🔹 Carregar clientes ao inicializar
    console.log("🚀 Iniciando carregamento de clientes...");
    
    // Verificar nível de acesso antes de carregar
    verificarNivelAcesso();
    
    // Aguardar um pouco para garantir que a sidebar seja carregada
    setTimeout(() => {
        console.log("⏰ Delay concluído, carregando clientes...");
        carregarClientes();
    }, 500);

    // 🔹 Verificar se as funções estão disponíveis globalmente
    console.log("🔍 Verificando funções globais:", {
        viewClient: typeof window.viewClient,
        editClient: typeof window.editClient,
        deleteClient: typeof window.deleteClient,
        fecharDetalhes: typeof window.fecharDetalhes,
        fecharModalEdicaoCliente: typeof window.fecharModalEdicaoCliente
    });

    // 🔹 Função para testar diferentes métodos de autenticação
    window.testarExclusao = async (clientId) => {
        console.log('🧪 Testando exclusão do cliente ID:', clientId);
        
        const token = localStorage.getItem('accessToken');
        if (!token) {
            console.error('❌ Token não encontrado');
            return;
        }
        
        // Decodificar token
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            console.log('🔍 Token payload:', payload);
            console.log('🔍 Access Level:', payload.accessLevel);
            console.log('🔍 Subject (email):', payload.sub);
        } catch (e) {
            console.error('❌ Erro ao decodificar token:', e);
            return;
        }
        
        // Teste 1: Requisição simples
        console.log('🧪 Teste 1: Requisição simples');
        try {
            const response1 = await fetch(`http://localhost:8080/clients/${clientId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            console.log('Teste 1 - Status:', response1.status);
            console.log('Teste 1 - Headers:', response1.headers);
        } catch (error) {
            console.error('Teste 1 - Erro:', error);
        }
        
        // Teste 2: Com headers adicionais
        console.log('🧪 Teste 2: Com headers adicionais');
        try {
            const response2 = await fetch(`http://localhost:8080/clients/${clientId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            });
            console.log('Teste 2 - Status:', response2.status);
            console.log('Teste 2 - Headers:', response2.headers);
        } catch (error) {
            console.error('Teste 2 - Erro:', error);
        }
        
        // Teste 3: Verificar se o cliente existe
        console.log('🧪 Teste 3: Verificar se o cliente existe');
        try {
            const response3 = await fetch(`http://localhost:8080/clients/${clientId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            console.log('Teste 3 (GET) - Status:', response3.status);
            if (response3.ok) {
                const client = await response3.json();
                console.log('Teste 3 - Cliente encontrado:', client);
            }
        } catch (error) {
            console.error('Teste 3 - Erro:', error);
        }
    };

    // 🔹 Adicionar funções ao escopo global para acesso pelos botões
    window.viewClient = viewClient;
    window.editClient = editClient;
    window.deleteClient = deleteClient;

    // 🔹 Funções para fechar modais
    window.fecharDetalhes = () => {
        document.getElementById('detalhesCliente').style.display = 'none';
    };

    window.fecharModalEdicaoCliente = () => {
        document.getElementById('modalEdicaoCliente').style.display = 'none';
        document.getElementById('formEdicaoCliente').reset();
    };

    // 🔹 Implementar funcionalidade de edição
    document.getElementById('formEdicaoCliente').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Obter o ID do cliente que está sendo editado (precisamos armazenar isso)
        const clientId = window.currentEditingClientId;
        
        if (!clientId) {
            Swal.fire('Erro', 'ID do cliente não encontrado', 'error');
            return;
        }

        const nome = document.getElementById('nomeClienteEditar').value.trim();
        const email = document.getElementById('emailClienteEditar').value.trim();
        const telefone = document.getElementById('telefoneClienteEditar').value.trim();
        const cnpj = document.getElementById('cnpjClienteEditar').value.trim();

        if (!nome || !email || !telefone || !cnpj) {
            Swal.fire('Campos obrigatórios', 'Todos os campos são obrigatórios.', 'warning');
            return;
        }

        try {
            const response = await fetchComToken(`http://localhost:8080/clients/${clientId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    name: nome, 
                    email: email, 
                    phone: telefone, 
                    cnpj: cnpj 
                })
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                Swal.fire("Erro ao atualizar!", error.error || error.message || "Verifique os dados e tente novamente.", "error");
                return;
            }

            Swal.fire("Sucesso!", "Cliente atualizado com sucesso!", "success");
            window.fecharModalEdicaoCliente();
            carregarClientes(); // Recarregar a lista
        } catch (err) {
            console.error('Erro ao atualizar cliente:', err);
            Swal.fire("Erro", "Não foi possível conectar ao servidor.", "error");
        }
    });

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
