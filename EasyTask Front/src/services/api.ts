import axios from 'axios';
import { toast } from 'react-toastify';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8080'
});

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('@EasyTask:token');
      localStorage.removeItem('@EasyTask:user');
      window.location.href = '/login';
    }

    if (error.response?.status === 403) {
      toast.error('Você não tem permissão para realizar esta ação');
    }

    if (error.response?.data?.message) {
      toast.error(error.response.data.message);
    } else {
      toast.error('Ocorreu um erro inesperado');
    }

    return Promise.reject(error);
  }
);

export default api; 