import React, { createContext, useContext, useState, useCallback } from 'react';
import { Toast } from 'primereact/toast';

type ToastSeverity = 'success' | 'info' | 'warn' | 'error';

interface ToastContextData {
  showToast: (severity: ToastSeverity, message: string) => void;
}

const ToastContext = createContext<ToastContextData>({} as ToastContextData);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = useCallback((severity: ToastSeverity, message: string) => {
    if (toast) {
      toast.show({
        severity,
        summary: getToastTitle(severity),
        detail: message,
        life: 3000,
      });
    }
  }, [toast]);

  const getToastTitle = (severity: ToastSeverity): string => {
    switch (severity) {
      case 'success':
        return 'Sucesso';
      case 'info':
        return 'Informação';
      case 'warn':
        return 'Atenção';
      case 'error':
        return 'Erro';
      default:
        return '';
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      <Toast ref={ref => setToast(ref)} />
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast deve ser usado dentro de um ToastProvider');
  }

  return context;
};

export default ToastContext; 