# EasyTask - Sistema de Gerenciamento de Tarefas

## 📋 Descrição

O EasyTask é um sistema completo de gerenciamento de tarefas e projetos que permite organizar equipes, clientes e tarefas de forma eficiente. O sistema oferece uma interface intuitiva para gerenciar quadros de tarefas, colaboradores, clientes e relatórios.

## 🚀 Funcionalidades

### ✨ Principais Recursos
- **Sistema de Login/Cadastro**: Autenticação segura de usuários
- **Quadros de Tarefas**: Organização visual de tarefas em fases
- **Gestão de Colaboradores**: Cadastro e gerenciamento de equipe
- **Gestão de Clientes**: Controle de clientes e projetos
- **Sistema de Relatórios**: Análises e estatísticas detalhadas
- **Tema Claro/Escuro**: Interface adaptável às preferências do usuário
- **Design Responsivo**: Funciona em desktop e dispositivos móveis

### 🎯 Módulos Disponíveis
- **Login System**: Autenticação e cadastro de usuários
- **Board Management**: Criação e gerenciamento de quadros
- **Task Management**: Criação, edição e movimentação de tarefas
- **Collaborator Management**: Gestão completa de colaboradores
- **Client Management**: Controle de clientes e projetos
- **Reports**: Relatórios detalhados e estatísticas
- **Logs**: Sistema de logs para auditoria

## 🛠️ Tecnologias Utilizadas

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **UI/UX**: Font Awesome, SweetAlert2
- **Backend**: API REST (configurada para localhost:8080)
- **Design**: Interface moderna com tema claro/escuro

## 📁 Estrutura do Projeto

```
EasyTask Front/
├── pages/                    # Páginas HTML do sistema
│   ├── login/               # Sistema de autenticação
│   ├── board/               # Gerenciamento de quadros
│   ├── task/                # Gerenciamento de tarefas
│   ├── collaborator/        # Gestão de colaboradores
│   ├── client/              # Gestão de clientes
│   ├── report/              # Sistema de relatórios
│   ├── logs/                # Sistema de logs
│   └── globalMenu/          # Menu principal
├── src/                     # Recursos do sistema
│   ├── css/                 # Estilos CSS organizados por módulo
│   ├── js/                  # Scripts JavaScript organizados por módulo
│   ├── imagens/             # Imagens e ícones do sistema
│   └── components/          # Componentes reutilizáveis
└── node_modules/            # Dependências (se aplicável)
```

## 🚀 Como Executar

### Pré-requisitos
- Servidor web (Apache, Nginx, ou servidor local)
- Backend API rodando em `http://localhost:8080`

### Passos para Execução

1. **Clone o repositório**:
   ```bash
   git clone [URL_DO_REPOSITORIO]
   cd projeto-easytask-main
   ```

2. **Configure o servidor backend**:
   - Certifique-se de que a API está rodando em `http://localhost:8080`
   - Verifique se todos os endpoints estão funcionando

3. **Inicie o servidor web**:
   - Use um servidor local como Live Server (VS Code)
   - Ou configure Apache/Nginx para servir os arquivos

4. **Acesse o sistema**:
   - Abra `pages/login/loginSystem.html` no navegador
   - Ou use o arquivo `index.html` na raiz do projeto

## 🔧 Configuração da API

O sistema está configurado para se conectar com uma API REST. As configurações estão em `src/js/config/api.js`:

- **URL Base**: `http://localhost:8080`
- **Endpoints**: Configurados para todas as funcionalidades do sistema

## 📱 Páginas Principais

### 🔐 Login (`pages/login/loginSystem.html`)
- Sistema de autenticação
- Cadastro de novos usuários
- Tema claro/escuro

### 🏠 Menu Principal (`pages/globalMenu/mainMenu.html`)
- Dashboard principal
- Navegação para todos os módulos
- Informações do usuário logado

### 📋 Quadros (`pages/board/board.html`)
- Visualização de quadros de tarefas
- Gerenciamento de fases
- Movimentação de tarefas

### 👥 Colaboradores (`pages/collaborator/collaboratorListScreen.html`)
- Lista de colaboradores
- Cadastro e edição
- Gestão de perfis

### 👤 Clientes (`pages/client/clientListScreen.html`)
- Gestão de clientes
- Informações de projetos
- Histórico de atividades

### 📊 Relatórios (`pages/report/reportDashboard.html`)
- Dashboard de relatórios
- Estatísticas gerais
- Relatórios específicos por módulo

## 🎨 Temas e Personalização

O sistema suporta temas claro e escuro:
- **Tema Claro**: Interface clara e limpa
- **Tema Escuro**: Interface escura para melhor experiência noturna
- **Toggle**: Botão para alternar entre os temas

## 🔒 Segurança

- Autenticação baseada em tokens
- Validação de formulários
- Proteção contra XSS
- Logs de auditoria

## 📈 Relatórios Disponíveis

- **Relatório Geral**: Estatísticas do sistema
- **Relatório de Tarefas**: Análise de tarefas
- **Relatório de Colaboradores**: Performance da equipe
- **Relatório de Clientes**: Atividades por cliente
- **Relatório de Prioridades**: Análise de prioridades

## 🤝 Contribuição

Para contribuir com o projeto:

1. Faça um fork do repositório
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📞 Suporte

Para suporte técnico ou dúvidas:
- Abra uma issue no repositório
- Entre em contato com a equipe de desenvolvimento

## 📄 Licença

Este projeto está sob a licença [INSERIR LICENÇA].

---

**EasyTask** - Conectando talentos para resultados reais! 🐝 