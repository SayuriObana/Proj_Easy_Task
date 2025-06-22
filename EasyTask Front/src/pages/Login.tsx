import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useAuth } from '../contexts/AuthContext';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Button } from 'primereact/button';
import { toast } from 'react-toastify';

const loginSchema = yup.object().shape({
  email: yup.string()
    .email('Email inválido')
    .required('Email é obrigatório'),
  password: yup.string()
    .required('Senha é obrigatória')
});

const Login: React.FC = () => {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(loginSchema)
  });

  const onSubmit = async (data: any) => {
    try {
      setLoading(true);
      await signIn(data);
      navigate('/dashboard');
    } catch (error) {
      toast.error('Erro ao fazer login. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>EasyTask</h1>
          <p>Gerencie suas tarefas de forma simples e eficiente</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="login-form">
          <div className="form-field">
            <label htmlFor="email">Email</label>
            <InputText
              id="email"
              type="email"
              className={errors.email ? 'p-invalid' : ''}
              {...control.register('email')}
            />
            {errors.email && (
              <small className="p-error">{errors.email.message}</small>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="password">Senha</label>
            <Password
              id="password"
              className={errors.password ? 'p-invalid' : ''}
              {...control.register('password')}
              toggleMask
              feedback={false}
            />
            {errors.password && (
              <small className="p-error">{errors.password.message}</small>
            )}
          </div>

          <Button
            type="submit"
            label={loading ? 'Entrando...' : 'Entrar'}
            className="p-button-primary"
            loading={loading}
            style={{ width: '100%' }}
          />
        </form>
      </div>
    </div>
  );
};

export default Login; 