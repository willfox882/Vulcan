import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Top-level error boundary: a render-time fault shows a recoverable message
 * (with reload) instead of a blank white screen.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Unhandled render error:", error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-bg-base px-6 text-center">
          <div className="text-semantic-fail text-4xl mb-4">⚠</div>
          <h1 className="text-text-primary text-xl font-semibold mb-2">
            Something went wrong
          </h1>
          <p className="text-text-secondary text-sm max-w-md mb-1">
            VULCAN hit an unexpected error and couldn't continue. Your work may
            be recoverable from auto-save after reloading.
          </p>
          <p className="text-text-tertiary text-xs font-mono max-w-md mb-4 break-words">
            {this.state.error.message}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-accent text-white rounded text-sm hover:bg-accent-hover transition-colors"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
