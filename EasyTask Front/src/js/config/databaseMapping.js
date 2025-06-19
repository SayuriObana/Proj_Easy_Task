// Mapeamento de campos entre Frontend e Banco de Dados
// Este arquivo garante consistência nos nomes dos campos

const DATABASE_MAPPING = {
    // Mapeamento de IDs
    IDS: {
        CLIENT: {
            DATABASE: 'id_client'
        },
        COLLABORATOR: {
            DATABASE: 'id_collaborator'
        },
        TASK: {
            DATABASE: 'id_task'
        },
        PHASE: {
            DATABASE: 'id_phase'
        },
        COMMENT: {
            DATABASE: 'id_comment'
        }
    },

    // Mapeamento de campos de Cliente
    CLIENT: {
        name: 'name',
        email: 'email', 
        phone: 'phone',
        cnpj: 'cnpj'
    },

    // Mapeamento de campos de Colaborador
    COLLABORATOR: {
        name: 'name',
        email: 'email',
        password: 'password',
        phone: 'phone',
        position: 'position',
        access_level: 'access_level'
    },

    // Mapeamento de campos de Tarefa
    TASK: {
        title: 'title',
        description: 'description',
        priority: 'priority',
        due_date: 'due_date',
        creation_date: 'creation_date',
        id_phase: 'id_phase',
        id_client: 'id_client',
        id_collaborator: 'id_collaborator'
    },

    // Mapeamento de campos de Fase
    PHASE: {
        name: 'name',
        description: 'description',
        sequence: 'sequence'
    },

    // Mapeamento de campos de Comentário
    COMMENT: {
        content: 'content',
        date_time: 'date_time',
        id_task: 'id_task',
        id_collaborator: 'id_collaborator'
    }
};

// Funções utilitárias para conversão
const DatabaseUtils = {
    // Converter campos do frontend para o formato do banco
    toDatabaseFormat(entity, data) {
        const mapping = DATABASE_MAPPING[entity];
        if (!mapping) return data;

        const converted = {};
        for (const [frontendField, databaseField] of Object.entries(mapping)) {
            if (data.hasOwnProperty(frontendField)) {
                converted[databaseField] = data[frontendField];
            }
        }
        return converted;
    },

    // Converter campos do banco para o formato do frontend
    toFrontendFormat(entity, data) {
        const mapping = DATABASE_MAPPING[entity];
        if (!mapping) return data;

        const converted = {};
        for (const [frontendField, databaseField] of Object.entries(mapping)) {
            if (data.hasOwnProperty(databaseField)) {
                converted[frontendField] = data[databaseField];
            }
        }
        return converted;
    },

    // Converter ID específico
    convertId(type, value, direction = 'toFrontend') {
        const idMapping = DATABASE_MAPPING.IDS[type];
        if (!idMapping) return value;

        if (direction === 'toFrontend') {
            return value; // Manter como está, o frontend deve se adaptar
        } else {
            return value; // Manter como está, o backend deve se adaptar
        }
    }
};

// Exportar para uso global
window.DATABASE_MAPPING = DATABASE_MAPPING;
window.DatabaseUtils = DatabaseUtils;

// Log de inicialização
console.log('🔧 Database mapping carregado:', DATABASE_MAPPING); 