import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ExamMaster]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-dvh bg-white p-6 text-neutral-800">
          <h1 className="text-lg font-bold text-red-600">页面渲染出错</h1>
          <p className="mt-2 text-sm text-neutral-600">
            请打开开发者工具（F12）查看 Console。若为本地数据损坏，可在下方清除后刷新。
          </p>
          <pre className="mt-4 max-h-48 overflow-auto rounded-lg bg-neutral-100 p-3 text-xs">
            {this.state.error.message}
          </pre>
          <button
            type="button"
            className="mt-6 w-full max-w-md rounded-xl bg-brand py-3 text-sm font-semibold text-white"
            onClick={() => {
              try {
                localStorage.removeItem("ai-trainer-exam-v1");
                localStorage.removeItem("ai-trainer-exam-v2");
              } catch {
                /* ignore */
              }
              window.location.reload();
            }}
          >
            清除备考本地数据并刷新
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
