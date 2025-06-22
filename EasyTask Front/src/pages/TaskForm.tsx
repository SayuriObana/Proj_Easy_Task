import React, { useEffect, useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { Button } from 'primereact/button';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import api from '../services/api';
import '../styles/task-form.css';

interface TaskFormData {
  title: string;
  description: string;
  phase: string;
  priority: string;
  dueDate: Date | null;
  status: string;
  assignedTo: string;
  client: string;
}

interface Collaborator {
  id: number;
  name: string;
}

interface Client {
  id: number;
  name: string;
}

const TaskForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  const phases = ['Backlog', 'To Do', 'In Progress', 'Review', 'Done'];
  const priorities = ['Baixa', 'Média', 'Alta'];
  const statuses = ['Pendente', 'Em Andamento', 'Concluída', 'Cancelada'];

  const validationSchema = Yup.object({
    title: Yup.string()
      .required('O título é obrigatório')
      .max(100, 'O título deve ter no máximo 100 caracteres'),
    description: Yup.string()
      .required('A descrição é obrigatória')
      .max(500, 'A descrição deve ter no máximo 500 caracteres'),
    phase: Yup.string().required('A fase é obrigatória'),
    priority: Yup.string().required('A prioridade é obrigatória'),
    dueDate: Yup.date()
      .required('A data de entrega é obrigatória')
      .min(new Date(), 'A data de entrega deve ser futura'),
    status: Yup.string().required('O status é obrigatório'),
    assignedTo: Yup.string().required('O responsável é obrigatório'),
    client: Yup.string().required('O cliente é obrigatório'),
  });

  const formik = useFormik<TaskFormData>({
    initialValues: {
      title: '',
      description: '',
      phase: '',
      priority: '',
      dueDate: null,
      status: '',
      assignedTo: '',
      client: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      setLoading(true);
      try {
        if (id) {
          await api.put(`/api/tasks/${id}`, values);
          showToast('success', 'Tarefa atualizada com sucesso');
        } else {
          await api.post('/api/tasks', values);
          showToast('success', 'Tarefa criada com sucesso');
        }
        navigate('/tasks');
      } catch (error) {
        console.error('Erro ao salvar tarefa:', error);
        showToast('error', 'Erro ao salvar tarefa');
      } finally {
        setLoading(false);
      }
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [collaboratorsResponse, clientsResponse] = await Promise.all([
          api.get('/api/collaborators'),
          api.get('/api/clients'),
        ]);

        setCollaborators(collaboratorsResponse.data);
        setClients(clientsResponse.data);

        if (id) {
          const taskResponse = await api.get(`/api/tasks/${id}`);
          const task = taskResponse.data;
          formik.setValues({
            ...task,
            dueDate: new Date(task.dueDate),
          });
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        showToast('error', 'Erro ao carregar dados');
      }
    };

    fetchData();
  }, [id]);

  return (
    <div className="task-form-container">
      <div className="task-form-header">
        <h1>{id ? 'Editar Tarefa' : 'Nova Tarefa'}</h1>
      </div>

      <form onSubmit={formik.handleSubmit} className="task-form">
        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="title">Título *</label>
            <InputText
              id="title"
              name="title"
              value={formik.values.title}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className={formik.touched.title && formik.errors.title ? 'p-invalid' : ''}
            />
            {formik.touched.title && formik.errors.title && (
              <small className="error-message">{formik.errors.title}</small>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="description">Descrição *</label>
            <InputTextarea
              id="description"
              name="description"
              value={formik.values.description}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              rows={4}
              className={formik.touched.description && formik.errors.description ? 'p-invalid' : ''}
            />
            {formik.touched.description && formik.errors.description && (
              <small className="error-message">{formik.errors.description}</small>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="phase">Fase *</label>
            <Dropdown
              id="phase"
              name="phase"
              value={formik.values.phase}
              options={phases}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              placeholder="Selecione a fase"
              className={formik.touched.phase && formik.errors.phase ? 'p-invalid' : ''}
            />
            {formik.touched.phase && formik.errors.phase && (
              <small className="error-message">{formik.errors.phase}</small>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="priority">Prioridade *</label>
            <Dropdown
              id="priority"
              name="priority"
              value={formik.values.priority}
              options={priorities}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              placeholder="Selecione a prioridade"
              className={formik.touched.priority && formik.errors.priority ? 'p-invalid' : ''}
            />
            {formik.touched.priority && formik.errors.priority && (
              <small className="error-message">{formik.errors.priority}</small>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="dueDate">Data de Entrega *</label>
            <Calendar
              id="dueDate"
              name="dueDate"
              value={formik.values.dueDate}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              showIcon
              dateFormat="dd/mm/yy"
              minDate={new Date()}
              className={formik.touched.dueDate && formik.errors.dueDate ? 'p-invalid' : ''}
            />
            {formik.touched.dueDate && formik.errors.dueDate && (
              <small className="error-message">{formik.errors.dueDate}</small>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="status">Status *</label>
            <Dropdown
              id="status"
              name="status"
              value={formik.values.status}
              options={statuses}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              placeholder="Selecione o status"
              className={formik.touched.status && formik.errors.status ? 'p-invalid' : ''}
            />
            {formik.touched.status && formik.errors.status && (
              <small className="error-message">{formik.errors.status}</small>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="assignedTo">Responsável *</label>
            <Dropdown
              id="assignedTo"
              name="assignedTo"
              value={formik.values.assignedTo}
              options={collaborators.map(c => ({ label: c.name, value: c.id.toString() }))}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              placeholder="Selecione o responsável"
              className={formik.touched.assignedTo && formik.errors.assignedTo ? 'p-invalid' : ''}
            />
            {formik.touched.assignedTo && formik.errors.assignedTo && (
              <small className="error-message">{formik.errors.assignedTo}</small>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="client">Cliente *</label>
            <Dropdown
              id="client"
              name="client"
              value={formik.values.client}
              options={clients.map(c => ({ label: c.name, value: c.id.toString() }))}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              placeholder="Selecione o cliente"
              className={formik.touched.client && formik.errors.client ? 'p-invalid' : ''}
            />
            {formik.touched.client && formik.errors.client && (
              <small className="error-message">{formik.errors.client}</small>
            )}
          </div>
        </div>

        <div className="form-actions">
          <Button
            type="button"
            label="Cancelar"
            icon="pi pi-times"
            className="p-button-text"
            onClick={() => navigate('/tasks')}
          />
          <Button
            type="submit"
            label={id ? 'Atualizar' : 'Criar'}
            icon="pi pi-check"
            loading={loading}
          />
        </div>
      </form>
    </div>
  );
};

export default TaskForm; 