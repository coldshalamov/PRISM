import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props { children: ReactNode; /** Changing this resets the boundary (for example when the user switches view). */ resetKey: string; onHome?: () => void }
interface State { error: Error | null }

/* A rendering fault in one view must not blank the whole workspace or lose the session. The boundary
   keeps the navigation, library and every candidate alive, says plainly that this view could not be
   drawn, and offers a retry. Nothing is inferred about the data; the measurements are untouched. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('PRISM view failed to render', error, info.componentStack);
  }

  componentDidUpdate(previous: Props) {
    if (this.state.error && previous.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="view-fault" role="alert">
        <AlertTriangle size={22} aria-hidden="true" />
        <div>
          <h2>This view could not be displayed.</h2>
          <p>
            The page hit an unexpected problem while drawing it. Your session, candidates and measurements are unchanged, and no
            result has been inferred from this failure. You can retry, or continue in another view.
          </p>
          <p className="view-fault-detail"><code>{error.message || 'Unknown error'}</code></p>
          <div className="view-fault-actions">
            <button type="button" className="btn primary" onClick={() => this.setState({ error: null })}><RotateCcw size={14} />Try again</button>
            {this.props.onHome ? <button type="button" className="btn" onClick={() => { this.setState({ error: null }); this.props.onHome?.(); }}>Open the Workbench</button> : null}
          </div>
        </div>
      </div>
    );
  }
}
