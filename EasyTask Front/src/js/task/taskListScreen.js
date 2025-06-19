// Verificação de sintaxe - se este console.log aparecer, a sintaxe está OK
console.log('✅ taskListScreen.js carregado com sucesso');

// DEBUG: Verificar estado da autenticação
console.log('🔍 DEBUG - Verificando estado da autenticação:');
console.log('  - StorageUtils disponível:', typeof StorageUtils !== 'undefined');
console.log('  - authManager disponível:', typeof window.authManager !== 'undefined');
console.log('  - API_CONFIG disponível:', typeof window.API_CONFIG !== 'undefined');

if (typeof StorageUtils !== 'undefined') {
    console.log('  - Token via StorageUtils:', StorageUtils.getToken());
    console.log('  - Refresh Token via StorageUtils:', StorageUtils.getRefreshToken());
    console.log('  - Usuário Superior via StorageUtils:', StorageUtils.isSuperiorUser());
}

if (typeof window.authManager !== 'undefined') {
    console.log('  - Token via authManager:', window.authManager.getToken());
    console.log('  - Refresh Token via authManager:', window.authManager.getRefreshToken());
    console.log('  - Token expirado:', window.authManager.isTokenExpired());
    console.log('  - Usuário autenticado:', window.authManager.isAuthenticated());
}

// Verificar localStorage diretamente
console.log('  - localStorage.accessToken:', localStorage.getItem('accessToken'));
console.log('  - localStorage.auth_token:', localStorage.getItem('auth_token'));
console.log('  - localStorage.token:', localStorage.getItem('token'));
console.log('  - localStorage.refreshToken:', localStorage.getItem('refreshToken'));
console.log('  - localStorage.isUsuarioSuperior:', localStorage.getItem('isUsuarioSuperior'));
console.log('  - localStorage.usuarioLogado:', localStorage.getItem('usuarioLogado'));
console.log('  - localStorage.usuarioEmail:', localStorage.getItem('usuarioEmail'));

// Funções globais para gerenciamento de fases

// Função para adicionar fase ao Kanban (escopo global)
window.adicionarFaseAoKanban = async function(phaseId) {
    try {
        console.log(`🔗 Adicionando fase ${phaseId} ao quadro`);
        console.log(`🔍 DEBUG - Tipo do phaseId:`, typeof phaseId);
        console.log(`🔍 DEBUG - Valor do phaseId:`, phaseId);
        console.log(`🔍 DEBUG - Board ID atual:`, window.__quadroId);
        console.log(`🔍 DEBUG - Board ID que será usado:`, window.__quadroId || 1);

        if (!phaseId || phaseId === 'undefined' || phaseId === undefined) {
            throw new Error('ID da fase é inválido ou undefined');
        }

        const boardId = window.__quadroId || 1;
        console.log(`📡 Fazendo POST para /boards/${boardId}/phases`);

        const response = await window.authManager.fetchWithAuth(
            window.API_CONFIG.BASE_URL + `/boards/${boardId}/phases`,
            {
                method: 'POST',
                body: JSON.stringify({
                    phaseIds: [phaseId]
                })
            }
        );

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Erro ao adicionar fase ao quadro: ${response.status} - ${errorData}`);
        }

        console.log("✅ Fase adicionada ao Kanban com sucesso");
        window.mostrarNotificacao("Fase adicionada ao Kanban com sucesso!", "success");
        
        // Atualizar o Kanban
        await window.gerarColunasKanban();
    } catch (error) {
        console.error("❌ Erro ao adicionar fase ao Kanban:", error);
        window.mostrarNotificacao("Erro ao adicionar fase ao Kanban. Tente novamente.", "error");
    }
};

// Função para editar fase
window.editarFase = function(id, nomeAtual, descricaoAtual) {
    console.log('✏️ Editando fase:', id);
    console.log('🔍 DEBUG - Tipo do ID:', typeof id);
    console.log('🔍 DEBUG - Valor do ID:', id);
    
    // Verificar se o ID é válido
    if (!id || id === 'undefined' || id === undefined) {
        console.error('❌ ID da fase é inválido:', id);
        alert('Erro: ID da fase não encontrado. Tente recarregar a página.');
        return;
    }
    
    // Verificar permissão
    if (!window.hasAdminPermission()) {
        alert('❌ Você não tem permissão para editar fases. Apenas usuários SUPERIOR podem realizar esta ação.');
        return;
    }
    
    const novoNome = prompt('Digite o novo nome da fase:', nomeAtual);
    if (!novoNome || novoNome.trim() === '') {
        alert('Nome da fase é obrigatório!');
        return;
    }
    
    const novaDescricao = prompt('Digite a nova descrição da fase (opcional):', descricaoAtual);
    
    const token = window.authManager ? window.authManager.getToken() : localStorage.getItem('accessToken');
    if (!token) {
        console.error('❌ Token não encontrado');
        return;
    }
    
    console.log('📡 Fazendo requisição PUT para:', `${window.API_CONFIG.BASE_URL}/phases/${id}`);
    
    fetch(`${window.API_CONFIG.BASE_URL}/phases/${id}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name: novoNome.trim(),
            description: novaDescricao ? novaDescricao.trim() : null
        })
    })
    .then(response => {
        console.log('📡 Resposta do servidor:', response.status);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('✅ Fase editada:', data);
        alert('✅ Fase editada com sucesso!');
        window.carregarFasesNaTabela();
    })
    .catch(error => {
        console.error('❌ Erro ao editar fase:', error);
        alert('Erro ao editar fase: ' + error.message);
    });
};

