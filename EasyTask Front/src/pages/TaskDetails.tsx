import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { InputTextarea } from 'primereact/inputtextarea';
import { Timeline } from 'primereact/timeline';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import '../styles/task-details.css';

interface Task {
  id: number;
  title: string;
  description: string;
  phase: string;
  priority: string;
  dueDate: string;
  status: string;
  assignedTo: {
    id: number;
    name: string;
  };
  client: {
    id: number;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface Comment {
  id: number;
  content: string;
  author: {
    id: number;
    name: string;
  };
  createdAt: string;
}

interface LogEntry {
  id: number;
  action: string;
  description: string;
  user: {
    id: number;
    name: string;
  };
  createdAt: string;
}

const TaskDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useAuth();
  const [task, setTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    fetchTaskDetails();
  }, [id]);

  const fetchTaskDetails = async () => {
    try {
      const [taskResponse, commentsResponse, logsResponse] = await Promise.all([
        api.get(`/api/tasks/${id}`),
        api.get(`/api/tasks/${id}/comments`),
        api.get(`/api/tasks/${id}/logs`),
      ]);

      setTask(taskResponse.data);
      setComments(commentsResponse.data);
      setLogs(logsResponse.data);
    } catch (error) {
      console.error('Erro ao carregar detalhes da tarefa:', error);
      showToast('error', 'Erro ao carregar detalhes da tarefa');
    } finally {
      setLoading(false);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmittingComment(true);
    try {
      const response = await api.post(`/api/tasks/${id}/comments`, {
        content: newComment,
      });
      setComments(prev => [...prev, response.data]);
      setNewComment('');
      showToast('success', 'Comentário adicionado com sucesso');
    } catch (error) {
      console.error('Erro ao adicionar comentário:', error);
      showToast('error', 'Erro ao adicionar comentário');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Tem certeza que deseja excluir esta tarefa?')) return;

    try {
      await api.delete(`/api/tasks/${id}`);
      showToast('success', 'Tarefa excluída com sucesso');
      navigate('/tasks');
    } catch (error) {
      console.error('Erro ao excluir tarefa:', error);
      showToast('error', 'Erro ao excluir tarefa');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'alta':
        return '#ff4d4f';
      case 'média':
        return '#faad14';
      case 'baixa':
        return '#52c41a';
      default:
        return '#1890ff';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pendente':
        return '#ff4d4f';
      case 'em andamento':
        return '#1890ff';
      case 'concluída':
        return '#52c41a';
      case 'cancelada':
        return '#666';
      default:
        return '#1890ff';
    }
  };

  if (loading) {
    return (
      <div className="task-details-container">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="task-details-container">
        <div className="error-message">
          Tarefa não encontrada
        </div>
      </div>
    );
  }

  return (
    <div className="task-details-container">
      <div className="task-details-header">
        <div className="header-content">
          <h1>{task.title}</h1>
          <div className="task-meta">
            <span className={`priority-badge ${task.priority.toLowerCase()}`}>
              {task.priority}
            </span>
            <span className={`status-badge ${task.status.toLowerCase()}`}>
              {task.status}
            </span>
          </div>
        </div>
        <div className="header-actions">
          <Button
            label="Editar"
            icon="pi pi-pencil"
            onClick={() => navigate(`/tasks/edit/${id}`)}
          />
          <Button
            label="Excluir"
            icon="pi pi-trash"
            className="p-button-danger"
            onClick={handleDelete}
          />
        </div>
      </div>

      <div className="task-details-grid">
        <Card className="task-info-card">
          <div className="info-section">
            <h3>Descrição</h3>
            <p>{task.description}</p>
          </div>

          <div className="info-section">
            <h3>Detalhes</h3>
            <div className="info-grid">
              <div className="info-item">
                <label>Fase:</label>
                <span>{task.phase}</span>
              </div>
              <div className="info-item">
                <label>Data de Entrega:</label>
                <span>{new Date(task.dueDate).toLocaleDateString()}</span>
              </div>
              <div className="info-item">
                <label>Responsável:</label>
                <span>{task.assignedTo.name}</span>
              </div>
              <div className="info-item">
                <label>Cliente:</label>
                <span>{task.client.name}</span>
              </div>
              <div className="info-item">
                <label>Criado em:</label>
                <span>{new Date(task.createdAt).toLocaleString()}</span>
              </div>
              <div className="info-item">
                <label>Última atualização:</label>
                <span>{new Date(task.updatedAt).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="comments-card">
          <h3>Comentários</h3>
          <form onSubmit={handleCommentSubmit} className="comment-form">
            <InputTextarea
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="Digite seu comentário..."
              rows={3}
              autoResize
            />
            <Button
              type="submit"
              label="Comentar"
              icon="pi pi-send"
              loading={submittingComment}
              disabled={!newComment.trim()}
            />
          </form>

          <div className="comments-list">
            {comments.map(comment => (
              <div key={comment.id} className="comment-item">
                <div className="comment-header">
                  <span className="comment-author">{comment.author.name}</span>
                  <span className="comment-date">
                    {new Date(comment.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="comment-content">{comment.content}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="history-card">
          <h3>Histórico</h3>
          <Timeline
            value={logs}
            content={log => (
              <div className="log-item">
                <div className="log-header">
                  <span className="log-action">{log.action}</span>
                  <span className="log-date">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="log-description">{log.description}</p>
                <span className="log-user">por {log.user.name}</span>
              </div>
            )}
          />
        </Card>
      </div>
    </div>
  );
};

export default TaskDetails; 