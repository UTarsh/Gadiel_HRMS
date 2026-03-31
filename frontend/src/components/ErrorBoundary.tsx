import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', fontFamily: 'monospace', color: 'red', background: '#fee' }}>
          <h1>React Crashed</h1>
          <p>The application encountered an uncaught exception.</p>
          <pre style={{ whiteSpace: 'pre-wrap', background: '#f8d7da', padding: '1rem' }}>
            {this.state.error && this.state.error.toString()}
          </pre>
          <p><strong>Stack trace:</strong></p>
          <pre style={{ whiteSpace: 'pre-wrap', background: '#ffebee', padding: '1rem', overflowX: 'auto' }}>
            {this.state.error?.stack}
          </pre>
          <p><strong>Component Stack:</strong></p>
          <pre style={{ whiteSpace: 'pre-wrap', background: '#ffebee', padding: '1rem', overflowX: 'auto' }}>
            {this.state.errorInfo?.componentStack}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}