// Função para excluir fase
window.excluirFase = async function(id) {
    console.log('🗑️ Excluindo fase:', id);
    console.log('🔍 DEBUG - Tipo do ID:', typeof id);
    console.log('🔍 DEBUG - Valor do ID:', id);
    
    // Verificar se o ID é válido
    if (!id || id === 'undefined' || id === undefined) {
        console.error('❌ ID da fase é inválido:', id);
        alert('Erro: ID da fase não encontrado. Tente recarregar a página.');
        return;
    }
    
    // Verificar permissão com logs detalhados
    console.log('🔐 DEBUG - Verificando permissões do usuário:');
    console.log('  - StorageUtils disponível:', typeof StorageUtils !== 'undefined');
    console.log('  - localStorage.isUsuarioSuperior:', localStorage.getItem('isUsuarioSuperior'));
    console.log('  - localStorage.usuarioLogado:', localStorage.getItem('usuarioLogado'));
    console.log('  - localStorage.usuarioEmail:', localStorage.getItem('usuarioEmail'));
    
    if (typeof StorageUtils !== 'undefined') {
        console.log('  - StorageUtils.isSuperiorUser():', StorageUtils.isSuperiorUser());
        console.log('  - StorageUtils.getCurrentUser():', StorageUtils.getCurrentUser());
    }
    
    const hasPermission = window.hasAdminPermission();
    console.log('  - window.hasAdminPermission():', hasPermission);
    
    // Decodificar JWT para verificar claims
    const token = window.authManager ? window.authManager.getToken() : localStorage.getItem('accessToken');
    if (token) {
        const decodedToken = window.decodeJWT(token);
        console.log('  - JWT decodificado:', decodedToken);
        if (decodedToken) {
            console.log('  - Claims do JWT:', {
                sub: decodedToken.sub,
                email: decodedToken.email,
                roles: decodedToken.roles,
                authorities: decodedToken.authorities,
                accessLevel: decodedToken.accessLevel
            });
        }
    }
    
    if (!hasPermission) {
        alert('❌ Você não tem permissão para excluir fases. Apenas usuários SUPERIOR podem realizar esta ação.');
        return;
    }
    
    const confirmacao = confirm('Tem certeza que deseja excluir esta fase? Esta ação não pode ser desfeita.');
    if (!confirmacao) {
        return;
    }
    
    // Verificar se a fase tem tarefas associadas
    console.log('🔍 Verificando se a fase tem tarefas associadas...');
    try {
        const tarefasResponse = await fetch(`${window.API_CONFIG.BASE_URL}/tasks`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (tarefasResponse.ok) {
            const tarefas = await tarefasResponse.json();
            const tarefasNaFase = tarefas.filter(tarefa => 
                (tarefa.idPhase || tarefa.id_phase || tarefa.phaseId) == id
            );
            
            console.log(`🔍 Tarefas encontradas na fase ${id}:`, tarefasNaFase.length);
            if (tarefasNaFase.length > 0) {
                const confirmarExclusao = confirm(
                    `Esta fase possui ${tarefasNaFase.length} tarefa(s) associada(s). ` +
                    `Excluir a fase também removerá todas as tarefas. Deseja continuar?`
                );
                if (!confirmarExclusao) {
                    return;
                }
            }
        }
    } catch (error) {
        console.warn('⚠️ Não foi possível verificar tarefas associadas:', error);
    }
    
    if (!token) {
        console.error('❌ Token não encontrado');
        return;
    }
    
    console.log('🗑️ Fazendo requisição DELETE para:', `${window.API_CONFIG.BASE_URL}/phases/${id}`);
    console.log('🔐 Token usado:', token.substring(0, 20) + '...');
    
    fetch(`${window.API_CONFIG.BASE_URL}/phases/${id}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        console.log('📡 Resposta do servidor:', response.status);
        console.log('📡 Headers da resposta:', response.headers);
        
        if (!response.ok) {
            // Capturar o corpo da resposta de erro
            return response.text().then(errorText => {
                console.error('📡 Corpo da resposta de erro:', errorText);
                throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
            });
        }
        return response.text();
    })
    .then(data => {
        console.log('✅ Fase excluída:', data);
        alert('✅ Fase excluída com sucesso!');
        window.carregarFasesNaTabela();
    })
    .catch(error => {
        console.error('❌ Erro ao excluir fase:', error);
        
        // Mensagem mais específica baseada no erro
        if (error.message.includes('403')) {
            alert('❌ Erro 403: Você não tem permissão para excluir esta fase. Verifique se é usuário SUPERIOR.');
        } else if (error.message.includes('409')) {
            alert('❌ Erro 409: Esta fase não pode ser excluída porque possui tarefas associadas.');
        } else if (error.message.includes('404')) {
            alert('❌ Erro 404: Fase não encontrada no servidor.');
        } else {
            alert('Erro ao excluir fase: ' + error.message);
        }
    });
};

// Função para carregar fases na tabela do modal
window.carregarFasesNaTabela = function() {
    console.log('🔄 Carregando fases na tabela...');
    
    const token = window.authManager ? window.authManager.getToken() : localStorage.getItem('accessToken');
    if (!token) {
        console.error('❌ Token não encontrado');
        return;
    }

    fetch(`${window.API_CONFIG.BASE_URL}/phases`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        console.log('📡 Resposta do servidor:', response.status);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
    })
    .then(fases => {
        console.log('✅ Fases carregadas:', fases);
        console.log('🔍 DEBUG - Estrutura da primeira fase:', fases[0]);
        console.log('🔍 DEBUG - Chaves da primeira fase:', fases[0] ? Object.keys(fases[0]) : 'Nenhuma fase');
        
        const tbody = document.querySelector('#phasesTableBody');
        if (!tbody) {
            console.error('❌ Tbody não encontrado');
            console.error('🔍 DEBUG - Elementos com ID phasesTableBody:', document.querySelectorAll('#phasesTableBody'));
            console.error('🔍 DEBUG - Elementos com ID phasesTable:', document.querySelectorAll('#phasesTable'));
            return;
        }
        
        tbody.innerHTML = '';
        
        // Verificar permissão do usuário
        const hasAdminPermission = window.hasAdminPermission();
        console.log('🔐 Usuário tem permissão administrativa:', hasAdminPermission);
        
        fases.forEach((fase, index) => {
            console.log(`🔍 DEBUG - Fase ${index}:`, fase);
            console.log(`🔍 DEBUG - ID da fase ${index}:`, fase.id_phase || fase.id);
            console.log(`🔍 DEBUG - Todas as chaves da fase ${index}:`, Object.keys(fase));
            
            // Determinar o ID correto da fase
            const phaseId = fase.idPhase || fase.id_phase || fase.id || fase.phaseId || fase.phase_id;
            console.log(`🔍 DEBUG - ID final da fase ${index}:`, phaseId);
            
            if (!phaseId) {
                console.error(`❌ ID não encontrado para fase ${index}:`, fase);
                return; // Pular esta fase
            }
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${fase.name}</td>
                <td>${fase.description || '-'}</td>
                <td>${fase.sequence || '-'}</td>
                <td>
                    <button class="btn-add-phase" onclick="window.adicionarFaseAoKanban(${phaseId})" 
                            title="Adicionar ao Kanban">
                        <i class="fas fa-plus"></i> Adicionar
                    </button>
                    ${hasAdminPermission ? `
                        <button class="btn-edit-phase" onclick="window.editarFase(${phaseId}, '${fase.name}', '${fase.description || ''}')" 
                                title="Editar fase">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="btn-delete-phase" onclick="window.excluirFase(${phaseId})" 
                                title="Excluir fase">
                            <i class="fas fa-trash"></i> Excluir
                        </button>
                    ` : ''}
                </td>
            `;
            tbody.appendChild(row);
        });
        
        console.log('✅ Tabela de fases atualizada');
    })
    .catch(error => {
        console.error('❌ Erro ao carregar fases:', error);
        alert('Erro ao carregar fases: ' + error.message);
    });
};

// Função para gerar colunas do Kanban (escopo global)
window.gerarColunasKanban = async function() {
    try {
        console.log(`🏗️ Gerando colunas Kanban...`);

        // Buscar todas as fases disponíveis
        const response = await window.authManager.fetchWithAuth(
            window.API_CONFIG.BASE_URL + `/phases`
        );
          
        if (!response.ok) {
            throw new Error(`Erro ao buscar fases: ${response.status} ${response.statusText}`);
        }

        const fases = await response.json();
        console.log("📊 Fases recebidas:", fases);

        if (!fases || fases.length === 0) {
            console.warn("⚠️ Nenhuma fase encontrada. Criando colunas padrão...");
            criarColunasPadrao();
        } else {
            renderizarFases(fases);
        }

        // Carregar tarefas após criar as colunas
        await carregarTarefas();

    } catch (error) {
        console.error('❌ Erro ao gerar colunas Kanban:', error);
        window.mostrarNotificacao('Erro ao carregar fases. Tente novamente.', 'error');
        // Fallback para colunas padrão
        criarColunasPadrao();
    }
};

// Função para mostrar notificações (escopo global)
window.mostrarNotificacao = function(mensagem, tipo = "info") {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: tipo === "error" ? "Erro" : tipo === "success" ? "Sucesso" : "Informação",
            text: mensagem,
            icon: tipo,
            confirmButtonColor: tipo === "error" ? "#d33" : "#3085d6"
        });
    } else {
        alert(mensagem);
    }
};

// Função para verificar se a configuração da API está disponível
function verificarConfigAPI() {
    return new Promise((resolve, reject) => {
        let tentativas = 0;
        const maxTentativas = 10;
        
        function checar() {
            if (window.API_CONFIG) {
                console.log("Configuração da API disponível");
                resolve();
            } else {
                tentativas++;
                if (tentativas >= maxTentativas) {
                    reject(new Error('Timeout aguardando configuração da API'));
                } else {
                    console.log(`⏳ Aguardando configuração da API... (tentativa ${tentativas})`);
                    setTimeout(checar, 500);
                }
            }
        }
        checar();
    });
}


