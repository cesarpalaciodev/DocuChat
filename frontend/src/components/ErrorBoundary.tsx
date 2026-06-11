import { Component, ReactNode } from "react"

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: string | null
}

export default class ErrorBoundary extends Component<Props, State> {
  private listener: ((e: KeyboardEvent) => void) | null = null

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

  componentDidUpdate(_prev: Props, prevState: State) {
    if (this.state.hasError && !prevState.hasError) {
      this.listener = (e: KeyboardEvent) => {
        if (e.key === "r" && !e.ctrlKey && !e.metaKey && !e.altKey) {
          window.location.reload()
        }
      }
      window.addEventListener("keydown", this.listener)
    } else if (!this.state.hasError && prevState.hasError && this.listener) {
      window.removeEventListener("keydown", this.listener)
      this.listener = null
    }
  }

  componentWillUnmount() {
    if (this.listener) {
      window.removeEventListener("keydown", this.listener)
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen bg-[var(--bg-terminal)]">
          <div className="text-center max-w-md p-8 glass neon-border" style={{ borderColor: "var(--accent-red)", boxShadow: "0 0 24px rgba(248,113,113,0.2), inset 0 1px 0 rgba(255,255,255,0.03)" }}>
            <pre className="text-[var(--accent-red)] text-xs mb-4 font-mono select-none glitch-text" data-text="  ERROR" style={{ textShadow: "0 0 12px rgba(248,113,113,0.4)" }}>
{`  ERROR
   -----
   The interface crashed.`}
            </pre>
            <p className="text-[var(--text-dim)] text-xs font-mono mb-4">
              {this.state.error}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-xs font-bold uppercase bg-[var(--accent-red)] text-[var(--bg-terminal)] hover:opacity-80 transition-opacity cursor-pointer rounded btn-press"
            >
              Reload
            </button>
            <p className="text-[10px] text-[var(--text-dim)] font-mono mt-3">
              press R to reload
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
