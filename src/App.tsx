import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Finance from './pages/Finance';
import Calendar from './pages/Calendar';
import Tasks from './pages/Tasks';
import Clients from './pages/Clients';
import { googleSheetsService } from './services/dataService';
import { notificationService } from './services/notificationService';

export default function App() {
  useEffect(() => {
    // Initial check
    const runCheck = async () => {
      try {
        const tasks = await googleSheetsService.fetchData('Tarefas');
        notificationService.checkAndNotify(tasks);
      } catch (e) {
        console.error('Background notification check failed:', e);
      }
    };

    runCheck();

    // Check every minute
    const interval = setInterval(runCheck, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Private Routes with Layout */}
        <Route path="/" element={<Layout><Calendar /></Layout>} />
        <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
        <Route path="/finance" element={<Layout><Finance /></Layout>} />
        <Route path="/tasks" element={<Layout><Tasks /></Layout>} />
        <Route path="/clients" element={<Layout><Clients /></Layout>} />
        
        {/* Fallback */}
        <Route path="*" element={<Layout><Calendar /></Layout>} />
      </Routes>
    </BrowserRouter>
  );
}
