import React from 'react';
import { AlertCircle } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB] p-4">
          <div className="text-center max-w-md">
            <AlertCircle size={64} className="mx-auto text-[#E07A5F] mb-6" />
            <h1 className="text-3xl font-semibold text-[#344E41] mb-4">
              Oops! Something went wrong
            </h1>
            <p className="text-[#5C6B61] mb-8">
              We're sorry for the inconvenience. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-[#344E41] hover:bg-[#2B3A28] text-white px-8 py-3 font-medium transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
