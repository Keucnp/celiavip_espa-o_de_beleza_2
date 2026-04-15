import React, { useState, useEffect } from 'react';
import { Plus, CheckCircle2, Circle, Trash2, Calendar as CalendarIcon, Clock, Pencil } from 'lucide-react';
import { googleSheetsService } from '../services/dataService';
import { notificationService } from '../services/notificationService';
import { Task } from '../types';
import { formatDate, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [newTask, setNewTask] = useState<Partial<Task>>({
    status: 'pending',
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    reminderMinutes: 2
  });

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoading(true);
      const data = await googleSheetsService.fetchData('Tarefas');
      if (isMounted) {
        setTasks(data);
        setLoading(false);
        notificationService.checkAndNotify(data);
      }
    };
    load();
    setNotificationsEnabled(notificationService.hasPermission());
    return () => { isMounted = false; };
  }, []);

  async function loadTasks() {
    setLoading(true);
    const data = await googleSheetsService.fetchData('Tarefas');
    setTasks(data);
    setLoading(false);
    notificationService.checkAndNotify(data);
  }

  async function handleEnableNotifications() {
    const granted = await notificationService.requestPermission();
    setNotificationsEnabled(granted);
  }

  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    const task: Task = {
      id: editingId || Math.random().toString(36).substr(2, 9),
      title: newTask.title || '',
      description: newTask.description || '',
      date: newTask.date || new Date().toISOString().split('T')[0],
      time: newTask.time,
      reminderMinutes: newTask.reminderMinutes,
      status: (newTask.status as any) || 'pending'
    };
    
    if (editingId) {
      await googleSheetsService.updateData('Tarefas', task);
    } else {
      await googleSheetsService.appendData('Tarefas', task);
    }

    setShowAddModal(false);
    setEditingId(null);
    loadTasks();
    setNewTask({ 
      status: 'pending', 
      date: new Date().toISOString().split('T')[0],
      time: '09:00',
      reminderMinutes: 2
    });
  }

  function handleEditTask(task: Task) {
    setEditingId(task.id);
    setNewTask(task);
    setShowAddModal(true);
  }

  async function toggleTaskStatus(task: Task) {
    const updatedTask: Task = { 
      ...task, 
      status: (task.status === 'completed' ? 'pending' : 'completed') as 'pending' | 'completed'
    };
    await googleSheetsService.updateData('Tarefas', updatedTask);
    loadTasks();
  }

  async function deleteTask(id: string) {
    await googleSheetsService.deleteData('Tarefas', id);
    loadTasks();
  }

  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  return (
    <div className="space-y-6 sm:space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Tarefas</h1>
          <p className="text-sm sm:text-base text-slate-500">Organize seus compromissos e afazeres diários.</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {!notificationsEnabled && (
            <button 
              onClick={handleEnableNotifications}
              className="flex-1 sm:flex-none p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-2xl text-xs font-bold hover:bg-amber-100 transition-all flex items-center justify-center gap-2 active:scale-95"
              title="Ativar Notificações"
            >
              <Clock size={20} />
              <span className="hidden sm:inline">Notificações</span>
            </button>
          )}
          <button 
            onClick={() => {
              setEditingId(null);
              setNewTask({
                status: 'pending',
                date: new Date().toISOString().split('T')[0],
                time: '09:00',
                reminderMinutes: 15
              });
              setShowAddModal(true);
            }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-semibold transition-all shadow-lg shadow-indigo-200 dark:shadow-none active:scale-95"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">Nova Tarefa</span>
            <span className="sm:hidden">Nova</span>
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pending Tasks */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={20} className="text-indigo-600" />
            <h3 className="font-bold text-lg">Pendentes ({pendingTasks.length})</h3>
          </div>
          <div className="space-y-3">
            {pendingTasks.map((task) => (
              <motion.div 
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                key={task.id} 
                className="group bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-900 transition-all"
              >
                <div className="flex items-start gap-4">
                  <button 
                    onClick={() => toggleTaskStatus(task)}
                    className="mt-1 text-slate-300 hover:text-indigo-600 transition-colors"
                  >
                    <Circle size={24} />
                  </button>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-slate-900 dark:text-white">{task.title}</h4>
                      {task.time && (
                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-md">
                          {task.time}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 mt-1">{task.description}</p>
                    <div className="flex items-center gap-3 mt-3">
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <CalendarIcon size={14} />
                        {formatDate(task.date)}
                      </span>
                      {task.reminderMinutes && (
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <Clock size={14} />
                          Lembrete: {task.reminderMinutes}m antes
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button 
                      onClick={() => handleEditTask(task)}
                      className="p-2 text-slate-400 hover:text-indigo-500 transition-all"
                      title="Editar"
                    >
                      <Pencil size={18} />
                    </button>
                    <button 
                      onClick={() => deleteTask(task.id)}
                      className="p-2 text-slate-400 hover:text-rose-500 transition-all"
                      title="Excluir"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
            {pendingTasks.length === 0 && (
              <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                <p className="text-slate-500">Tudo em dia! Nenhuma tarefa pendente.</p>
              </div>
            )}
          </div>
        </section>

        {/* Completed Tasks */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 size={20} className="text-emerald-500" />
            <h3 className="font-bold text-lg">Concluídas ({completedTasks.length})</h3>
          </div>
          <div className="space-y-3">
            {completedTasks.map((task) => (
              <motion.div 
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                key={task.id} 
                className="group bg-slate-50/50 dark:bg-slate-900/30 p-4 rounded-3xl border border-slate-100 dark:border-slate-800/50"
              >
                <div className="flex items-start gap-4">
                  <button 
                    onClick={() => toggleTaskStatus(task)}
                    className="mt-1 text-emerald-500 opacity-60"
                  >
                    <CheckCircle2 size={24} />
                  </button>
                  <div className="flex-1 opacity-60">
                    <h4 className="font-semibold line-through">{task.title}</h4>
                    <p className="text-sm line-through mt-1">{task.description}</p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button 
                      onClick={() => handleEditTask(task)}
                      className="p-2 text-slate-400 hover:text-indigo-500 transition-all"
                      title="Editar"
                    >
                      <Pencil size={18} />
                    </button>
                    <button 
                      onClick={() => deleteTask(task.id)}
                      className="p-2 text-slate-400 hover:text-rose-500 transition-all"
                      title="Excluir"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-xl font-bold">{editingId ? 'Editar Tarefa' : 'Nova Tarefa'}</h3>
                <button 
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingId(null);
                  }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  &times;
                </button>
              </div>
              <form onSubmit={handleAddTask} className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-500">Título</label>
                  <input
                    required
                    type="text"
                    value={newTask.title || ''}
                    onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="O que precisa ser feito?"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-500">Descrição (Opcional)</label>
                  <textarea
                    rows={3}
                    value={newTask.description || ''}
                    onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    placeholder="Adicione detalhes..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-500">Data de Entrega</label>
                    <input
                      required
                      type="date"
                      value={newTask.date || ''}
                      onChange={(e) => setNewTask({...newTask, date: e.target.value})}
                      className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-500">Horário</label>
                    <input
                      required
                      type="time"
                      value={newTask.time || ''}
                      onChange={(e) => setNewTask({...newTask, time: e.target.value})}
                      className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-500">Lembrete (minutos antes)</label>
                  <select
                    value={newTask.reminderMinutes}
                    onChange={(e) => setNewTask({...newTask, reminderMinutes: Number(e.target.value)})}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={2}>2 minutos</option>
                    <option value={5}>5 minutos</option>
                    <option value={10}>10 minutos</option>
                    <option value={15}>15 minutos</option>
                    <option value={30}>30 minutos</option>
                    <option value={60}>1 hora</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-2 sm:pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingId(null);
                    }}
                    className="flex-1 px-4 sm:px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl sm:rounded-2xl font-semibold hover:bg-slate-200 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 sm:px-6 py-3 bg-indigo-600 text-white rounded-xl sm:rounded-2xl font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none"
                  >
                    {editingId ? 'Atualizar' : 'Salvar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
