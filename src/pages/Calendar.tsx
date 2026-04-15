import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, CheckCircle2, Clock, X } from 'lucide-react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  eachDayOfInterval,
  parseISO
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { googleSheetsService } from '../services/dataService';
import { notificationService } from '../services/notificationService';
import { motion, AnimatePresence } from 'motion/react';
import { Task } from '../types';

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addType, setAddType] = useState<'task' | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<'default' | 'granted' | 'denied' | 'unsupported'>('default');
  
  // Form states
  const [taskForm, setTaskForm] = useState({ 
    title: '', 
    description: '', 
    time: '09:00', 
    reminderMinutes: 2 
  });

  async function loadEvents() {
    try {
      setLoading(true);
      const tasks = await googleSheetsService.fetchData('Tarefas');
      
      const taskEvents = tasks.map((t: any) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        date: parseISO(t.date),
        time: t.time,
        reminderMinutes: t.reminderMinutes,
        type: 'task',
        status: t.status
      }));

      setEvents(taskEvents);
      setLoading(false);
      
      // Check for notifications
      notificationService.checkAndNotify(tasks);
    } catch (error) {
      console.error('Calendar: Failed to load events', error);
      setLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      await loadEvents();
    };
    load();

    if (typeof window !== 'undefined') {
      if (!('Notification' in window)) {
        setNotificationStatus('unsupported');
      } else {
        setNotificationStatus(Notification.permission as any);
        setNotificationsEnabled(notificationService.hasPermission());
      }
    }
    
    return () => { 
      isMounted = false; 
    };
  }, []);

  async function handleEnableNotifications() {
    if (!('Notification' in window)) {
      alert('Seu navegador não suporta notificações nativas.\n\nDICA PARA CELULAR:\n1. Clique nos três pontos (⋮) ou no ícone de compartilhar.\n2. Selecione "Instalar Aplicativo" ou "Adicionar à Tela de Início".\n3. Abra o app pela tela inicial para habilitar os alertas!');
      setNotificationStatus('unsupported');
      return;
    }
    
    if (Notification.permission === 'denied') {
      alert('As notificações foram bloqueadas nas configurações do seu navegador.\n\nPara corrigir:\n1. Clique no cadeado (🔒) ao lado da URL.\n2. Ative a permissão de "Notificações".');
      return;
    }

    const granted = await notificationService.requestPermission();
    setNotificationsEnabled(granted);
    setNotificationStatus(Notification.permission as any);
    
    if (granted) {
      // Notification removed as requested
    }
  }

  async function handleTestNotification() {
    await notificationService.notify('Teste de Notificação', {
      body: 'Se você está vendo isso, as notificações estão funcionando corretamente!',
      vibrate: [200, 100, 200]
    } as any);
  }

  const selectedDateEvents = events.filter(event => isSameDay(event.date, selectedDate));

  const renderHeader = () => {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold capitalize text-slate-900 dark:text-white">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Gerencie seus compromissos e finanças.</p>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 bg-white dark:bg-slate-900 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <button 
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 sm:p-2 rounded-lg sm:rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-slate-600 dark:text-slate-400"
          >
            <ChevronLeft size={20} className="sm:w-5 sm:h-5" />
          </button>
          <button 
            onClick={() => {
              setCurrentMonth(new Date());
              setSelectedDate(new Date());
            }}
            className="px-3 sm:px-4 py-2 sm:py-2 text-xs sm:text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg sm:rounded-xl transition-all"
          >
            Hoje
          </button>
          <button 
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 sm:p-2 rounded-lg sm:rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-slate-600 dark:text-slate-400"
          >
            <ChevronRight size={20} className="sm:w-5 sm:h-5" />
          </button>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {notificationStatus === 'unsupported' ? (
            <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-lg text-[10px] font-bold uppercase tracking-wider">
              Notificações Indisponíveis
            </div>
          ) : (
            <button 
              onClick={handleEnableNotifications}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-2",
                notificationsEnabled 
                  ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400" 
                  : "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100"
              )}
            >
              <Clock size={12} />
              {notificationsEnabled ? 'Alertas Ativos' : ''}
            </button>
          )}

          {notificationsEnabled && (
            <button 
              onClick={handleTestNotification}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-slate-200 transition-all"
            >
              Testar
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return (
      <div className="grid grid-cols-7 mb-2 sm:mb-4">
        {days.map(day => (
          <div key={day} className="text-center text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] sm:tracking-[0.2em]">
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const calendarDays = eachDayOfInterval({
      start: startDate,
      end: endDate,
    });

    return (
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {calendarDays.map((day, i) => {
          const dayEvents = events.filter(event => isSameDay(event.date, day));
          const isSelected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, new Date());
          const isCurrentMonth = isSameMonth(day, monthStart);
          
          return (
            <motion.button
              whileHover={{ scale: 0.98 }}
              whileTap={{ scale: 0.95 }}
              key={i}
              onClick={() => setSelectedDate(day)}
              className={cn(
                "relative min-h-[50px] sm:min-h-[80px] md:min-h-[120px] p-1 sm:p-2 rounded-xl sm:rounded-3xl border transition-all text-left flex flex-col group",
                isSelected 
                  ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none z-10" 
                  : cn(
                      "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-900",
                      !isCurrentMonth && "opacity-40"
                    )
              )}
            >
              <div className="flex justify-between items-center mb-0.5 sm:mb-2">
                <span className={cn(
                  "text-[10px] sm:text-sm font-bold w-4 h-4 sm:w-7 sm:h-7 flex items-center justify-center rounded-md sm:rounded-xl",
                  isToday && !isSelected && "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400",
                  isSelected && "bg-white/20"
                )}>
                  {format(day, 'd')}
                </span>
                {dayEvents.length > 0 && !isSelected && (
                  <div className="flex -space-x-1">
                    {Array.from(new Set(dayEvents.map(e => e.type))).map(type => (
                      <div 
                        key={type}
                        className={cn(
                          "w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full border border-white dark:border-slate-900",
                          type === 'task' ? "bg-amber-500" : "bg-emerald-500"
                        )}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-0.5 sm:space-y-1 overflow-hidden hidden xs:block">
                {dayEvents.slice(0, isCurrentMonth ? 2 : 1).map(event => (
                  <div 
                    key={event.id}
                    className={cn(
                      "text-[7px] sm:text-[9px] px-1 sm:px-2 py-0.5 sm:py-1 rounded-md sm:rounded-lg truncate font-bold",
                      isSelected 
                        ? "bg-white/20 text-white" 
                        : event.type === 'task' 
                          ? "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400" 
                          : "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                    )}
                  >
                    {event.title}
                  </div>
                ))}
                {dayEvents.length > 2 && (
                  <div className={cn(
                    "text-[8px] font-black text-center uppercase tracking-wider mt-1",
                    isSelected ? "text-white/60" : "text-slate-400"
                  )}>
                    + {dayEvents.length - 2}
                  </div>
                )}
              </div>
              {dayEvents.length > 0 && !isSelected && (
                <div className="xs:hidden flex justify-center mt-auto">
                  <div className="w-1 h-1 rounded-full bg-indigo-400" />
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      <div className="lg:col-span-3 space-y-4">
        {renderHeader()}
        <div className="bg-slate-50 dark:bg-slate-950 p-2 sm:p-4 md:p-6 rounded-[2rem] sm:rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-inner">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentMonth.toString()}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderDays()}
              {renderCells()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Side Panel: Day Details */}
      <div className="lg:col-span-1">
        <div className="sticky top-8 space-y-4 sm:space-y-6">
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">Eventos para este dia</p>
            </div>

            <div className="space-y-4">
              {selectedDateEvents.length > 0 ? (
                selectedDateEvents.map(event => (
                  <div 
                    key={event.id}
                    className="flex gap-4 p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800"
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
                    )}>
                      <CheckCircle2 size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-sm truncate">{event.title}</p>
                        {event.time && (
                          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-md">
                            {event.time}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-1">{event.description || 'Sem descrição'}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                    <Clock size={32} />
                  </div>
                  <p className="text-slate-400 text-sm">Nenhum evento agendado para este dia.</p>
                </div>
              )}
            </div>

            <button 
              onClick={() => {
                setShowAddModal(true);
                setAddType('task');
              }}
              className="w-full mt-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 dark:shadow-none"
            >
              <Plus size={20} />
              Nova Tarefa
            </button>
          </div>
        </div>
      </div>

      {/* Add Event Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800"
            >
              <div className="p-6 sm:p-8">
                <div className="flex justify-between items-center mb-4 sm:mb-6">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Nova Tarefa</h2>
                  <button 
                    onClick={() => {
                      setShowAddModal(false);
                      setAddType(null);
                    }}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const newTask: Task = {
                    id: Math.random().toString(36).substr(2, 9),
                    title: taskForm.title,
                    description: taskForm.description,
                    date: format(selectedDate, 'yyyy-MM-dd'),
                    time: taskForm.time,
                    reminderMinutes: Number(taskForm.reminderMinutes),
                    status: 'pending'
                  };
                  await googleSheetsService.appendData('Tarefas', newTask);
                  setShowAddModal(false);
                  setAddType(null);
                  setTaskForm({ 
                    title: '', 
                    description: '', 
                    time: '09:00', 
                    reminderMinutes: 2 
                  });
                  loadEvents();
                }} className="space-y-3 sm:space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Título</label>
                    <input 
                      required
                      value={taskForm.title}
                      onChange={e => setTaskForm({...taskForm, title: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      placeholder="Ex: Reunião de Planejamento"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Horário</label>
                      <input 
                        type="time"
                        required
                        value={taskForm.time}
                        onChange={e => setTaskForm({...taskForm, time: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Lembrete (minutos antes)</label>
                      <select 
                        value={taskForm.reminderMinutes}
                        onChange={e => setTaskForm({...taskForm, reminderMinutes: Number(e.target.value)})}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      >
                        <option value={2}>2 minutos</option>
                        <option value={5}>5 minutos</option>
                        <option value={10}>10 minutos</option>
                        <option value={15}>15 minutos</option>
                        <option value={30}>30 minutos</option>
                        <option value={60}>1 hora</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Descrição</label>
                    <textarea 
                      value={taskForm.description}
                      onChange={e => setTaskForm({...taskForm, description: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500 outline-none transition-all min-h-[100px]"
                      placeholder="Detalhes da tarefa..."
                    />
                  </div>
                  <div className="pt-2 sm:pt-4 flex gap-3">
                    <button 
                      type="button"
                      onClick={() => {
                        setShowAddModal(false);
                        setAddType(null);
                      }}
                      className="flex-1 py-3 sm:py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-bold transition-all"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 py-3 sm:py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-100 dark:shadow-none"
                    >
                      Salvar
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
