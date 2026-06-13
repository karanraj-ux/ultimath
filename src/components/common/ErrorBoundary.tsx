import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  /** Optional fallback shown instead of the generic error screen */
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: unknown): State {
    const msg = error instanceof Error ? error.message : String(error);
    return { hasError: true, errorMessage: msg };
  }

  componentDidCatch(error: unknown, info: { componentStack: string }) {
    // Log for debugging without exposing secrets
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">
            <div className="rounded-full bg-destructive/10 p-4">
              <AlertTriangle className="h-10 w-10 text-destructive" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Something went wrong</h1>
            <p className="text-muted-foreground text-sm">
              The app encountered an unexpected error. Try refreshing — if the problem persists, contact support.
            </p>
            {this.state.errorMessage && (
              <p className="text-xs text-muted-foreground/60 font-mono bg-muted rounded px-3 py-2 mt-3 text-left break-all">
                {this.state.errorMessage.slice(0, 200)}
              </p>
            )}
          </div>
          <div className="flex gap-3 justify-center">
            <Button onClick={this.handleReset} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Try again
            </Button>
            <Button onClick={() => window.location.href = '/'}>
              Go home
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
