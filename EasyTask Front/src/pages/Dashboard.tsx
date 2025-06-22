import React, { useEffect, useState } from 'react';
import { Card } from 'primereact/card';
import { Chart } from 'primereact/chart';
import { ProgressBar } from 'primereact/progressbar';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import '../styles/dashboard.css';

interface DashboardData {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  tasksByPhase: {
    phase: string;
    count: number;
  }[];
  tasksByPriority: {
    priority: string;
    count: number;
  }[];
  recentTasks: {
    id: number;
    title: string;
    phase: string;
    priority: string;
    dueDate: string;
  }[];
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await api.get('/api/dashboard');
        setData(response.data);
      } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

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

  const chartData = {
    tasksByPhase: {
      labels: data?.tasksByPhase.map(item => item.phase) || [],
      datasets: [
        {
          data: data?.tasksByPhase.map(item => item.count) || [],
          backgroundColor: ['#1890ff', '#52c41a', '#faad14', '#ff4d4f'],
        },
      ],
    },
    tasksByPriority: {
      labels: data?.tasksByPriority.map(item => item.priority) || [],
      datasets: [
        {
          data: data?.tasksByPriority.map(item => item.count) || [],
          backgroundColor: data?.tasksByPriority.map(item => getPriorityColor(item.priority)) || [],
        },
      ],
    },
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <h1>Dashboard</h1>
      <p className="welcome-message">Bem-vindo(a), {user?.name}!</p>

      <div className="dashboard-grid">
        <Card className="summary-card">
          <div className="summary-content">
            <h3>Total de Tarefas</h3>
            <p className="summary-number">{data?.totalTasks || 0}</p>
          </div>
        </Card>

        <Card className="summary-card">
          <div className="summary-content">
            <h3>Tarefas Concluídas</h3>
            <p className="summary-number success">{data?.completedTasks || 0}</p>
            <ProgressBar
              value={(data?.completedTasks || 0) / (data?.totalTasks || 1) * 100}
              showValue={false}
            />
          </div>
        </Card>

        <Card className="summary-card">
          <div className="summary-content">
            <h3>Tarefas Pendentes</h3>
            <p className="summary-number warning">{data?.pendingTasks || 0}</p>
            <ProgressBar
              value={(data?.pendingTasks || 0) / (data?.totalTasks || 1) * 100}
              showValue={false}
              color="#faad14"
            />
          </div>
        </Card>
      </div>

      <div className="dashboard-grid">
        <Card title="Tarefas por Fase" className="chart-card">
          <Chart type="pie" data={chartData.tasksByPhase} />
        </Card>

        <Card title="Tarefas por Prioridade" className="chart-card">
          <Chart type="pie" data={chartData.tasksByPriority} />
        </Card>
      </div>

      <Card title="Tarefas Recentes" className="recent-tasks-card">
        <div className="recent-tasks-list">
          {data?.recentTasks.map(task => (
            <div key={task.id} className="recent-task-item">
              <div className="task-info">
                <h4>{task.title}</h4>
                <span className={`priority-badge ${task.priority.toLowerCase()}`}>
                  {task.priority}
                </span>
              </div>
              <div className="task-meta">
                <span className="phase-badge">{task.phase}</span>
                <span className="due-date">
                  Vence em: {new Date(task.dueDate).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default Dashboard; 