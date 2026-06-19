'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Changing this prop resets the boundary — pass the active tab name. */
  resetKey: string;
}

interface State {
  hasError: boolean;
  message: string;
}

export default class TabErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: unknown): State {
    const message =
      error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { hasError: true, message };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('[TabErrorBoundary]', error, info.componentStack);
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false, message: '' });
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="bg-bad/10 border border-bad/30 rounded-2xl p-8 flex flex-col items-center gap-4 text-center">
        <span className="text-3xl">⚠️</span>
        <div>
          <p className="font-semibold text-bad text-sm">This tab hit an error</p>
          {this.state.message && (
            <p className="text-xs text-ink3 mt-1 font-mono">{this.state.message}</p>
          )}
        </div>
        <button
          onClick={() => this.setState({ hasError: false, message: '' })}
          className="px-4 py-2 rounded-lg bg-bad text-white text-sm font-semibold hover:bg-bad/80 transition-colors"
        >
          Try again
        </button>
      </div>
    );
  }
}
