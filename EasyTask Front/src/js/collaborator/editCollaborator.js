document.addEventListener("DOMContentLoaded", () => {
    // Verificar permissão de SUPERIOR para editar colaboradores
    const isUsuarioSuperior = localStorage.getItem('isUsuarioSuperior') === 'true';
    if (!isUsuarioSuperior) {
        Swal.fire('Acesso Negado', 'Apenas usuários com nível SUPERIOR podem editar colaboradores.', 'error');
        window.location.href = '../collaborator/collaboratorListScreen.html';
        return;
    }

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

    const form = document.getElementById("editarColaboradorForm");
    const nomeInput = document.getElementById("nome");
    const emailInput = document.getElementById("email");
    const telefoneInput = document.getElementById("telefone");
    const cargoInput = document.getElementById("cargo");
    const saveButton = document.getElementById("saveChanges");
    const cancelButton = document.getElementById("cancelEdit");

    // Simula os dados do colaborador a serem carregados
    const colaborador = {
        nome: "Luiz Flavio",
        email: "luizflavio@example.com",
        telefone: "(11) 98765-4321",
        cargo: "Desenvolvedor",
    };

    // Carrega os dados no formulário
    nomeInput.value = colaborador.nome;
    emailInput.value = colaborador.email;
    telefoneInput.value = colaborador.telefone;
    cargoInput.value = colaborador.cargo;

    // Salvar alterações
    saveButton.addEventListener("click", () => {
        const updatedColaborador = {
            nome: nomeInput.value,
            email: emailInput.value,
            telefone: telefoneInput.value,
            cargo: cargoInput.value,
        };
    
        console.log("Colaborador atualizado:", updatedColaborador);
    
        Swal.fire({
            title: "Sucesso!",
            text: "Colaborador salvo com sucesso!",
            icon: "success",
            confirmButtonColor: "#28a745", // Verde para sucesso
            timer: 1500,
            showConfirmButton: false
        }).then(() => {
            window.location.href = "colaborador.html"; // Redireciona após o alerta
        });
    });
    
    // Cancelar edição
    cancelButton.addEventListener("click", () => {
        if (confirm("Deseja cancelar as alterações?")) {
            window.location.href = "colaborador.html"; // Redireciona para a página principal
        }
    });

    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    console.log(id); // Mostra o ID "123"

    // --- ALTERAÇÃO DE SENHA ---
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    const passwordModal = document.getElementById('passwordModal');
    const closePasswordModal = document.getElementById('closePasswordModal');
    const changePasswordForm = document.getElementById('changePasswordForm');

    // Abrir modal
    changePasswordBtn.addEventListener('click', () => {
        passwordModal.style.display = 'flex';
    });
    // Fechar modal
    closePasswordModal.addEventListener('click', () => {
        passwordModal.style.display = 'none';
        changePasswordForm.reset();
    });
    // Fechar ao clicar fora
    window.addEventListener('click', (e) => {
        if (e.target === passwordModal) {
            passwordModal.style.display = 'none';
            changePasswordForm.reset();
        }
    });

    // Enviar alteração de senha
    changePasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const oldPassword = document.getElementById('oldPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        if (newPassword !== confirmPassword) {
            Swal.fire('Erro', 'A nova senha e a confirmação não coincidem.', 'error');
            return;
        }
        // Pega o ID do colaborador da URL
        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');
        if (!id) {
            Swal.fire('Erro', 'ID do colaborador não encontrado.', 'error');
            return;
        }
        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch(`http://localhost:8080/collaborators/${id}/change-password`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    currentPassword: oldPassword,
                    newPassword: newPassword
                })
            });
            if (response.ok) {
                Swal.fire('Sucesso', 'Senha alterada com sucesso!', 'success');
                passwordModal.style.display = 'none';
                changePasswordForm.reset();
            } else {
                const errorText = await response.text();
                Swal.fire('Erro', 'Não foi possível alterar a senha. ' + errorText, 'error');
            }
        } catch (err) {
            Swal.fire('Erro', 'Erro ao conectar ao servidor.', 'error');
        }
    });
});
