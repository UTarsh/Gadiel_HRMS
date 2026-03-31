import React, { ErrorInfo, ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null; info: ErrorInfo | null }

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null, info: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ info })
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, fontFamily: 'monospace', background: '#1a0000', color: '#ff6b6b', minHeight: '100vh' }}>
          <h1 style={{ fontSize: 28, marginBottom: 16, color: '#ff4444' }}>⚠️ React Crashed</h1>
          <p style={{ marginBottom: 24, color: '#ccc' }}>The application encountered an uncaught exception.</p>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', background: '#111', padding: 20, borderRadius: 8, fontSize: 13, lineHeight: 1.6 }}>
            <strong style={{ color: '#ff8888' }}>{this.state.error.name}: {this.state.error.message}</strong>
            {'\n\nStack trace:\n\n'}
            {this.state.error.stack}
            {'\n\nComponent Stack:\n'}
            {this.state.info?.componentStack}
          </pre>
          <button
            onClick={() => { this.setState({ error: null, info: null }); window.location.href = '/login' }}
            style={{ marginTop: 20, padding: '12px 24px', background: '#ff4444', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}
          >
            ↻ Reload App
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
