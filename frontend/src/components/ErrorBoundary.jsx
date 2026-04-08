import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
        <div className="min-h-screen px-4 py-6">
          <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-2xl items-center justify-center">
            <div className="app-panel-solid w-full max-w-xl rounded-[34px] p-10 text-center">
              <AlertCircle size={64} className="mx-auto mb-6 text-[#c35f47]" />
              <div className="page-eyebrow mx-auto">Runtime Error</div>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight text-[#173229]" style={{ fontFamily: 'Outfit' }}>
                Oops! Something went wrong
              </h1>
              <p className="mt-3 text-base leading-7 text-[#5a6d61]">
                We&apos;re sorry for the inconvenience. Please try refreshing the page.
              </p>
              <Button onClick={() => window.location.reload()} className="mt-8">
                Refresh Page
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
