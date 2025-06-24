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
        const boardId = window.__quadroId;
        if (!boardId) {
            throw new Error('ID do quadro não encontrado');
        }

        console.log(`🔗 Adicionando fase ${phaseId} ao quadro ${boardId}`);

        const response = await window.authManager.fetchWithAuth(
            `${window.API_CONFIG.BASE_URL}/boards/${boardId}/phases`,
            {
                method: 'POST',
                body: JSON.stringify({
                    phaseId: phaseId // CORREÇÃO: Enviando o objeto esperado pelo backend
                })
            }
        );

        if (!response.ok) {
            const errorData = await response.text();
            if (response.status === 409) { // Conflict
                throw new Error(`Esta fase já está no quadro.`);
            }
            throw new Error(`Erro ao adicionar fase: ${response.status} - ${errorData}`);
        }

        console.log("✅ Fase adicionada ao Kanban com sucesso");
        window.mostrarNotificacao("Fase adicionada ao quadro com sucesso!", "success");
        
        // Recarrega o kanban principal e as duas tabelas do modal
        await Promise.all([
            carregarFases(),
            carregarFasesDoQuadroNoModal(),
            carregarFasesNaTabela()
        ]);

    } catch (error) {
        console.error("❌ Erro ao adicionar fase ao Kanban:", error);
        window.mostrarNotificacao(error.message, "error");
    }
};

// Função para remover fase do quadro (não a exclui do sistema)
window.removerFaseDoQuadro = async function(phaseId) {
    const boardId = window.__quadroId;
    if (!boardId) {
        window.mostrarNotificacao("ID do quadro não encontrado.", "error");
        return;
    }

    const result = await Swal.fire({
        title: "Remover fase do quadro?",
        text: "A fase não será excluída do sistema, apenas deste quadro.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Sim, remover!",
        cancelButtonText: "Cancelar"
    });

    if (result.isConfirmed) {
        try {
            const response = await window.authManager.fetchWithAuth(
                `${window.API_CONFIG.BASE_URL}/boards/${boardId}/phases/${phaseId}`, 
                { method: 'DELETE' }
            );

            if (!response.ok) {
                throw new Error(`Erro ao remover fase: ${response.status}`);
            }

            window.mostrarNotificacao("Fase removida do quadro com sucesso!", "success");

            // Recarrega o kanban principal e as duas tabelas do modal
            await Promise.all([
                carregarFases(),
                carregarFasesDoQuadroNoModal(),
                carregarFasesNaTabela()
            ]);

        } catch (error) {
            console.error("❌ Erro ao remover fase do quadro:", error);
            window.mostrarNotificacao("Erro ao remover fase do quadro.", "error");
        }
    }
};

