import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global error handling for mobile debugging
if (typeof window !== 'undefined') {
  window.onerror = function(message, source, lineno, colno, error) {
    // Ignore benign Vite WebSocket errors
    const msg = message.toString();
    if (msg.includes('WebSocket') || msg.includes('vite')) {
      return true; // Prevents the error from being printed to console
    }
    console.error('Global Error:', message, error);
    return false;
  };

  window.onunhandledrejection = function(event) {
    // Ignore benign Vite WebSocket errors that happen because HMR is disabled in this environment
    if (event.reason && (
      event.reason.message?.includes('WebSocket') || 
      event.reason.toString().includes('WebSocket')
    )) {
      return;
    }
    console.error('Unhandled Rejection:', event.reason);
  };
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
} else {
  console.error('Root element not found');
}
