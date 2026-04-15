import { Transaction, Task, Client } from '../types';

const STORAGE_KEYS = {
  FINANCE: 'organizapro_finance',
  TASKS: 'organizapro_tasks',
  CLIENTS: 'organizapro_clients',
};

// Check if localStorage is available
const isStorageAvailable = () => {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
};

const storageAvailable = isStorageAvailable();

// Mock service using localStorage
export const storageService = {
  getFinance: (): Transaction[] => {
    if (!storageAvailable) return [];
    try {
      const data = localStorage.getItem(STORAGE_KEYS.FINANCE);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error reading finance from localStorage:', e);
      return [];
    }
  },
  saveTransaction: (transaction: Transaction) => {
    if (!storageAvailable) return;
    try {
      const data = storageService.getFinance();
      const index = data.findIndex(t => t.id === transaction.id);
      if (index >= 0) data[index] = transaction;
      else data.push(transaction);
      localStorage.setItem(STORAGE_KEYS.FINANCE, JSON.stringify(data));
    } catch (e) {
      console.error('Error saving finance to localStorage:', e);
      if (e instanceof Error && e.name === 'QuotaExceededError') {
        alert('Memória do navegador cheia. Tente excluir alguns registros antigos.');
      }
    }
  },
  
  getTasks: (): Task[] => {
    if (!storageAvailable) return [];
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TASKS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error reading tasks from localStorage:', e);
      return [];
    }
  },
  saveTask: (task: Task) => {
    if (!storageAvailable) return;
    try {
      const data = storageService.getTasks();
      const index = data.findIndex(t => t.id === task.id);
      if (index >= 0) data[index] = task;
      else data.push(task);
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(data));
    } catch (e) {
      console.error('Error saving task to localStorage:', e);
      if (e instanceof Error && e.name === 'QuotaExceededError') {
        alert('Memória do navegador cheia. Tente excluir algumas tarefas antigas.');
      }
    }
  },
  deleteTask: (id: string) => {
    if (!storageAvailable) return;
    try {
      const data = storageService.getTasks();
      const filtered = data.filter(t => t.id !== id);
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(filtered));
    } catch (e) {
      console.error('Error deleting task from localStorage:', e);
    }
  },

  getClients: (): Client[] => {
    if (!storageAvailable) return [];
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CLIENTS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error reading clients from localStorage:', e);
      return [];
    }
  },
  saveClient: (client: Client) => {
    if (!storageAvailable) return;
    try {
      const data = storageService.getClients();
      const index = data.findIndex(c => c.id === client.id);
      if (index >= 0) data[index] = client;
      else data.push(client);
      localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(data));
    } catch (e) {
      console.error('Error saving client to localStorage:', e);
      if (e instanceof Error && e.name === 'QuotaExceededError') {
        alert('Memória do navegador cheia. Tente excluir alguns clientes antigos.');
      }
    }
  },
  deleteClient: (id: string) => {
    if (!storageAvailable) return;
    try {
      const data = storageService.getClients();
      const filtered = data.filter(c => c.id !== id);
      localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(filtered));
    } catch (e) {
      console.error('Error deleting client from localStorage:', e);
    }
  }
};

// Real Google Sheets Service (Placeholder for implementation)
export const googleSheetsService = {
  // This would use fetch to the Apps Script URL or Sheets API
  // For now, we'll proxy to storageService if no URL is provided
  fetchData: async (sheet: string) => {
    const scriptUrl = import.meta.env.VITE_GOOGLE_SCRIPT_URL;
    if (!scriptUrl) {
      if (sheet === 'Financeiro') return storageService.getFinance();
      if (sheet === 'Tarefas') return storageService.getTasks();
      if (sheet === 'Clientes') return storageService.getClients();
      return [];
    }
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
      
      const response = await fetch(`${scriptUrl}?sheet=${sheet}`, { signal: controller.signal });
      clearTimeout(timeoutId);
      return await response.json();
    } catch (error) {
      console.error('Error fetching from Sheets:', error);
      return [];
    }
  },
  
  appendData: async (sheet: string, data: any) => {
    const scriptUrl = import.meta.env.VITE_GOOGLE_SCRIPT_URL;
    if (!scriptUrl) {
      if (sheet === 'Financeiro') storageService.saveTransaction(data);
      if (sheet === 'Tarefas') storageService.saveTask(data);
      if (sheet === 'Clientes') storageService.saveClient(data);
      return { success: true };
    }

    try {
      const response = await fetch(scriptUrl, {
        method: 'POST',
        body: JSON.stringify({ action: 'append', sheet, data }),
      });
      return await response.json();
    } catch (error) {
      console.error('Error appending to Sheets:', error);
      return { success: false };
    }
  },

  updateData: async (sheet: string, data: any) => {
    const scriptUrl = import.meta.env.VITE_GOOGLE_SCRIPT_URL;
    if (!scriptUrl) {
      if (sheet === 'Financeiro') storageService.saveTransaction(data); // Note: saveTransaction handles update for tasks/clients but not finance yet in storageService
      if (sheet === 'Tarefas') storageService.saveTask(data);
      if (sheet === 'Clientes') storageService.saveClient(data);
      return { success: true };
    }

    try {
      const response = await fetch(scriptUrl, {
        method: 'POST',
        body: JSON.stringify({ action: 'update', sheet, data }),
      });
      return await response.json();
    } catch (error) {
      console.error('Error updating Sheets:', error);
      return { success: false };
    }
  },

  deleteData: async (sheet: string, id: string) => {
    const scriptUrl = import.meta.env.VITE_GOOGLE_SCRIPT_URL;
    if (!scriptUrl) {
      if (sheet === 'Financeiro') {
        const data = storageService.getFinance().filter(t => t.id !== id);
        localStorage.setItem(STORAGE_KEYS.FINANCE, JSON.stringify(data));
      }
      if (sheet === 'Tarefas') storageService.deleteTask(id);
      if (sheet === 'Clientes') storageService.deleteClient(id);
      return { success: true };
    }

    try {
      const response = await fetch(scriptUrl, {
        method: 'POST',
        body: JSON.stringify({ action: 'delete', sheet, id }),
      });
      return await response.json();
    } catch (error) {
      console.error('Error deleting from Sheets:', error);
      return { success: false };
    }
  }
};
