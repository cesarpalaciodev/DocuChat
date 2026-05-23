import { Component, ReactNode } from "react"

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: string | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error: error.message }
  }

  componentDidCatch(error: Error) {
    console.error("DocuChat UI Error:", error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen bg-[var(--bg-terminal)]">
          <div className="text-center max-w-md p-8 border border-[var(--accent-red)] bg-[var(--bg-panel)]">
            <pre className="text-[var(--accent-red)] text-xs mb-4 font-mono select-none">
{`  ERROR
  -----
  The interface crashed.`}
            </pre>
            <p className="text-[var(--text-dim)] text-xs font-mono mb-4">
              {this.state.error}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-xs font-bold uppercase bg-[var(--accent-amber)] text-[var(--bg-terminal)] hover:opacity-80 transition-opacity"
            >
              Reload
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
