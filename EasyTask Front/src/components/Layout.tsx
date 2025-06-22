import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Menubar } from 'primereact/menubar';
import { Button } from 'primereact/button';
import { Sidebar } from 'primereact/sidebar';

const Layout: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const menuItems = [
    {
      label: 'Dashboard',
      icon: 'pi pi-home',
      command: () => navigate('/dashboard')
    },
    {
      label: 'Tarefas',
      icon: 'pi pi-list',
      command: () => navigate('/tasks')
    },
    {
      label: 'Clientes',
      icon: 'pi pi-users',
      command: () => navigate('/clients')
    },
    {
      label: 'Relatórios',
      icon: 'pi pi-chart-bar',
      command: () => navigate('/reports')
    }
  ];

  const end = (
    <div className="flex align-items-center gap-2">
      <span className="font-bold">{user?.name}</span>
      <Button
        icon="pi pi-sign-out"
        onClick={signOut}
        className="p-button-rounded p-button-text"
        tooltip="Sair"
      />
    </div>
  );

  return (
    <div className="layout-wrapper">
      <Menubar
        model={menuItems}
        end={end}
        className="layout-menubar"
      />

      <div className="layout-content">
        <Outlet />
      </div>

      <Sidebar
        visible={sidebarVisible}
        onHide={() => setSidebarVisible(false)}
        className="layout-sidebar"
      >
        <div className="flex flex-column gap-2">
          {menuItems.map((item) => (
            <Button
              key={item.label}
              label={item.label}
              icon={item.icon}
              className="p-button-text"
              onClick={() => {
                item.command?.();
                setSidebarVisible(false);
              }}
            />
          ))}
        </div>
      </Sidebar>
    </div>
  );
};

export default Layout; 