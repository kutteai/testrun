import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to service in production
    // In a real app, you would send this to an error reporting service
    // eslint-disable-next-line no-console
    console.error('🚨 ErrorBoundary caught an error:', error);
    // eslint-disable-next-line no-console
    console.error('🚨 Error message:', error.message);
    // eslint-disable-next-line no-console
    console.error('🚨 Error stack:', error.stack);
    // eslint-disable-next-line no-console
    console.error('🚨 Error info:', errorInfo);
    // eslint-disable-next-line no-console
    console.error('🚨 Component stack:', errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Something went wrong
            </h2>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 