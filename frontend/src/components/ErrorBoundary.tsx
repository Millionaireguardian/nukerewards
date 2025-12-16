import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '20px',
          margin: '20px',
          border: '2px solid #dc3545',
          borderRadius: '8px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
        }}>
          <h2 style={{ marginTop: 0 }}>⚠️ Dashboard Error</h2>
          <p>The dashboard encountered an error while rendering. This is likely due to missing or invalid data.</p>
          {this.state.error && (
            <details style={{ marginTop: '10px' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>Error Details</summary>
              <pre style={{
                marginTop: '10px',
                padding: '10px',
                backgroundColor: '#fff',
                borderRadius: '4px',
                overflow: 'auto',
                fontSize: '12px',
              }}>
                {this.state.error.toString()}
                {this.state.errorInfo && (
                  <>
                    {'\n\n'}
                    {this.state.errorInfo.componentStack}
                  </>
                )}
              </pre>
            </details>
          )}
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null, errorInfo: null });
              window.location.reload();
            }}
            style={{
              marginTop: '15px',
              padding: '10px 20px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Reload Dashboard
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

