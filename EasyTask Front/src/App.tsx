import React from 'react';
import { PrimeReactProvider } from 'primereact/api';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import AppRoutes from './routes';

// Importando os estilos do PrimeReact
import 'primereact/resources/themes/lara-light-indigo/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';

// Importando os estilos globais
import './styles/global.css';

const App: React.FC = () => {
  return (
    <PrimeReactProvider>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </PrimeReactProvider>
  );
};

export default App; 