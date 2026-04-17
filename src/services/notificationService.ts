import { Task } from '../types';
import { parseISO, isBefore, addMinutes, subMinutes, isAfter, format } from 'date-fns';
import { toast } from '../components/Toast';

class NotificationService {
  private permission: NotificationPermission = 'default';
  private swRegistration: ServiceWorkerRegistration | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      if ('Notification' in window) {
        this.permission = Notification.permission;
      }
      this.registerServiceWorker();
    }
  }

  private async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        this.swRegistration = registration;
        console.log('Service Worker registered for notifications');
      } catch (e) {
        console.error('Service Worker registration failed:', e);
      }
    }
  }

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false;
    
    const permission = await Notification.requestPermission();
    this.permission = permission;
    return permission === 'granted';
  }

  hasPermission(): boolean {
    return this.permission === 'granted';
  }

  private async playChime() {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.5); // A4
      
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.error('Audio chime failed:', e);
    }
  }

  async notify(title: string, options?: NotificationOptions) {
    // Always play sound and vibrate if possible (good for WebViews)
    this.playChime();
    
    // Vibrate pattern: [wait, vibrate, wait, vibrate...]
    if ('vibrate' in navigator) {
      navigator.vibrate([300, 100, 300, 100, 500]);
    }

    // Try Service Worker notification (best for standard browsers and PWAs)
    if (this.swRegistration && this.permission === 'granted') {
      try {
        await this.swRegistration.showNotification(title, {
          icon: '/logo-final.png',
          badge: '/logo-final.png',
          vibrate: [300, 100, 300, 100, 500],
          tag: options?.tag || 'general',
          renotify: true,
          requireInteraction: true,
          ...options
        } as any);
        return;
      } catch (e) {
        console.error('SW notification failed:', e);
      }
    }

    // Standard Notification API
    if (this.permission === 'granted') {
      try {
        new Notification(title, {
          icon: '/favicon.ico',
          ...options
        });
        return;
      } catch (e) {
        console.error('Notification API failed:', e);
      }
    }

    // FINAL FALLBACK: Toast notification
    toast.info(title, options?.body);
  }

  // Helper to show a visual alert if browser notifications are not supported or blocked
  showVisualAlert(title: string, message: string) {
    toast.info(title, message);
  }

  checkAndNotify(tasks: Task[]) {
    const now = new Date();
    const notifiedKey = 'organizapro_notified_tasks';
    const notifiedIds = JSON.parse(localStorage.getItem(notifiedKey) || '[]');

    // Cleanup: keep only the last 100 notified IDs to prevent localStorage bloat
    if (notifiedIds.length > 100) {
      notifiedIds.splice(0, notifiedIds.length - 100);
    }

    tasks.forEach(task => {
      if (task.status === 'completed' || !task.time || !task.reminderMinutes) return;
      if (notifiedIds.includes(task.id)) return;

      try {
        // Combine date and time
        const eventDate = parseISO(`${task.date}T${task.time}`);
        const reminderDate = subMinutes(eventDate, task.reminderMinutes);

        // If current time is after reminder time and before event time
        if (isAfter(now, reminderDate) && isBefore(now, eventDate)) {
          const title = `Lembrete: ${task.title}`;
          const body = `Seu compromisso começa em ${task.reminderMinutes} minutos às ${task.time}.`;
          
          this.notify(title, {
            body: body,
            tag: task.id
          });
          
          // Mark as notified
          notifiedIds.push(task.id);
          localStorage.setItem(notifiedKey, JSON.stringify(notifiedIds));
        }
      } catch (e) {
        console.error('Error parsing date/time for notification:', e);
      }
    });
  }
}

export const notificationService = new NotificationService();
