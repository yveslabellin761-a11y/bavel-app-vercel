import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, AlertTriangle, Home, ShieldCheck } from 'lucide-react';
import * as Sentry from '@sentry/react';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } });
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleReset = () => {
    try {
      this.setState({ hasError: false, error: null });
    } catch (e) {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] h-full p-6 text-center bg-white text-black select-none">
          <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center mb-4 text-rose-500 shadow-sm animate-pulse">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <h2 className="text-[18px] font-extrabold text-black mb-2 tracking-tight">
            {this.props.fallbackTitle || "Une petite interruption"}
          </h2>

          <p className="text-gray-500 text-[13.5px] max-w-[280px] leading-relaxed mb-6">
            Bavel a protégé votre session. Vos données et conversations sont en sécurité.
          </p>

          <div className="flex flex-col w-full max-w-[240px] space-y-2.5">
            <button
              onClick={this.handleReset}
              className="w-full bg-[#111] hover:bg-black text-white font-bold py-3 px-4 rounded-xl text-[14px] flex items-center justify-center space-x-2 shadow-sm active:scale-95 transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Réessayer immédiatement</span>
            </button>

            <button
              onClick={this.handleReload}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-2.5 px-4 rounded-xl text-[13px] flex items-center justify-center space-x-2 active:scale-95 transition-all cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>Actualiser l'application</span>
            </button>
          </div>

          <div className="mt-6 flex items-center space-x-1.5 text-emerald-600 text-[11.5px] font-bold">
            <ShieldCheck className="w-4 h-4" />
            <span>Protection et chiffrement actifs</span>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
