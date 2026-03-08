import { Component, type ErrorInfo, type ReactNode } from 'react';
import pingLogo from '@/assets/ping-logo-white.png';

interface Props { children: ReactNode }
interface State { hasError: boolean; error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-6 bg-background text-foreground px-6 text-center">
        <img src={pingLogo} alt="Ping" className="h-10 opacity-70" />
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
          Ping hit an unexpected error. Try reloading — if the problem persists,
          clear your browser cache.
        </p>
        {this.state.error && (
          <pre className="max-w-md text-xs text-muted-foreground/60 font-mono truncate">
            {this.state.error.message}
          </pre>
        )}
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-6 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Reload Ping
        </button>
      </div>
    );
  }
}
