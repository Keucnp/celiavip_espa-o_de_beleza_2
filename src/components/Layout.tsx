import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Wallet, 
  Calendar as CalendarIcon, 
  CheckSquare, 
  Users, 
  Settings,
  Sun,
  Moon,
  Sparkles,
  Palette,
  Plus,
  Github,
  Database,
  Upload,
  Download as DownloadIcon
} from 'lucide-react';
import { cn } from '../lib/utils';
import { googleSheetsService, storageService } from '../services/dataService';
import { notificationService } from '../services/notificationService';
import { motion, AnimatePresence } from 'motion/react';
import { toast, ToastContainer } from './Toast';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) return savedTheme === 'dark';
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
    } catch (e) {
      console.warn('Layout: LocalStorage access failed', e);
    }
    return false;
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGitHubAuthenticated, setIsGitHubAuthenticated] = useState(false);

  useEffect(() => {
    checkGitHubStatus();
    
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GITHUB_AUTH_SUCCESS') {
        setIsGitHubAuthenticated(true);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const checkGitHubStatus = async () => {
    try {
      const res = await fetch('/api/auth/github/status');
      const data = await res.json();
      setIsGitHubAuthenticated(data.isAuthenticated);
    } catch (e) {
      console.error('Failed to check GitHub status:', e);
    }
  };

  const handleGitHubConnect = async () => {
    try {
      const res = await fetch('/api/auth/github/url');
      const { url } = await res.json();
      window.open(url, 'github_auth', 'width=600,height=700');
    } catch (e) {
      console.error('Failed to connect to GitHub:', e);
    }
  };

  const handleGitHubLogout = async () => {
    try {
      await fetch('/api/auth/github/logout', { method: 'POST' });
      setIsGitHubAuthenticated(false);
    } catch (e) {
      console.error('Failed to logout from GitHub:', e);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
      setIsStandalone(!!standalone);
    }
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    toast.info('Sincronização Iniciada', 'Aguarde enquanto carregamos os dados mais recentes...');
    try {
      // Trigger requests to clear cache or refetch
      await Promise.all([
        googleSheetsService.fetchData('Financeiro'),
        googleSheetsService.fetchData('Tarefas'),
        googleSheetsService.fetchData('Clientes')
      ]);
      toast.success('Sincronização Concluída', 'Seus dados estão atualizados!');
      // Give a tiny delay so they see the success message before reload
      setTimeout(() => window.location.reload(), 1000);
    } catch (e) {
      console.error('Sync failed:', e);
      toast.error('Erro na Sincronização', 'Não foi possível conectar às planilhas.');
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    // Global notification check every minute
    const interval = setInterval(async () => {
      if (notificationService.hasPermission()) {
        const tasks = await googleSheetsService.fetchData('Tarefas');
        notificationService.checkAndNotify(tasks);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const handleExportBackup = () => {
    const backup = {
      finance: storageService.getFinance(),
      tasks: storageService.getTasks(),
      clients: storageService.getClients(),
      timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `celiavip_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Backup Concluído', 'Arquivo de backup salvo com sucesso.');
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const backup = JSON.parse(event.target?.result as string);
        if (backup.finance) localStorage.setItem('organizapro_finance', JSON.stringify(backup.finance));
        if (backup.tasks) localStorage.setItem('organizapro_tasks', JSON.stringify(backup.tasks));
        if (backup.clients) localStorage.setItem('organizapro_clients', JSON.stringify(backup.clients));
        
        toast.success('Importação Concluída', 'Dados restaurados com sucesso. Recarregando...');
        setTimeout(() => window.location.reload(), 2000);
      } catch (err) {
        console.error('Import failed:', err);
        toast.error('Erro na Importação', 'Arquivo de backup inválido.');
      }
    };
    reader.readAsText(file);
  };

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  const navItems = [
    { to: '/', icon: CalendarIcon, label: 'Início' },
    { to: '/finance', icon: Wallet, label: 'Finanças' },
    { to: '/tasks', icon: CheckSquare, label: 'Tarefas' },
    { to: '/clients', icon: Users, label: 'Clientes' },
    { to: '/dashboard', icon: LayoutDashboard, label: 'Resumo' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 pb-24 md:pb-0 md:pl-20">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 h-full w-20 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-50">
        <div className="p-4 flex flex-col items-center gap-8 h-full">
          <button 
            onClick={handleSync}
            className={cn(
              "w-14 h-14 flex items-center justify-center transition-all active:scale-95 bg-white dark:bg-slate-900 rounded-2xl shadow-md border border-slate-100 dark:border-slate-800 hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-900/50",
              isSyncing && "animate-pulse"
            )}
            title="Sincronizar dados"
          >
            <img 
              src="/logo-final.png?v=3" 
              alt="Logo" 
              className="w-11 h-11 object-contain" 
              referrerPolicy="no-referrer"
              onError={(e) => console.error('Logo failed to load (desktop side):', (e.target as HTMLImageElement).src)}
            />
          </button>
          
          <nav className="flex flex-col gap-4 flex-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => cn(
                  "p-3 rounded-xl transition-all duration-200 group relative",
                  isActive 
                    ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400" 
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
              >
                <item.icon size={24} />
                <span className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                  {item.label}
                </span>
              </NavLink>
            ))}
          </nav>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-3 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            title="Configurações"
          >
            <Settings size={24} />
          </button>

          <button
            onClick={toggleTheme}
            className="p-3 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Nav - Enhanced for Native Feel */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 px-2 pt-2 pb-safe-area flex justify-around items-center z-50 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        <style dangerouslySetInnerHTML={{ __html: `
          .pb-safe-area {
            padding-bottom: calc(0.5rem + env(safe-area-inset-bottom));
          }
        `}} />
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => cn(
              "flex flex-col items-center gap-1.5 p-2 px-3 rounded-2xl transition-all duration-300",
              isActive 
                ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/20" 
                : "text-slate-400 active:scale-90"
            )}
          >
            <item.icon size={22} />
            <span className="text-[9px] font-bold uppercase tracking-wider">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800 px-6 py-3 flex flex-col z-50">
        <div className="flex justify-between items-center w-full">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 flex items-center justify-center bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-1">
              <img 
                src="/logo-final.png?v=3" 
                alt="Logo" 
                className="w-full h-full object-contain" 
                referrerPolicy="no-referrer"
                onError={(e) => console.error('Logo failed to load (mobile header):', (e.target as HTMLImageElement).src)}
              />
            </div>
            <span className="font-bold text-slate-900 dark:text-white">CéliaVip</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 transition-all active:scale-90"
              title="Alternar Tema"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className={cn(
                "p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 transition-all active:scale-90",
                isSyncing && "animate-spin"
              )}
            >
              <Settings size={20} className={isSyncing ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </header>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800"
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Settings className="text-indigo-500" size={24} />
                    Configurações
                  </h2>
                  <button 
                    onClick={() => setIsSettingsOpen(false)}
                    className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                  >
                    <Plus className="rotate-45" size={24} />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Sync Section */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">Sincronização</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Atualizar dados do Google Planilhas</p>
                      </div>
                      <button
                        onClick={handleSync}
                        disabled={isSyncing}
                        className={cn(
                          "px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold transition-all active:scale-95 disabled:opacity-50",
                          isSyncing && "animate-pulse"
                        )}
                      >
                        {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
                      </button>
                    </div>
                  </div>

                  {/* GitHub Section */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-slate-900 text-white">
                          <Github size={20} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900 dark:text-white">GitHub</h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {isGitHubAuthenticated ? 'Conectado' : 'Não conectado'}
                          </p>
                        </div>
                      </div>
                      {isGitHubAuthenticated ? (
                        <button
                          onClick={handleGitHubLogout}
                          className="px-4 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-bold transition-all active:scale-95"
                        >
                          Sair
                        </button>
                      ) : (
                        <button
                          onClick={handleGitHubConnect}
                          className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold transition-all active:scale-95"
                        >
                          Conectar
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Theme Section */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">Tema</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Alternar entre claro e escuro</p>
                      </div>
                      <button
                        onClick={toggleTheme}
                        className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 transition-all active:scale-95"
                      >
                        {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                      </button>
                    </div>
                  </div>

                  {/* Backup Section */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <Database size={18} className="text-indigo-500" />
                        Backup de Dados Local
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Exportar ou importar dados deste dispositivo</p>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={handleExportBackup}
                          className="flex-1 flex items-center justify-center gap-2 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100 transition-all active:scale-95"
                        >
                          <DownloadIcon size={14} />
                          Exportar
                        </button>
                        
                        <label className="flex-1 flex items-center justify-center gap-2 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100 transition-all active:scale-95 cursor-pointer">
                          <Upload size={14} />
                          Importar
                          <input 
                            type="file" 
                            accept=".json" 
                            className="hidden" 
                            onChange={handleImportBackup}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 text-center">
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                    CéliaVip v1.0.0
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4 md:p-8 pt-20 md:pt-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={window.location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>

        <footer className="mt-8 pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-center">
          <div className="px-4 py-1 bg-slate-100 dark:bg-slate-900 rounded-full border border-slate-200 dark:border-slate-800">
            <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 tracking-wide whitespace-nowrap">
              Criado por <span className="text-indigo-500 dark:text-indigo-400 font-bold">©LocalHost_keu</span>
            </p>
          </div>
        </footer>
      </main>
      <ToastContainer />
    </div>
  );
}
