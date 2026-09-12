import { Component, type ReactNode } from 'react';

export class SceneErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <div className="scene-fallback" role="alert">
          <h2>This view could not load.</h2>
          <p>Check that WebGL is enabled in your browser, then try again.</p>
          <button
            className="primary-button"
            onClick={() => this.setState({ failed: false })}
          >
            Retry view
          </button>
        </div>
      );
    return this.props.children;
  }
}