// Função para editar fase
window.editarFase = async function(id, nomeAtual, descricaoAtual) {
    console.log('✏️ Editando fase:', id);
    if (!id) {
        window.mostrarNotificacao('Erro: ID da fase não encontrado.', 'error');
        return;
    }
    
    if (!window.hasAdminPermission()) {
        Swal.fire('Acesso Negado', 'Apenas usuários SUPERIOR podem editar fases.', 'error');
        return;
    }
    
    const { value: formValues } = await Swal.fire({
        title: 'Editar Fase',
        html:
            `<input id="swal-input-name" class="swal2-input" value="${nomeAtual}" placeholder="Nome da Fase">` +
            `<textarea id="swal-input-description" class="swal2-textarea" placeholder="Descrição (opcional)">${descricaoAtual || ''}</textarea>`,
        focusConfirm: false,
        preConfirm: () => {
            const name = document.getElementById('swal-input-name').value;
            if (!name || name.trim() === '') {
                Swal.showValidationMessage(`Nome da fase é obrigatório!`);
                return false;
            }
            return {
                name: name,
                description: document.getElementById('swal-input-description').value
            };
        }
    });

    if (formValues) {
        try {
            const response = await window.authManager.fetchWithAuth(
                `${window.API_CONFIG.BASE_URL}/phases/${id}`, 
                {
                    method: 'PUT',
                    body: JSON.stringify({
                        name: formValues.name.trim(),
                        description: formValues.description ? formValues.description.trim() : null
                    })
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            }
            
            await response.json();
            window.mostrarNotificacao("Fase editada com sucesso!", "success");

            await Promise.all([
                carregarFases(),
                carregarFasesDoQuadroNoModal(),
                carregarFasesNaTabela()
            ]);

        } catch (error) {
            console.error('❌ Erro ao editar fase:', error);
            window.mostrarNotificacao('Erro ao editar fase: ' + error.message, "error");
        }
    }
};

// Função para excluir fase do sistema
window.excluirFase = async function(id) {
    console.log('🗑️ Excluindo fase do sistema:', id);
    if (!id) {
        window.mostrarNotificacao('Erro: ID da fase não encontrado.', 'error');
        return;
    }

    if (!window.hasAdminPermission()) {
        Swal.fire('Acesso Negado', 'Apenas usuários SUPERIOR podem excluir fases.', 'error');
        return;
    }

    const result = await Swal.fire({
        title: "Excluir esta fase permanentemente?",
        text: "Esta ação não pode ser desfeita e removerá a fase de todos os quadros.",
        icon: "error",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        confirmButtonText: "Sim, excluir!",
        cancelButtonText: "Cancelar"
    });

    if (result.isConfirmed) {
        try {
            const response = await window.authManager.fetchWithAuth(
                `${window.API_CONFIG.BASE_URL}/phases/${id}`, 
                { method: 'DELETE' }
            );

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Erro ao excluir fase: ${response.status} - ${errorText}`);
            }
            
            window.mostrarNotificacao("Fase excluída com sucesso!", "success");

            await Promise.all([
                carregarFases(),
                carregarFasesDoQuadroNoModal(),
                carregarFasesNaTabela()
            ]);
        
        } catch (error) {
            console.error('❌ Erro ao excluir fase:', error);
            window.mostrarNotificacao('Erro ao excluir fase: ' + error.message, 'error');
        }
    }
};

// Função para carregar fases na tabela do modal
window.carregarFasesNaTabela = async function() {
    console.log('🔄 Carregando fases disponíveis para adicionar...');
    
    const token = window.authManager ? window.authManager.getToken() : localStorage.getItem('accessToken');
    if (!token) {
        console.error('❌ Token não encontrado');
        return;
    }

    try {
        // Verificar se temos um board ID
        const boardId = window.__quadroId;
        if (!boardId || boardId <= 0) {
            console.error('❌ Board ID inválido:', boardId);
            throw new Error('Board ID inválido. Verifique se você está acessando um quadro válido.');
        }

        // Buscar todas as fases do sistema (endpoint que existe)
        console.log(`🔍 Buscando todas as fases do sistema...`);
        const response = await window.authManager.fetchWithAuth(
            window.API_CONFIG.BASE_URL + `/phases`
        );
          
        if (!response.ok) {
            throw new Error(`Erro ao buscar fases do sistema: ${response.status} ${response.statusText}`);
        }

        const allPhases = await response.json();
        console.log(`✅ Todas as fases do sistema recebidas:`, allPhases);

        // Buscar tarefas do board para verificar quais fases estão sendo usadas
        const tasksResponse = await window.authManager.fetchWithAuth(
            window.API_CONFIG.BASE_URL + `/tasks/boards/${boardId}`
        );
        
        let boardPhases = [];
        if (tasksResponse.ok) {
            const tasks = await tasksResponse.json();
            console.log(`✅ Tarefas do board ${boardId}:`, tasks);
            
            // Extrair fases únicas das tarefas
            const usedPhaseIds = [...new Set(tasks.map(task => 
                task.phaseId || task.phase?.idPhase || task.idPhase
            ).filter(id => id))];
            
            boardPhases = allPhases.filter(phase => 
                usedPhaseIds.includes(phase.idPhase)
            );
        }

        console.log(`✅ Fases do quadro ${boardId} identificadas:`, boardPhases);

        if (!boardPhases || boardPhases.length === 0) {
            console.warn("⚠️ Nenhuma fase encontrada para este quadro. Criando colunas padrão...");
            criarColunasPadrao();
        } else {
            renderizarFases(boardPhases);
        }

        // Carregar tarefas após criar as colunas
        await carregarTarefas();

    } catch (error) {
        console.error('❌ Erro ao gerar colunas Kanban:', error);
        window.mostrarNotificacao('Erro ao carregar fases do quadro. Tente novamente.', 'error');
        // Fallback para colunas padrão
        criarColunasPadrao();
    }
};

// Função para gerar colunas do Kanban (escopo global)
window.gerarColunasKanban = async function() {
    try {
        console.log(`🏗️ Gerando colunas Kanban...`);

        // Verificar se temos um board ID
        const boardId = window.__quadroId;
        if (!boardId || boardId <= 0) {
            console.error('❌ Board ID inválido:', boardId);
            throw new Error('Board ID inválido. Verifique se você está acessando um quadro válido.');
        }

        // Buscar apenas as fases do quadro específico
        console.log(`🔍 Buscando fases do quadro ${boardId}...`);
        const response = await window.authManager.fetchWithAuth(
            window.API_CONFIG.BASE_URL + `/phases/board/${boardId}`
        );
          
        if (!response.ok) {
            throw new Error(`Erro ao buscar fases do quadro: ${response.status} ${response.statusText}`);
        }

        const fases = await response.json();
        console.log(`✅ Fases do quadro ${boardId} recebidas:`, fases);

        if (!fases || fases.length === 0) {
            console.warn("⚠️ Nenhuma fase encontrada para este quadro. Criando colunas padrão...");
            criarColunasPadrao();
        } else {
            renderizarFases(fases);
        }

        // Carregar tarefas após criar as colunas
        await carregarTarefas();

    } catch (error) {
        console.error('❌ Erro ao gerar colunas Kanban:', error);
        window.mostrarNotificacao('Erro ao carregar fases do quadro. Tente novamente.', 'error');
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
        const boardId = window.__quadroId;
        console.log(`📋 Carregando tarefas do quadro ${boardId}...`);
        
        if (!boardId) {
            console.warn("⚠️ ID do quadro não encontrado, não é possível carregar tarefas.");
            return []; // Retorna array vazio se não houver boardId
        }

        const url = `${window.API_CONFIG.BASE_URL}/tasks/boards/${boardId}`;
        console.log(`📡 URL da requisição de tarefas: ${url}`);

        const response = await window.authManager.fetchWithAuth(url);
        if (!response.ok) {
            throw new Error(`Erro ao carregar tarefas: ${response.status}`);
        }

        const tarefas = await response.json();
        console.log(`✅ Tarefas carregadas:`, tarefas);
        return tarefas;

    } catch (error) {
        console.error('❌ Erro ao carregar tarefas:', error);
        window.mostrarNotificacao('Não foi possível carregar as tarefas.', 'error');
        return []; // Garante que um array seja sempre retornado, mesmo em caso de erro
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
    console.log("🚀 Inicializando sistema...");

    try {
        const urlParams = new URLSearchParams(window.location.search);
        const boardId = urlParams.get('id');
        
        if (!window.authManager.isAuthenticated()) {
            window.location.href = '../login/loginSystem.html';
            return;
        }

        if (boardId) {
            window.__quadroId = boardId;
            console.log(`✅ ID do Quadro definido como: ${window.__quadroId}`);

            const backendDisponivel = await verificarBackendDisponivel();
            if (backendDisponivel) {
                // Carrega tudo em paralelo
                const [allSystemPhases, boardTasks] = await Promise.all([
                    window.authManager.fetchWithAuth(`${window.API_CONFIG.BASE_URL}/phases`).then(res => res.json()),
                    carregarTarefas()
                ]);

                // Filtra as fases que estão em uso no quadro
                const usedPhaseIds = [...new Set(boardTasks.map(task => task.phase?.idPhase || task.idPhase).filter(id => id))];
                const boardPhases = allSystemPhases.filter(phase => usedPhaseIds.includes(phase.idPhase));

                console.log("✅ Fases do quadro (baseado em tarefas):", boardPhases);

                renderizarFases(boardPhases);
                boardTasks.forEach(adicionarTarefaAoQuadro);
                atualizarContadoresColunas();

            } else {
                mostrarMensagemBackendIndisponivel();
            }
        } else {
            console.error("❌ ID do quadro não encontrado na URL.");
            document.getElementById('kanbanBoard').innerHTML = 
                '<p class="error-message">ID do quadro não especificado na URL.</p>';
        }

        configurarEventListeners();
        console.log("✅ Sistema inicializado com sucesso!");

    } catch (error) {
        console.error("❌ Erro fatal na inicialização:", error);
        const kanbanBoard = document.getElementById('kanbanBoard');
        if (kanbanBoard) {
            kanbanBoard.innerHTML = `<p class="error-message">Ocorreu um erro ao carregar o quadro. Tente recarregar a página.</p>`;
        }
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
            console.log('Botão "Gerenciar Fases" clicado.');
            
            if (!window.hasAdminPermission()) {
                Swal.fire('Acesso Negado', 'Apenas usuários SUPERIOR podem gerenciar fases.', 'error');
                return;
            }

            // Limpa o formulário
            const form = document.getElementById('formNovaFase');
            if(form) {
                form.reset();
                const submitBtn = form.querySelector('.btn-save');
                submitBtn.textContent = 'Salvar Fase';
                delete submitBtn.dataset.editingPhaseId;
            }
            
            // Exibe o modal
            const modal = document.getElementById('cardModal');
            if (modal) {
                modal.style.display = 'flex';
                modal.classList.add('show');
            }
            
            // Carrega as duas tabelas em paralelo
            console.log("🔄 Carregando dados das fases para o modal...");
            await Promise.all([
                carregarFasesNaTabela(), // Carrega fases disponíveis
                carregarFasesDoQuadroNoModal() // Carrega fases do quadro
            ]);
            console.log("✅ Dados das fases do modal carregados.");
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
                    Swal.fire({
                        title: 'Campos obrigatórios',
                        text: 'Por favor, preencha todos os campos obrigatórios.',
                        icon: 'warning',
                        confirmButtonColor: '#3085d6'
                    });
                    return;
                }
                
                // Validar boardId
                if (!dadosTarefa.boardId || dadosTarefa.boardId <= 0) {
                    console.error("❌ Board ID inválido:", dadosTarefa.boardId);
                    Swal.fire({
                        title: 'Board inválido',
                        text: 'Board ID inválido. Verifique se você está acessando um quadro válido.',
                        icon: 'error',
                        confirmButtonColor: '#d33'
                    });
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
                tarefaForm.reset();
                
                Swal.fire({
                    title: 'Sucesso!',
                    text: 'Tarefa criada com sucesso!',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                });
            } catch (error) {
                console.error("❌ Erro ao criar tarefa:", error);
                Swal.fire({
                    title: 'Erro ao criar tarefa',
                    text: error.message || 'Erro desconhecido ao criar tarefa.',
                    icon: 'error',
                    confirmButtonColor: '#d33'
                });
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
        const boardId = window.__quadroId;
        console.log(`🔍 Buscando fases do quadro ${boardId}...`);
        
        if (!boardId) {
            throw new Error("ID do quadro é inválido");
        }
        
        const url = `${window.API_CONFIG.BASE_URL}/boards/${boardId}/phases`;
        console.log(`📡 URL da requisição: ${url}`);
        
        const response = await window.authManager.fetchWithAuth(url);

        if (!response.ok) {
            throw new Error(`Erro ao carregar fases: ${response.status}`);
        }

        const fases = await response.json();
        console.log("✅ Fases carregadas:", fases);

        if (!fases || fases.length === 0) {
            console.warn("⚠️ Nenhuma fase encontrada para este quadro. Criando colunas padrão...");
            criarColunasPadrao();
        } else {
            renderizarFases(fases);
        }
        return fases;

    } catch (error) {
        console.error("❌ Erro ao carregar fases:", error.message);

        // Exibir modal de erro apenas se o erro for 403
        if (error.message.includes('403')) {
            Swal.fire({
                title: 'Informação',
                text: 'Você não tem acesso a este conteúdo, mas pode continuar configurando manualmente.',
                icon: 'warning',
                confirmButtonText: 'OK'
            });
        }
        
        // Retorna um array vazio e renderiza colunas padrão para não quebrar a interface
        criarColunasPadrao();
        return [];
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

// *** Funções para o Modal de Gerenciamento de Fases ***

// Renderiza a tabela de fases QUE ESTÃO no quadro
function renderizarFasesDoQuadro(fases) {
    const tbody = document.getElementById('boardPhasesTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (!fases || fases.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Nenhuma fase vinculada a este quadro.</td></tr>';
        return;
    }
    fases.sort((a, b) => (a.sequence || 0) - (b.sequence || 0)).forEach(fase => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${fase.name}</td>
            <td>${fase.sequence || 'N/A'}</td>
            <td class="phase-actions">
                <button class="btn-remove-from-kanban" onclick="removerFaseDoQuadro(${fase.idPhase})">Remover</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Carrega as fases QUE ESTÃO no quadro e as renderiza
async function carregarFasesDoQuadroNoModal() {
    try {
        const boardId = window.__quadroId;
        console.log(`🔄 Carregando fases do quadro ${boardId}...`);
        if (!boardId) {
            renderizarFasesDoQuadro([]);
            return;
        }
        const response = await window.authManager.fetchWithAuth(`${window.API_CONFIG.BASE_URL}/boards/${boardId}/phases`);
        const fasesDoQuadro = response.ok ? await response.json() : [];
        console.log("✅ Fases do quadro recebidas:", fasesDoQuadro);
        renderizarFasesDoQuadro(fasesDoQuadro);
    } catch (error) {
        console.error("❌ Erro ao carregar fases do quadro:", error);
        renderizarFasesDoQuadro([]);
    }
}

// Renderiza a tabela de fases DISPONÍVEIS para adicionar
function renderizarFasesDisponiveis(fases) {
    const tbody = document.getElementById('phasesTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!fases || fases.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Todas as fases do sistema já estão neste quadro.</td></tr>';
        return;
    }
    
    fases.sort((a, b) => (a.sequence || 0) - (b.sequence || 0));

    fases.forEach(phase => {
        const row = document.createElement('tr');
        const safeName = phase.name.replace(/'/g, "&apos;").replace(/"/g, "&quot;");
        const safeDescription = (phase.description || '').replace(/'/g, "&apos;").replace(/"/g, "&quot;");

        row.innerHTML = `
            <td>${phase.name}</td>
            <td>${phase.description || ''}</td>
            <td>${phase.sequence || 'N/A'}</td>
            <td class="phase-actions">
                <button class="btn-add-to-kanban" onclick="adicionarFaseAoKanban(${phase.idPhase})" title="Adicionar ao Quadro">Adicionar</button>
                <button class="btn-edit-phase" onclick="editarFase(${phase.idPhase}, '${safeName}', '${safeDescription}')" title="Editar Fase">Editar</button>
                <button class="btn-delete-phase" onclick="excluirFase(${phase.idPhase})" title="Excluir Fase do Sistema">Excluir</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Carrega as fases DISPONÍVEIS (todas as do sistema - as do quadro) e as renderiza
async function carregarFasesNaTabela() {
    try {
        console.log("🔄 Carregando fases disponíveis...");
        const quadroId = window.__quadroId;
        if (!quadroId) {
            renderizarFasesDisponiveis([]);
            return;
        }

        const [allPhasesRes, boardPhasesRes] = await Promise.all([
            window.authManager.fetchWithAuth(`${window.API_CONFIG.BASE_URL}/phases`),
            window.authManager.fetchWithAuth(`${window.API_CONFIG.BASE_URL}/boards/${quadroId}/phases`)
        ]);

        const allPhases = allPhasesRes.ok ? await allPhasesRes.json() : [];
        const boardPhases = boardPhasesRes.ok ? await boardPhasesRes.json() : [];

        const boardPhaseIds = boardPhases.map(p => p.idPhase);
        const availablePhases = allPhases.filter(p => !boardPhaseIds.includes(p.idPhase));
        
        console.log("✅ Fases disponíveis para adicionar:", availablePhases);
        renderizarFasesDisponiveis(availablePhases);
        
    } catch (error) {
        console.error("❌ Erro ao carregar fases disponíveis:", error);
        renderizarFasesDisponiveis([]);
    }
}

// *** Fim das Funções do Modal ***

document.addEventListener('DOMContentLoaded', () => {
    // A inicialização principal agora é feita via inicializarSistema
    inicializarSistema();
});
  

