import React, { ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl max-w-md w-full text-center">
            <div className="w-20 h-20 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={40} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Ops! Algo deu errado</h1>
            <p className="text-slate-500 dark:text-slate-400 mb-8">
              Ocorreu um erro inesperado ao carregar esta parte do aplicativo.
            </p>
            {this.state.error && (
              <pre className="text-[10px] bg-slate-50 dark:bg-slate-800 p-4 rounded-xl mb-8 overflow-auto max-h-32 text-left text-slate-500 font-mono">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 dark:shadow-none"
            >
              <RefreshCw size={20} />
              Recarregar Aplicativo
            </button>
          </div>
        </div>
      );
    }

    return (this.props as any).children;
  }
}