async function criarTarefa(dadosTarefa) {
    console.log("🚀 Iniciando criação de tarefa...");
    
    // Verificar token
    const token = window.authManager.getToken();
    console.log("🔑 Token atual:", token ? token.substring(0, 20) + "..." : "Nenhum token");
    
    // Verificar se o token está válido
    if (!token) {
        throw new Error("Token não encontrado. Faça login novamente.");
    }
    
    // Verificar expiração do token
    const isExpired = window.authManager.isTokenExpired();
    console.log("⏰ Token expirado:", isExpired);
    
    if (isExpired) {
        throw new Error("Token expirado. Faça login novamente.");
    }

    try {
        console.log('📝 Criando nova tarefa:', dadosTarefa);

        // Verificar token e claims do usuário
        const token = window.authManager ? window.authManager.getToken() : localStorage.getItem('accessToken');
        console.log('🔐 Token encontrado:', token ? 'Sim' : 'Não');
        console.log('🔐 Token (primeiros 50 chars):', token ? token.substring(0, 50) + '...' : 'Nenhum');
        
        if (token) {
            try {
                const decodedToken = window.decodeJWT(token);
                console.log('🔐 JWT decodificado:', decodedToken);
                if (decodedToken) {
                    console.log('🔐 Claims do usuário:', {
                        sub: decodedToken.sub,
                        accessLevel: decodedToken.accessLevel,
                        iat: decodedToken.iat,
                        exp: decodedToken.exp
                    });
                } else {
                    console.error('❌ Falha ao decodificar JWT');
                }
            } catch (error) {
                console.error('❌ Erro ao decodificar JWT:', error);
            }
        }

        // ⚠️ VERIFICAÇÃO: Garante que a fase pertence ao quadro atual
        const faseSelecionada = dadosTarefa.phaseId;
        const boardId = window.__quadroId;
        
        if (boardId) {
            // Verificar se a fase pertence ao board atual
            const responseFases = await window.authManager.fetchWithAuth(
                window.API_CONFIG.BASE_URL + `/boards/${boardId}/phases`
            );
            
            if (responseFases.ok) {
                const fasesQuadro = await responseFases.json();
                const faseValida = fasesQuadro.find(f => 
                    (f.idPhase || f.id_phase || f.id) == faseSelecionada
                );

                if (!faseValida) {
                    window.mostrarNotificacao('A fase selecionada não pertence a este quadro.', 'error');
                    return;
                }
            }
        }

        console.log('📡 Enviando requisição POST para:', `${window.API_CONFIG.BASE_URL}/tasks`);
        console.log('📡 Dados enviados:', dadosTarefa);
        
        // Validação detalhada dos dados
        console.log('🔍 Validação dos dados:');
        console.log('  - title:', dadosTarefa.title, 'tipo:', typeof dadosTarefa.title);
        console.log('  - description:', dadosTarefa.description, 'tipo:', typeof dadosTarefa.description);
        console.log('  - priority:', dadosTarefa.priority, 'tipo:', typeof dadosTarefa.priority);
        console.log('  - dueDate:', dadosTarefa.dueDate, 'tipo:', typeof dadosTarefa.dueDate);
        console.log('  - boardId:', dadosTarefa.boardId, 'tipo:', typeof dadosTarefa.boardId);
        console.log('  - phaseId:', dadosTarefa.phaseId, 'tipo:', typeof dadosTarefa.phaseId);
        console.log('  - clientId:', dadosTarefa.clientId, 'tipo:', typeof dadosTarefa.clientId);
        console.log('  - collaboratorId:', dadosTarefa.collaboratorId, 'tipo:', typeof dadosTarefa.collaboratorId);

        // Verificar se o endpoint está acessível
        console.log('🔍 Verificando acesso ao endpoint de tarefas...');
        try {
            const testResponse = await window.authManager.fetchWithAuth(
                window.API_CONFIG.BASE_URL + `/tasks`,
                { method: 'GET' }
            );
            console.log('🔍 Teste GET /tasks:', testResponse.status);
        } catch (error) {
            console.warn('⚠️ Endpoint de tarefas pode não estar acessível:', error);
        }

        const response = await window.authManager.fetchWithAuth(
            window.API_CONFIG.BASE_URL + `/tasks`,
            {
                method: 'POST',
                body: JSON.stringify(dadosTarefa)
            }
        );
        
        console.log('📡 Resposta do servidor:', response.status);
        console.log('📡 Headers da resposta:', response.headers);
        
        if (!response.ok) {
            // Capturar o corpo da resposta de erro
            const errorText = await response.text();
            console.error('📡 Corpo da resposta de erro:', errorText);
            
            if (response.status === 403) {
                throw new Error('Erro 403: Você não tem permissão para criar tarefas. Verifique se é usuário SUPERIOR.');
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
            }
        }

        const novaTarefa = await response.json();
        console.log('✅ Tarefa criada com sucesso:', novaTarefa);
        
        adicionarTarefaAoQuadro(novaTarefa);
        window.mostrarNotificacao('Tarefa criada com sucesso!', 'success');
        
        return novaTarefa;
    } catch (error) {
        console.error('❌ Erro ao criar tarefa:', error);
        window.mostrarNotificacao('Erro ao criar tarefa: ' + error.message, 'error');
        throw error;
    }
}


// READ - Buscar tarefa por ID
async function buscarTarefa(taskId) {
    try {
        console.log(`🔍 Buscando tarefa ${taskId}`);
        
        const response = await window.authManager.fetchWithAuth(
            window.API_CONFIG.BASE_URL + `/tasks/${taskId}`
        );
        
        const tarefa = await response.json();
        
        console.log('✅ Tarefa encontrada:', tarefa);
        return tarefa;
    } catch (error) {
        console.error(`❌ Erro ao buscar tarefa ${taskId}:`, error);
        window.mostrarNotificacao('Erro ao buscar detalhes da tarefa.', 'error');
        throw error;
    }
}

// UPDATE - Atualizar tarefa
async function atualizarTarefa(taskId, dadosAtualizados) {
    try {
        console.log(`📝 Atualizando tarefa ${taskId}:`, dadosAtualizados);
        
        const response = await window.authManager.fetchWithAuth(
            window.API_CONFIG.BASE_URL + `/tasks/${taskId}`,
            {
                method: 'PUT',
                body: JSON.stringify(dadosAtualizados)
            }
        );
        

        const tarefaAtualizada = await response.json();
        console.log('✅ Tarefa atualizada com sucesso:', tarefaAtualizada);
        
        // Atualizar a interface
        const elementoTarefa = document.querySelector(`[data-task-id="${taskId}"]`);
        if (elementoTarefa) {
            const novoElemento = criarElementoTarefa(tarefaAtualizada);
            elementoTarefa.replaceWith(novoElemento);
        }
        
        window.mostrarNotificacao('Tarefa atualizada com sucesso!', 'success');
        return tarefaAtualizada;
    } catch (error) {
        console.error(`❌ Erro ao atualizar tarefa ${taskId}:`, error);
        window.mostrarNotificacao('Erro ao atualizar tarefa. Tente novamente.', 'error');
        throw error;
    }
}

