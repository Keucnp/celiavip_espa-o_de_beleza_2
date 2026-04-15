import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global error handling for mobile debugging
if (typeof window !== 'undefined') {
  window.onerror = function(message, source, lineno, colno, error) {
    console.error('Global Error:', message, error);
    // Only show alert in development or if explicitly requested, 
    // but for this "not opening" issue, it's helpful.
    // alert('Erro ao carregar app: ' + message);
    return false;
  };

  window.onunhandledrejection = function(event) {
    console.error('Unhandled Rejection:', event.reason);
    // alert('Erro de promessa: ' + event.reason);
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
