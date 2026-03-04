import { StrictMode, Component, ErrorInfo, ReactNode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./App";

// Suppress known Three.js warnings from dependencies
const originalWarn = console.warn;
console.warn = (...args) => {
  if (
    typeof args[0] === "string" &&
    (args[0].includes("THREE.Clock") ||
      args[0].includes("THREE.WebGLProgram") ||
      args[0].includes("X4122"))
  ) {
    return;
  }
  originalWarn(...args);
};

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null; info: ErrorInfo | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { this.setState({ info }); console.error("Uncaught error:", error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, background: '#fee2e2', color: '#991b1b', fontfamily: 'monospace', height: '100vh', overflow: 'auto' }}>
          <h2>Something went wrong.</h2>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            {this.state.error?.toString()}
            <br />
            {this.state.info?.componentStack}
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