// DELETE - Excluir tarefa
async function excluirTarefa(taskId) {
    try {
        console.log(`🗑️ Excluindo tarefa ${taskId}`);
        
        // Confirmar exclusão
        const confirmacao = await Swal.fire({
            title: 'Confirmar exclusão',
            text: 'Tem certeza que deseja excluir esta tarefa? Esta ação não pode ser desfeita.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sim, excluir',
            cancelButtonText: 'Cancelar'
        });
        
        if (!confirmacao.isConfirmed) {
            return false;
        }
        
        await window.authManager.fetchWithAuth(
            window.API_CONFIG.BASE_URL + `/tasks/${taskId}`,
            {
                method: 'DELETE'
            }
        );
        

        console.log('✅ Tarefa excluída com sucesso');
        
        // Remover da interface
        const elementoTarefa = document.querySelector(`[data-task-id="${taskId}"]`);
        if (elementoTarefa) {
            elementoTarefa.remove();
            
            // Atualizar contador da coluna
            const coluna = elementoTarefa.closest('.kanban-column');
            if (coluna) {
                const contador = coluna.querySelector('.task-count');
                if (contador) {
                    const count = parseInt(contador.textContent) - 1;
                    contador.textContent = count;
                }
            }
        }
        
        window.mostrarNotificacao('Tarefa excluída com sucesso!', 'success');
        return true;
    } catch (error) {
        console.error(`❌ Erro ao excluir tarefa ${taskId}:`, error);
        window.mostrarNotificacao('Erro ao excluir tarefa. Tente novamente.', 'error');
        throw error;
    }
}

// Função para carregar tarefas do quadro
async function carregarTarefas() {
    try {
        console.log(`📋 Carregando todas as tarefas...`);
        
        const response = await window.authManager.fetchWithAuth(
            window.API_CONFIG.BASE_URL + `/tasks`
        );
        
        if (!response.ok) {
            if (response.status === 401) {
                console.warn("⚠️ Sessão expirada. Continuando na tela para criação manual.");
                window.mostrarNotificacao("Sua sessão expirou. Algumas funcionalidades podem estar limitadas.", "warning");
                return;
            }
        
            if (response.status === 403) {
                console.warn("⚠️ Acesso negado. Continuando na tela.");
                window.mostrarNotificacao("Você não tem permissão para acessar as tarefas.", "error");
                return;
            }
        
            throw new Error('Erro ao carregar tarefas');
        }        
        
        const tarefas = await response.json();
        console.log(`📊 Tarefas recebidas do backend:`, tarefas);
        console.log(`🔍 DEBUG - Estrutura da primeira tarefa:`, tarefas[0]);
        console.log(`🔍 DEBUG - Chaves da primeira tarefa:`, tarefas[0] ? Object.keys(tarefas[0]) : 'Nenhuma tarefa');
        
        // Renderizar tarefas nas colunas apropriadas
        tarefas.forEach(tarefa => {
            console.log(`🔍 DEBUG - Tarefa ${tarefa.id_task || tarefa.id}:`, tarefa);
            console.log(`🔍 DEBUG - Fase da tarefa:`, tarefa.id_phase || tarefa.idPhase || tarefa.phaseId);
            adicionarTarefaAoQuadro(tarefa);
        });
        
        // Atualizar contadores
        atualizarContadoresColunas();
        
        console.log('✅ Tarefas carregadas com sucesso');
        
    } catch (error) {
        console.error('❌ Erro ao carregar tarefas:', error);
        window.mostrarNotificacao('Erro ao carregar tarefas. Tente novamente.', 'error');
    }
}

// Função para mover tarefa entre fases
async function moverTarefa(taskId, novaFaseId) {
    try {
        console.log(`🔄 Movendo tarefa ${taskId} para fase ${novaFaseId}`);

        const response = await window.authManager.fetchWithAuth(
            window.API_CONFIG.BASE_URL + `/tasks/${taskId}`,
            {
                method: 'PATCH',
                body: JSON.stringify({
                    id_phase: novaFaseId
                })
            }
        );
        

        const tarefaAtualizada = await response.json();
        console.log(`✅ Tarefa ${taskId} movida com sucesso`);
        
        // Atualizar contadores das colunas
        atualizarContadoresColunas();
        
        window.mostrarNotificacao('Tarefa movida com sucesso!', 'success');
        return tarefaAtualizada;
    } catch (error) {
        console.error('❌ Erro ao mover tarefa:', error);
        window.mostrarNotificacao('Erro ao mover tarefa. Tente novamente.', 'error');
        throw error;
    }
}

// Função para atualizar contadores das colunas
function atualizarContadoresColunas() {
    const colunas = document.querySelectorAll('.kanban-column');
    colunas.forEach(coluna => {
        const tarefas = coluna.querySelectorAll('.task-card');
        const contador = coluna.querySelector('.task-count');
        if (contador) {
            contador.textContent = tarefas.length;
        }
    });
}

async function verificarBackendDisponivel() {
    try {
        console.log("🔍 Verificando backend...");
        
        // Usar um endpoint que existe e aceita autenticação
        const response = await window.authManager.fetchWithAuth(
            window.API_CONFIG.BASE_URL + '/tasks'
        );
        
        console.log("🔍 Resposta da verificação:", response.status);
        return response.ok;
        
    } catch (error) {
        console.error("❌ Erro ao verificar backend:", error);
        return false;
    }
}


// Função para mostrar mensagem de backend indisponível
function mostrarMensagemBackendIndisponivel() {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: "Backend Indisponível",
            text: "O servidor não está respondendo. Algumas funcionalidades podem não estar disponíveis.",
            icon: "warning",
            confirmButtonColor: "#FFD700"
        });
    } else {
        alert("Backend indisponível. Algumas funcionalidades podem não estar disponíveis.");
    }
}

// Função para renderizar fases
function renderizarFases(fases) {
    try {
        const kanbanBoard = document.querySelector('.kanban-board');
        if (!kanbanBoard) {
            console.error('❌ Container kanban-board não encontrado');
            return;
        }

        // Limpar colunas existentes
        kanbanBoard.innerHTML = '';

        if (!fases || fases.length === 0) {
            console.warn("⚠️ Nenhuma fase fornecida. Criando colunas padrão...");
            criarColunasPadrao();
            return;
        }

        // Ordenar fases por sequência
        const fasesOrdenadas = fases.sort((a, b) => (a.sequence || 0) - (b.sequence || 0));

        // Criar colunas para cada fase
        fasesOrdenadas.forEach(fase => {
            const coluna = criarColunaFase(fase);
            kanbanBoard.appendChild(coluna);
        });

        console.log(`✅ ${fasesOrdenadas.length} fases renderizadas`);

    } catch (error) {
        console.error('❌ Erro ao renderizar fases:', error);
        criarColunasPadrao(); // fallback em caso de erro
    }
}

// Função para criar coluna de fase
function criarColunaFase(fase) {
    const coluna = document.createElement('div');
    coluna.className = 'kanban-column';
    coluna.dataset.phaseId = fase.idPhase || fase.id_phase || fase.id;

    coluna.innerHTML = `
        <div class="column-header">
            <h3 class="column-title">${fase.name || 'Fase sem nome'}</h3>
            <span class="task-count">0</span>
        </div>
        <div class="column-content drop-container">
            <!-- Tarefas serão adicionadas aqui -->
        </div>
    `;

    return coluna;
}

// Função para criar colunas padrão
function criarColunasPadrao() {
    console.log('📋 Criando colunas padrão...');
    
    const fasesPadrao = [
        { id_phase: 'todo', name: 'A Fazer', sequence: 1 },
        { id_phase: 'doing', name: 'Em Execução', sequence: 2 },
        { id_phase: 'done', name: 'Concluído', sequence: 3 }
    ];

    renderizarFases(fasesPadrao);
}

// Função para adicionar tarefa ao quadro
function adicionarTarefaAoQuadro(tarefa) {
    try {
        const faseId = tarefa.idPhase || tarefa.id_phase || tarefa.phaseId;
        console.log(`🔍 DEBUG - Adicionando tarefa ${tarefa.id_task || tarefa.id} à fase:`, faseId);
        
        if (!faseId) {
            console.warn(`⚠️ Tarefa ${tarefa.id_task || tarefa.id} sem fase definida`);
            return;
        }

        const columnContent = document.querySelector(`[data-phase-id="${faseId}"] .column-content`);
        if (!columnContent) {
            console.warn(`⚠️ Coluna para fase ${faseId} não encontrada`);
            console.log(`🔍 DEBUG - Colunas disponíveis:`, document.querySelectorAll('.kanban-column'));
            return;
        }

        const taskElement = criarElementoTarefa(tarefa);
        columnContent.appendChild(taskElement);

        // Atualizar contador
        const contador = columnContent.parentElement.querySelector('.task-count');
        if (contador) {
            const count = parseInt(contador.textContent) + 1;
            contador.textContent = count;
        }

        console.log(`✅ Tarefa ${tarefa.id_task || tarefa.id} adicionada à fase ${faseId}`);
    } catch (error) {
        console.error(`❌ Erro ao adicionar tarefa ${tarefa.id_task || tarefa.id} ao quadro:`, error);
        throw error;
    }
}

