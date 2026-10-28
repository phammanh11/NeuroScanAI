import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface RouteErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class RouteErrorBoundary extends React.Component<
  { children: React.ReactNode },
  RouteErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): RouteErrorBoundaryState {
    void error;
    return {
      hasError: true,
      errorMessage: 'Trang này gặp sự cố. Bạn có thể tải lại để thử lại.',
    };
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-2xl border border-rose-500/30 bg-white dark:bg-slate-900 p-6 text-center shadow-card">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-500/15 text-rose-600 flex items-center justify-center mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Giao diện gặp sự cố ngoài ý muốn
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5">
              {this.state.errorMessage}
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, errorMessage: '' });
                window.location.reload();
              }}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-teal-600 text-white hover:bg-teal-700"
            >
              <RotateCcw className="w-4 h-4" />
              Tải lại trang
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
