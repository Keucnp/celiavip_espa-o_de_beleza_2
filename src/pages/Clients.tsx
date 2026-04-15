import React, { useState, useEffect } from 'react';
import { Plus, Search, Mail, Phone, Trash2, UserPlus, Pencil } from 'lucide-react';
import { googleSheetsService } from '../services/dataService';
import { Client } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newClient, setNewClient] = useState<Partial<Client>>({});

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoading(true);
      const data = await googleSheetsService.fetchData('Clientes');
      if (isMounted) {
        setClients(data);
        setLoading(false);
      }
    };
    load();
    return () => { isMounted = false; };
  }, []);

  async function loadClients() {
    setLoading(true);
    const data = await googleSheetsService.fetchData('Clientes');
    setClients(data);
    setLoading(false);
  }

  async function handleAddClient(e: React.FormEvent) {
    e.preventDefault();
    const client: Client = {
      id: editingId || Math.random().toString(36).substr(2, 9),
      name: newClient.name || '',
      phone: newClient.phone || '',
      email: newClient.email || '',
      notes: newClient.notes || '',
      createdAt: newClient.createdAt || new Date().toISOString()
    };
    
    if (editingId) {
      await googleSheetsService.updateData('Clientes', client);
    } else {
      await googleSheetsService.appendData('Clientes', client);
    }
    
    setShowAddModal(false);
    setEditingId(null);
    loadClients();
    setNewClient({});
  }

  function handleEditClient(client: Client) {
    setEditingId(client.id);
    setNewClient(client);
    setShowAddModal(true);
  }

  async function deleteClient(id: string) {
    await googleSheetsService.deleteData('Clientes', id);
    loadClients();
  }

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 sm:space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Clientes</h1>
          <p className="text-sm sm:text-base text-slate-500">Gerencie sua base de contatos e histórico.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-semibold transition-all shadow-lg shadow-indigo-200 dark:shadow-none active:scale-95"
        >
          <UserPlus size={20} />
          <span className="hidden sm:inline">Novo Cliente</span>
          <span className="sm:hidden">Novo</span>
        </button>
      </header>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="text"
          placeholder="Buscar por nome ou email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClients.map((client) => (
          <motion.div 
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            key={client.id} 
            className="group bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xl">
                {client.name.charAt(0)}
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => handleEditClient(client)}
                  className="p-2 text-slate-400 hover:text-indigo-500 transition-colors"
                  title="Editar"
                >
                  <Pencil size={18} />
                </button>
                <button 
                  onClick={() => deleteClient(client.id)}
                  className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                  title="Excluir"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <h3 className="text-lg font-bold mb-1">{client.name}</h3>
            <p className="text-sm text-slate-500 mb-4 line-clamp-1">{client.notes || 'Sem observações'}</p>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <Mail size={16} className="text-slate-400" />
                {client.email}
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <Phone size={16} className="text-slate-400" />
                {client.phone}
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
              <button className="w-full py-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-all">
                Ver Histórico
              </button>
            </div>
          </motion.div>
        ))}
        {filteredClients.length === 0 && !loading && (
          <div className="col-span-full text-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
            <p className="text-slate-500">Nenhum cliente encontrado.</p>
          </div>
        )}
      </div>

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
                <h3 className="text-xl font-bold">{editingId ? 'Editar Cliente' : 'Novo Cliente'}</h3>
                <button 
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingId(null);
                    setNewClient({});
                  }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  &times;
                </button>
              </div>
              <form onSubmit={handleAddClient} className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-500">Nome Completo</label>
                  <input
                    required
                    type="text"
                    value={newClient.name || ''}
                    onChange={(e) => setNewClient({...newClient, name: e.target.value})}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Nome do cliente"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-500">Telefone</label>
                    <input
                      type="tel"
                      value={newClient.phone || ''}
                      onChange={(e) => setNewClient({...newClient, phone: e.target.value})}
                      className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-500">Email</label>
                    <input
                      type="email"
                      value={newClient.email || ''}
                      onChange={(e) => setNewClient({...newClient, email: e.target.value})}
                      className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="email@exemplo.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-500">Observações</label>
                  <textarea
                    rows={3}
                    value={newClient.notes || ''}
                    onChange={(e) => setNewClient({...newClient, notes: e.target.value})}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    placeholder="Detalhes sobre o cliente..."
                  />
                </div>

                <div className="flex gap-3 pt-2 sm:pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
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