// Função para criar elemento de tarefa
function criarElementoTarefa(tarefa) {
    const taskElement = document.createElement('div');
    taskElement.className = 'task-card draggable';
    taskElement.draggable = true;
    taskElement.dataset.taskId = tarefa.id_task || tarefa.id;
    taskElement.dataset.phaseId = tarefa.idPhase || tarefa.id_phase || tarefa.phaseId;

    const prioridade = getPrioridadeNome(tarefa.priority || 'MEDIA');
    const prioridadeClass = getPrioridadeClass(tarefa.priority || 'MEDIA');
    const dataEntrega = formatarData(tarefa.delivery_date || tarefa.deliveryDate);

    taskElement.innerHTML = `
        <div class="task-header">
            <h4 class="task-title">${tarefa.title || 'Tarefa sem título'}</h4>
            <span class="task-priority ${prioridadeClass}">${prioridade}</span>
        </div>
        <div class="task-body">
            <p class="task-description">${tarefa.description || 'Sem descrição'}</p>
            <div class="task-meta">
                <span class="task-assignee">👤 ${tarefa.assignee_name || 'Não atribuído'}</span>
                <span class="task-client">🏢 ${tarefa.client_name || 'Cliente não definido'}</span>
                <span class="task-date">📅 ${dataEntrega}</span>
            </div>
        </div>
        <div class="task-actions">
            <button class="btn-edit-task" onclick="editarTarefa('${tarefa.id_task || tarefa.id}')">
                <i class="fas fa-edit"></i>
            </button>
            <button class="btn-delete-task" onclick="excluirTarefa('${tarefa.id_task || tarefa.id}')">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;

    return taskElement;
}

// Funções auxiliares
function getPrioridadeNome(priority) {
    const prioridades = {
        'BAIXA': 'Baixa',
        'MEDIA': 'Média',
        'ALTA': 'Alta',
        'URGENTE': 'Urgente'
    };
    return prioridades[priority] || 'Média';
}

function formatarData(data) {
    if (!data) return 'Data não definida';
    try {
        return new Date(data).toLocaleDateString('pt-BR');
    } catch (error) {
        return 'Data inválida';
    }
}

function getPrioridadeClass(priority) {
    const classes = {
        'BAIXA': 'priority-low',
        'MEDIA': 'priority-medium',
        'ALTA': 'priority-high',
        'URGENTE': 'priority-urgent'
    };
    return classes[priority] || 'priority-medium';
}

// Função principal de inicialização
async function inicializarSistema() {
    try {
        console.log("🚀 Inicializando sistema...");
        console.log("📍 URL atual:", window.location.href);
        console.log("📍 Parâmetros da URL:", window.location.search);
        
        // Aguardar a configuração da API estar disponível
        await verificarConfigAPI();
        
        if (!window.authManager) {
            console.error('AuthManager não está disponível');
            window.mostrarNotificacao("Problema na autenticação. Algumas funções podem não funcionar corretamente.", "warning");
            // Continua sem redirecionar
        }        

        // Verificar token
        const token = window.authManager ? window.authManager.getToken() : localStorage.getItem('accessToken');
        if (!token) {
            console.warn("⚠️ Token ausente, mas continuando para permitir preenchimento manual.");
            window.mostrarNotificacao("Você ainda não está autenticado. Algumas ações podem não funcionar.", "warning");
        }
               

        
        console.log("✅ Usuário autenticado com sucesso");

        // Verificar quadroId
        const urlParams = new URLSearchParams(window.location.search);
        const quadroId = urlParams.get("id");

        console.log("🔍 Parâmetro 'id' encontrado na URL:", quadroId);

        if (!quadroId || isNaN(quadroId)) {
            console.warn("❌ QuadroId inválido. Permanece na tela para criação manual.");
            Swal.fire("Quadro não encontrado", "Nenhum quadro válido foi detectado. Você poderá criar tarefas e fases manualmente.", "info");
            window.__quadroId = null;
            criarColunasPadrao();
            return;
        }

        window.__quadroId = parseInt(quadroId);
        console.log("✅ Quadro ID encontrado:", window.__quadroId);

        // Verificar disponibilidade do backend
        console.log("🔍 Verificando disponibilidade do backend...");
        const backendDisponivel = await verificarBackendDisponivel();
        console.log("🔍 Backend disponível:", backendDisponivel);
        
        if (!backendDisponivel) {
            console.warn("⚠️ Backend não disponível inicialmente, mas continuando...");
            window.mostrarNotificacao("O servidor pode estar lento. Tentando carregar dados...", "warning");
        }
        
        if (!backendDisponivel) {
            console.warn("Backend não disponível");
            window.mostrarNotificacao("O servidor não está respondendo. Algumas funcionalidades podem não funcionar.", "warning");
            // Permite continuar para que o usuário possa criar fases manualmente
        }        

        // Carregar dados do quadro
        try {
            const response = await window.authManager.fetchWithAuth(
                window.API_CONFIG.BASE_URL + window.API_CONFIG.ENDPOINTS.BOARD_PHASES(quadroId)
            );
            

console.log(" RESPONSE STATUS:", response.status);

const text = await response.text();
console.log("🧪 RAW RESPONSE TEXT:", text);

if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
        console.warn("⚠️ Token inválido ou acesso negado. Continuando para permitir edição manual.");
        window.mostrarNotificacao("Você não tem acesso a este conteúdo, mas pode continuar configurando manualmente.", "warning");
        return;
    }
    throw new Error('Erro ao carregar fases do quadro');
}


            
            const fases = await response.json();
console.log("✅ Fases do quadro carregadas com sucesso:", fases);

if (!fases || fases.length === 0) {
    console.warn("⚠️ Nenhuma fase encontrada. Criando colunas padrão...");
    criarColunasPadrao();
} else {
    renderizarFases(fases);
}

// Carregar tarefas mesmo assim (mesmo que ainda não haja tarefas)
await carregarTarefas();

            
} catch (error) {
    console.error("❌ Erro ao carregar dados do quadro:", error);

    Swal.fire({
        title: "Erro",
        text: "Não foi possível carregar as fases do quadro. Você poderá criá-las manualmente.",
        icon: "warning",
        confirmButtonColor: "#3085d6"
    });

    // Cria colunas básicas para que o usuário possa começar
    criarColunasPadrao();

    // Mesmo que dê erro, continua a carregar tarefas
    await carregarTarefas();
}


        // Configurar event listeners
        console.log("🔧 Configurando event listeners...");
        configurarEventListeners();
        
        console.log("✅ Sistema inicializado com sucesso!");
        
    } catch (error) {
        console.error("❌ Erro na inicialização:", error);
        Swal.fire({
            title: "Erro ao carregar dados",
            text: "Algo deu errado ao carregar o sistema. Deseja tentar novamente?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Recarregar",
            cancelButtonText: "Continuar assim",
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#aaa"
        }).then((result) => {
            if (result.isConfirmed) {
                location.reload(); // ⚠️ Agora tenta novamente, sem redirecionar
            }
        });        
    }
}

// Função para configurar event listeners
function configurarEventListeners() {

    // Fechar modal de fase ao clicar no botão de fechar
document.getElementById('closeCardModalBtn')?.addEventListener('click', () => {
    document.getElementById('cardModal')?.classList.remove('show');
});

    // Configurar drag and drop
    document.addEventListener('dragstart', (e) => {
        if (e.target.matches('.draggable')) {
            e.target.classList.add('dragging');
        }
    });

    document.addEventListener('dragend', (e) => {
        if (e.target.matches('.draggable')) {
            e.target.classList.remove('dragging');
        }
    });

    document.addEventListener('dragover', (e) => {
        if (e.target.matches('.drop-container')) {
            e.preventDefault();
        }
    });

    document.addEventListener('drop', async (e) => {
        const container = e.target.closest('.drop-container');
        if (container) {
            e.preventDefault();
            const draggable = document.querySelector('.dragging');
            if (draggable) {
                const taskId = draggable.dataset.taskId;
                const novaFaseId = container.closest('.kanban-column').dataset.phaseId;
                
                if (taskId && novaFaseId) {
                    try {
                        await moverTarefa(taskId, novaFaseId);
                        container.appendChild(draggable);
                        atualizarContadoresColunas();
                    } catch (error) {
                        // Em caso de erro, reverter a mudança visual
                        const faseOriginal = document.querySelector(`[data-phase-id="${draggable.dataset.phaseId}"] .drop-container`);
                        if (faseOriginal) {
                            faseOriginal.appendChild(draggable);
                        }
                    }
                }
            }
        }
    });

    document.addEventListener('click', async (e) => {
        if (e.processed) return;
        e.processed = true;
    
        // Botão Novo Card
        if (e.target.closest('#newCardBtn')) {
            console.log("🧩 Abrindo modal de Fase");
            const modal = document.getElementById('cardModal');
            console.log("🔍 Modal encontrado:", modal);
            if (modal) {
                console.log("📋 Estado atual do modal:", modal.style.display, modal.classList.toString());
                modal.style.display = 'flex';
                modal.classList.add('show');
                console.log("✅ Modal aberto. Novo estado:", modal.style.display, modal.classList.toString());
                
                // Carregar fases na tabela
                await window.carregarFasesNaTabela();
            } else {
                console.error("❌ Modal não encontrado!");
            }
            return;
        }
    
        // Botão Nova Tarefa
        if (e.target.closest('#newTaskBtn')) {
            console.log("📝 Abrindo modal de Tarefa");
            console.log("🔍 Board ID atual:", window.__quadroId);
            const modal = document.getElementById('taskModal');
            if (modal) {
                modal.style.display = 'flex';
                modal.classList.add('show');
            }
            return;
        }
    
        // Botão Editar Tarefa
        if (e.target.matches('.btn-edit-task') || e.target.closest('.btn-edit-task')) {
            const taskCard = e.target.closest('.task-card');
            if (taskCard) {
                const taskId = taskCard.dataset.taskId;
                try {
                    const tarefa = await buscarTarefa(taskId);
                    console.log('📝 Abrindo modal de edição:', tarefa);
                    // Aqui você pode preencher o modal
                } catch (error) {
                    console.error('Erro ao carregar dados da tarefa');
                }
            }
        }
    
        // Botão Excluir Tarefa
        if (e.target.matches('.btn-delete-task') || e.target.closest('.btn-delete-task')) {
            const taskCard = e.target.closest('.task-card');
            if (taskCard) {
                const taskId = taskCard.dataset.taskId;
                await excluirTarefa(taskId);
            }
        }
    });
    
    // Alternar visibilidade do menu flutuante ao clicar no botão "+"
const actionButton = document.getElementById('actionButton');
const actionMenu = document.getElementById('actionMenu');

if (actionButton && actionMenu) {
    actionButton.addEventListener('click', () => {
        actionMenu.classList.toggle('show');
    });    

    // Fechar o menu se clicar fora
    document.addEventListener('click', (event) => {
        setTimeout(() => {
            if (!actionMenu.contains(event.target) && !actionButton.contains(event.target)) {
                actionMenu.style.display = 'none';
            }
        }, 100); // pequeno delay evita conflito com o clique que abre
    });    
}


    console.log("✅ Event listeners configurados com sucesso");
}

// Funções para ações de tarefas (placeholder)
function editarTarefa(taskId) {
    console.log(`📝 Editando tarefa ${taskId}`);
    // Implementar lógica de edição
}

// ÚNICO EVENT LISTENER - Inicializar sistema quando o DOM estiver carregado
document.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 DOM carregado - Inicializando sistema...");
    
    // Configurar botões de modal
    const newCardBtn = document.getElementById('newCardBtn');
    const newTaskBtn = document.getElementById('newTaskBtn');
    const closeCardModalBtn = document.getElementById('closeCardModalBtn');
    const closeTaskModalBtn = document.getElementById('closeTaskModalBtn');
    
    console.log("🔍 Botões encontrados:", {
        newCardBtn: !!newCardBtn,
        newTaskBtn: !!newTaskBtn,
        closeCardModalBtn: !!closeCardModalBtn,
        closeTaskModalBtn: !!closeTaskModalBtn
    });
    
    // Event listener para abrir modal de card
    if (newCardBtn) {
        newCardBtn.addEventListener('click', async () => {
            console.log("🧩 Botão Novo Card clicado");
            const modal = document.getElementById('cardModal');
            console.log("🔍 Modal encontrado:", modal);
            if (modal) {
                console.log("📋 Estado atual do modal:", modal.style.display, modal.classList.toString());
                modal.style.display = 'flex';
                modal.classList.add('show');
                console.log("✅ Modal aberto. Novo estado:", modal.style.display, modal.classList.toString());
                
                // Carregar fases na tabela
                await window.carregarFasesNaTabela();
            } else {
                console.error("❌ Modal não encontrado!");
            }
        });
    }
    
    // Event listener para abrir modal de tarefa
    if (newTaskBtn) {
        newTaskBtn.addEventListener('click', () => {
            console.log("📝 Botão Nova Tarefa clicado");
            const modal = document.getElementById('taskModal');
            if (modal) {
                modal.style.display = 'flex';
                modal.classList.add('show');
            }
        });
    }
    
    // Event listener para fechar modal de card
    if (closeCardModalBtn) {
        closeCardModalBtn.addEventListener('click', () => {
            console.log("🔒 Fechando modal de card");
            const modal = document.getElementById('cardModal');
            if (modal) {
                modal.style.display = 'none';
                modal.classList.remove('show');
            }
        });
    }
    
    // Event listener para fechar modal de tarefa
    if (closeTaskModalBtn) {
        closeTaskModalBtn.addEventListener('click', () => {
            console.log("🔒 Fechando modal de tarefa");
            const modal = document.getElementById('taskModal');
            if (modal) {
                modal.style.display = 'none';
                modal.classList.remove('show');
            }
        });
    }
    
    // Event listener para o formulário de tarefa
    const tarefaForm = document.getElementById('tarefaForm');
    if (tarefaForm) {
        tarefaForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log("📝 Formulário de tarefa submetido");
            
            try {
                // Coletar dados do formulário
                const dadosTarefa = {
                    title: document.getElementById('tituloTarefa').value.trim(),
                    description: document.getElementById('descricao').value.trim(),
                    priority: parseInt(document.getElementById('prioridade').value),
                    dueDate: new Date(document.getElementById('dataEntrega').value).toISOString(),
                    boardId: window.__quadroId || 1,
                    phaseId: parseInt(document.getElementById('fase').value)
                };
                
                // Adicionar clientId apenas se não for null
                const clientId = parseInt(document.getElementById('cliente').value);
                if (clientId && !isNaN(clientId)) {
                    dadosTarefa.clientId = clientId;
                }
                
                // Adicionar collaboratorId apenas se não for null
                const collaboratorId = parseInt(document.getElementById('colaborador').value);
                if (collaboratorId && !isNaN(collaboratorId)) {
                    dadosTarefa.collaboratorId = collaboratorId;
                }
                
                console.log("📋 Dados da tarefa coletados:", dadosTarefa);
                
                // Validar dados obrigatórios
                if (!dadosTarefa.title || !dadosTarefa.priority || !dadosTarefa.dueDate || !dadosTarefa.phaseId) {
                    alert('Por favor, preencha todos os campos obrigatórios.');
                    return;
                }
                
                // Validar boardId
                if (!dadosTarefa.boardId || dadosTarefa.boardId <= 0) {
                    console.error("❌ Board ID inválido:", dadosTarefa.boardId);
                    alert('Board ID inválido. Verifique se você está acessando um quadro válido.');
                    return;
                }
                
                // Log detalhado dos dados finais
                console.log("📤 Dados finais para envio:", JSON.stringify(dadosTarefa, null, 2));
                console.log("🔍 Tipos dos dados:");
                console.log("  - title:", typeof dadosTarefa.title, dadosTarefa.title);
                console.log("  - priority:", typeof dadosTarefa.priority, dadosTarefa.priority);
                console.log("  - dueDate:", typeof dadosTarefa.dueDate, dadosTarefa.dueDate);
                console.log("  - boardId:", typeof dadosTarefa.boardId, dadosTarefa.boardId);
                console.log("  - phaseId:", typeof dadosTarefa.phaseId, dadosTarefa.phaseId);
                if (dadosTarefa.clientId) console.log("  - clientId:", typeof dadosTarefa.clientId, dadosTarefa.clientId);
                if (dadosTarefa.collaboratorId) console.log("  - collaboratorId:", typeof dadosTarefa.collaboratorId, dadosTarefa.collaboratorId);
                
                console.log('✅ Validação dos dados passou');
                
                // Criar a tarefa
                const novaTarefa = await criarTarefa(dadosTarefa);
                console.log("✅ Tarefa criada:", novaTarefa);
                
                // Fechar modal e limpar formulário
                const modal = document.getElementById('taskModal');
                if (modal) {
                    modal.style.display = 'none';
                    modal.classList.remove('show');
                }
                
                // Limpar formulário
                tarefaForm.reset();
                
            } catch (error) {
                console.error("❌ Erro ao criar tarefa:", error);
                alert('Erro ao criar tarefa: ' + error.message);
            }
        });
    }
    
    // Carregar dados nos selects quando o modal de tarefa abrir
    if (newTaskBtn) {
        newTaskBtn.addEventListener('click', async () => {
            console.log("📝 Carregando dados para o modal de tarefa");
            
            try {
                // Carregar colaboradores
                await carregarColaboradores();
                
                // Carregar clientes
                await carregarClientes();
                
                // Carregar fases
                await carregarFases();
                
            } catch (error) {
                console.error("❌ Erro ao carregar dados:", error);
            }
        });
    }
    
    // Fechar modais ao clicar fora
    document.addEventListener('click', (e) => {
        const cardModal = document.getElementById('cardModal');
        const taskModal = document.getElementById('taskModal');
        
        if (e.target === cardModal) {
            cardModal.style.display = 'none';
            cardModal.classList.remove('show');
            console.log("🔒 Modal de card fechado (clique fora)");
        }
        
        if (e.target === taskModal) {
            taskModal.style.display = 'none';
            taskModal.classList.remove('show');
            console.log("🔒 Modal de tarefa fechado (clique fora)");
        }
    });
    
    // Fechar modais com ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const cardModal = document.getElementById('cardModal');
            const taskModal = document.getElementById('taskModal');
            
            if (cardModal && cardModal.style.display === 'flex') {
                cardModal.style.display = 'none';
                cardModal.classList.remove('show');
            }
            
            if (taskModal && taskModal.style.display === 'flex') {
                taskModal.style.display = 'none';
                taskModal.classList.remove('show');
            }
        }
    });
    
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

    inicializarSistema();
});

// Criação de nova fase (card)
document.getElementById('formNovaFase')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nomeFase = document.getElementById('nomeFase')?.value.trim();
    const descricaoFase = document.getElementById('descricaoFase')?.value.trim();
    const submitBtn = document.querySelector('#formNovaFase .btn-save');
    const editingPhaseId = submitBtn.dataset.editingPhaseId;

    if (!nomeFase) {
        window.mostrarNotificacao("Nome da fase é obrigatório.", "warning");
        return;
    }

    try {
        if (editingPhaseId) {
            // Modo de edição
            console.log(`📝 Atualizando fase ${editingPhaseId}:`, {
                name: nomeFase,
                description: descricaoFase
            });

            const response = await window.authManager.fetchWithAuth(
                window.API_CONFIG.BASE_URL + `/phases/${editingPhaseId}`,
                {
                    method: 'PUT',
                    body: JSON.stringify({
                        name: nomeFase,
                        description: descricaoFase
                    })
                }
            );

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`Erro ao atualizar fase: ${response.status} - ${errorData}`);
            }

            const faseAtualizada = await response.json();
            console.log("✅ Fase atualizada com sucesso:", faseAtualizada);

            // Resetar formulário para modo de criação
            submitBtn.textContent = 'Salvar Fase';
            delete submitBtn.dataset.editingPhaseId;

            window.mostrarNotificacao("Fase atualizada com sucesso!", "success");
        } else {
            // Modo de criação
            // Buscar fases existentes para calcular a sequência
            let sequence = 1;
            try {
                const responseFases = await window.authManager.fetchWithAuth(
                    window.API_CONFIG.BASE_URL + `/phases`
                );
                
                if (responseFases.ok) {
                    const fasesExistentes = await responseFases.json();
                    sequence = fasesExistentes.length + 1;
                }
            } catch (error) {
                console.warn("⚠️ Não foi possível buscar fases existentes, usando sequência 1");
            }

            console.log("📝 Criando nova fase:", {
                name: nomeFase,
                description: descricaoFase,
                sequence: sequence
            });

            const response = await window.authManager.fetchWithAuth(
                window.API_CONFIG.BASE_URL + `/phases`,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        name: nomeFase,
                        description: descricaoFase,
                        sequence: sequence
                    })
                }
            );

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`Erro ao criar fase: ${response.status} - ${errorData}`);
            }

            const novaFase = await response.json();
            console.log("✅ Fase criada com sucesso:", novaFase);

            window.mostrarNotificacao("Fase criada com sucesso!", "success");
        }

        // Limpar formulário
        e.target.reset();

        // Recarregar tabela de fases
        await window.carregarFasesNaTabela();

    } catch (error) {
        console.error("❌ Erro ao processar fase:", error);
        window.mostrarNotificacao("Erro ao processar fase. Tente novamente.", "error");
    }
});

// Função para carregar fases quando o modal abrir
async function carregarFasesQuandoModalAbrir() {
    await window.carregarFasesNaTabela();
}
  
  // Botão de fechar do modal
  document.getElementById('closeCardModalBtn')?.addEventListener('click', () => {
    const modal = document.getElementById('cardModal');
    if (modal) {
      modal.style.display = 'none';
      modal.classList.remove('show');
    }
  });

  // Botão de fechar do modal de tarefa
  document.getElementById('closeTaskModalBtn')?.addEventListener('click', () => {
    const modal = document.getElementById('taskModal');
    if (modal) {
      modal.style.display = 'none';
      modal.classList.remove('show');
    }
  });

  // Fechar modais ao clicar fora deles
  document.addEventListener('click', (e) => {
    const cardModal = document.getElementById('cardModal');
    const taskModal = document.getElementById('taskModal');
    
    if (e.target === cardModal) {
      cardModal.style.display = 'none';
      cardModal.classList.remove('show');
    }
    
    if (e.target === taskModal) {
      taskModal.style.display = 'none';
      taskModal.classList.remove('show');
    }
  });

  // Fechar modais com tecla ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const cardModal = document.getElementById('cardModal');
      const taskModal = document.getElementById('taskModal');
      
      if (cardModal && cardModal.style.display === 'flex') {
        cardModal.style.display = 'none';
        cardModal.classList.remove('show');
      }
      
      if (taskModal && taskModal.style.display === 'flex') {
        taskModal.style.display = 'none';
        taskModal.classList.remove('show');
      }
    }
  });
  

// Função para decodificar JWT (sem verificar assinatura)
window.decodeJWT = function(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('Erro ao decodificar JWT:', error);
        return null;
    }
};

// Função para verificar se o usuário tem permissão SUPERIOR
window.isSuperiorUser = function() {
    try {
        // Verificar via StorageUtils primeiro
        if (typeof StorageUtils !== 'undefined') {
            const isSuperior = StorageUtils.isSuperiorUser();
            console.log('🔐 Verificação via StorageUtils.isSuperiorUser():', isSuperior);
            return isSuperior;
        }
        
        // Fallback para localStorage direto
        const isSuperior = localStorage.getItem('isUsuarioSuperior');
        console.log('🔐 Verificação via localStorage direto:', isSuperior);
        return isSuperior === 'true';
    } catch (error) {
        console.error('Erro ao verificar permissão de usuário:', error);
        return false;
    }
};

// Função para verificar se o usuário tem permissão para ações administrativas
window.hasAdminPermission = function() {
    const hasPermission = window.isSuperiorUser();
    console.log('🔐 Usuário tem permissão administrativa:', hasPermission);
    return hasPermission;
};

// Função para carregar colaboradores no select
async function carregarColaboradores() {
    try {
        console.log('👥 Carregando colaboradores...');
        
        const token = window.authManager ? window.authManager.getToken() : localStorage.getItem('accessToken');
        if (!token) {
            console.error('❌ Token não encontrado');
            return;
        }
        
        const response = await fetch(`${window.API_CONFIG.BASE_URL}/collaborators`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const colaboradores = await response.json();
        console.log('✅ Colaboradores carregados:', colaboradores);
        
        const selectColaborador = document.getElementById('colaborador');
        if (selectColaborador) {
            selectColaborador.innerHTML = '<option value="">Selecione um colaborador</option>';
            
            colaboradores.forEach(colaborador => {
                const option = document.createElement('option');
                option.value = colaborador.id_collaborator || colaborador.id;
                option.textContent = colaborador.name || colaborador.nome;
                selectColaborador.appendChild(option);
            });
        }
        
    } catch (error) {
        console.error('❌ Erro ao carregar colaboradores:', error);
    }
}

// Função para carregar clientes no select
async function carregarClientes() {
    try {
        console.log('🏢 Carregando clientes...');
        
        const token = window.authManager ? window.authManager.getToken() : localStorage.getItem('accessToken');
        if (!token) {
            console.error('❌ Token não encontrado');
            return;
        }
        
        const response = await fetch(`${window.API_CONFIG.BASE_URL}/clients`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const clientes = await response.json();
        console.log('✅ Clientes carregados:', clientes);
        
        const selectCliente = document.getElementById('cliente');
        if (selectCliente) {
            selectCliente.innerHTML = '<option value="">Selecione um cliente</option>';
            
            clientes.forEach(cliente => {
                const option = document.createElement('option');
                option.value = cliente.id_client || cliente.id;
                option.textContent = cliente.name || cliente.nome;
                selectCliente.appendChild(option);
            });
        }
        
    } catch (error) {
        console.error('❌ Erro ao carregar clientes:', error);
    }
}

// Função para carregar fases no select (apenas fases do board atual)
async function carregarFases() {
    try {
        console.log('📋 Carregando fases do board...');
        
        // Verificar se temos um board ID
        const boardId = window.__quadroId;
        if (!boardId || boardId <= 0) {
            console.error('❌ Board ID inválido:', boardId);
            alert('Board ID inválido. Verifique se você está acessando um quadro válido.');
            return;
        }
        
        // Buscar fases específicas do board
        console.log(`🔍 Buscando fases do board ${boardId}...`);
        const response = await window.authManager.fetchWithAuth(
            window.API_CONFIG.BASE_URL + `/boards/${boardId}/phases`
        );
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const fases = await response.json();
        console.log(`✅ Fases do board ${boardId} carregadas:`, fases);
        
        const selectFase = document.getElementById('fase');
        if (selectFase) {
            selectFase.innerHTML = '<option value="">Selecione uma fase</option>';
            
            if (fases.length === 0) {
                console.warn('⚠️ Nenhuma fase encontrada para este quadro');
                selectFase.innerHTML = '<option value="">Nenhuma fase disponível</option>';
                alert('Este quadro não possui fases. Adicione fases primeiro via "Novo Card".');
                return;
            }
            
            fases.forEach(fase => {
                const option = document.createElement('option');
                option.value = fase.idPhase || fase.id_phase || fase.id;
                option.textContent = fase.name || fase.nome;
                selectFase.appendChild(option);
            });
            
            console.log(`✅ ${fases.length} fases carregadas no select`);
        }
        
    } catch (error) {
        console.error('❌ Erro ao carregar fases:', error);
        alert('Erro ao carregar fases: ' + error.message);
    }
}
  
  // Botão de fechar do modal
  document.getElementById('closeCardModalBtn')?.addEventListener('click', () => {
    const modal = document.getElementById('cardModal');
    if (modal) {
      modal.style.display = 'none';
      modal.classList.remove('show');
    }
  });

  // Botão de fechar do modal de tarefa
  document.getElementById('closeTaskModalBtn')?.addEventListener('click', () => {
    const modal = document.getElementById('taskModal');
    if (modal) {
      modal.style.display = 'none';
      modal.classList.remove('show');
    }
  });

  // Fechar modais ao clicar fora deles
  document.addEventListener('click', (e) => {
    const cardModal = document.getElementById('cardModal');
    const taskModal = document.getElementById('taskModal');
    
    if (e.target === cardModal) {
      cardModal.style.display = 'none';
      cardModal.classList.remove('show');
    }
    
    if (e.target === taskModal) {
      taskModal.style.display = 'none';
      taskModal.classList.remove('show');
    }
  });

  // Fechar modais com tecla ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const cardModal = document.getElementById('cardModal');
      const taskModal = document.getElementById('taskModal');
      
      if (cardModal && cardModal.style.display === 'flex') {
        cardModal.style.display = 'none';
        cardModal.classList.remove('show');
      }
      
      if (taskModal && taskModal.style.display === 'flex') {
        taskModal.style.display = 'none';
        taskModal.classList.remove('show');
      }
    }
  });
  

// Função para decodificar JWT (sem verificar assinatura)
window.decodeJWT = function(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('Erro ao decodificar JWT:', error);
        return null;
    }
};

// Função para verificar se o usuário tem permissão SUPERIOR
window.isSuperiorUser = function() {
    try {
        // Verificar via StorageUtils primeiro
        if (typeof StorageUtils !== 'undefined') {
            const isSuperior = StorageUtils.isSuperiorUser();
            console.log('🔐 Verificação via StorageUtils.isSuperiorUser():', isSuperior);
            return isSuperior;
        }
        
        // Fallback para localStorage direto
        const isSuperior = localStorage.getItem('isUsuarioSuperior');
        console.log('🔐 Verificação via localStorage direto:', isSuperior);
        return isSuperior === 'true';
    } catch (error) {
        console.error('Erro ao verificar permissão de usuário:', error);
        return false;
    }
};

// Função para verificar se o usuário tem permissão para ações administrativas
window.hasAdminPermission = function() {
    const hasPermission = window.isSuperiorUser();
    console.log('🔐 Usuário tem permissão administrativa:', hasPermission);
    return hasPermission;
};

  
