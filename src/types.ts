export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  type: 'income' | 'expense';
}

export interface Task {
  id: string;
  title: string;
  description: string;
  date: string;
  time?: string;
  reminderMinutes?: number;
  status: 'pending' | 'completed';
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
  createdAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  reminderMinutes?: number;
  type: 'task' | 'finance' | 'custom';
}
