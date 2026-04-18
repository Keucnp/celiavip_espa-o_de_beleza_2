import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary';

// Global error handling for mobile debugging
if (typeof window !== 'undefined') {
  window.onerror = function(message, source, lineno, colno, error) {
    const msg = String(message || '');
    // Ignore benign Vite/WebSocket errors
    if (
      msg.toLowerCase().includes('websocket') || 
      msg.toLowerCase().includes('vite') ||
      msg.toLowerCase().includes('hmr') ||
      msg.toLowerCase().includes('service worker')
    ) {
      return true;
    }
    console.error('Global Error:', { message, source, lineno, colno, error });
    return false;
  };

  window.onunhandledrejection = function(event) {
    const reasonMsg = String(event.reason?.message || event.reason || '');
    // Ignore benign failures
    if (
      reasonMsg.toLowerCase().includes('websocket') ||
      reasonMsg.toLowerCase().includes('vite') ||
      reasonMsg.toLowerCase().includes('hmr')
    ) {
      return;
    }
    console.error('Unhandled Rejection:', event.reason);
  };
}

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('SW registered: ', registration);
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
} else {
  console.error('Root element not found');
}
