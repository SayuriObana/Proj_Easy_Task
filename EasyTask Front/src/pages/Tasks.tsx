import React, { useEffect, useState } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Dialog } from 'primereact/dialog';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import api from '../services/api';
import '../styles/tasks.css';

interface Task {
  id: number;
  title: string;
  description: string;
  phase: string;
  priority: string;
  dueDate: string;
  status: string;
  assignedTo: string;
  client: string;
}

const Tasks: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    phase: '',
    priority: '',
    status: '',
  });
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const phases = ['Backlog', 'To Do', 'In Progress', 'Review', 'Done'];
  const priorities = ['Baixa', 'Média', 'Alta'];
  const statuses = ['Pendente', 'Em Andamento', 'Concluída', 'Cancelada'];

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await api.get('/api/tasks');
      setTasks(response.data);
    } catch (error) {
      console.error('Erro ao carregar tarefas:', error);
      showToast('error', 'Erro ao carregar tarefas');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const filteredTasks = tasks.filter(task => {
    return (
      task.title.toLowerCase().includes(filters.search.toLowerCase()) &&
      (!filters.phase || task.phase === filters.phase) &&
      (!filters.priority || task.priority === filters.priority) &&
      (!filters.status || task.status === filters.status)
    );
  });

  const handleDelete = async () => {
    if (!selectedTask) return;

    try {
      await api.delete(`/api/tasks/${selectedTask.id}`);
      showToast('success', 'Tarefa excluída com sucesso');
      fetchTasks();
    } catch (error) {
      console.error('Erro ao excluir tarefa:', error);
      showToast('error', 'Erro ao excluir tarefa');
    } finally {
      setDeleteDialogVisible(false);
      setSelectedTask(null);
    }
  };

  const priorityTemplate = (rowData: Task) => {
    return (
      <span className={`priority-badge ${rowData.priority.toLowerCase()}`}>
        {rowData.priority}
      </span>
    );
  };

  const statusTemplate = (rowData: Task) => {
    return (
      <span className={`status-badge ${rowData.status.toLowerCase()}`}>
        {rowData.status}
      </span>
    );
  };

  const actionsTemplate = (rowData: Task) => {
    return (
      <div className="action-buttons">
        <Button
          icon="pi pi-pencil"
          className="p-button-rounded p-button-text"
          onClick={() => navigate(`/tasks/edit/${rowData.id}`)}
        />
        <Button
          icon="pi pi-trash"
          className="p-button-rounded p-button-text p-button-danger"
          onClick={() => {
            setSelectedTask(rowData);
            setDeleteDialogVisible(true);
          }}
        />
      </div>
    );
  };

  return (
    <div className="tasks-container">
      <div className="tasks-header">
        <h1>Tarefas</h1>
        <Button
          label="Nova Tarefa"
          icon="pi pi-plus"
          onClick={() => navigate('/tasks/new')}
        />
      </div>

      <div className="filters-container">
        <div className="filter-group">
          <span className="p-input-icon-left">
            <i className="pi pi-search" />
            <InputText
              value={filters.search}
              onChange={e => handleFilterChange('search', e.target.value)}
              placeholder="Buscar tarefas..."
            />
          </span>
        </div>

        <div className="filter-group">
          <Dropdown
            value={filters.phase}
            options={['', ...phases]}
            onChange={e => handleFilterChange('phase', e.value)}
            placeholder="Filtrar por fase"
            className="filter-dropdown"
          />
        </div>

        <div className="filter-group">
          <Dropdown
            value={filters.priority}
            options={['', ...priorities]}
            onChange={e => handleFilterChange('priority', e.value)}
            placeholder="Filtrar por prioridade"
            className="filter-dropdown"
          />
        </div>

        <div className="filter-group">
          <Dropdown
            value={filters.status}
            options={['', ...statuses]}
            onChange={e => handleFilterChange('status', e.value)}
            placeholder="Filtrar por status"
            className="filter-dropdown"
          />
        </div>
      </div>

      <DataTable
        value={filteredTasks}
        loading={loading}
        paginator
        rows={10}
        rowsPerPageOptions={[5, 10, 20, 50]}
        className="tasks-table"
        emptyMessage="Nenhuma tarefa encontrada"
      >
        <Column field="title" header="Título" sortable />
        <Column field="phase" header="Fase" sortable />
        <Column field="priority" header="Prioridade" body={priorityTemplate} sortable />
        <Column field="status" header="Status" body={statusTemplate} sortable />
        <Column field="dueDate" header="Data de Entrega" sortable />
        <Column field="assignedTo" header="Responsável" sortable />
        <Column field="client" header="Cliente" sortable />
        <Column body={actionsTemplate} style={{ width: '100px' }} />
      </DataTable>

      <Dialog
        visible={deleteDialogVisible}
        onHide={() => setDeleteDialogVisible(false)}
        header="Confirmar Exclusão"
        modal
        footer={
          <div>
            <Button
              label="Cancelar"
              icon="pi pi-times"
              onClick={() => setDeleteDialogVisible(false)}
              className="p-button-text"
            />
            <Button
              label="Excluir"
              icon="pi pi-trash"
              onClick={handleDelete}
              className="p-button-danger"
            />
          </div>
        }
      >
        <p>
          Tem certeza que deseja excluir a tarefa "{selectedTask?.title}"?
          Esta ação não pode ser desfeita.
        </p>
      </Dialog>
    </div>
  );
};

export default Tasks; 