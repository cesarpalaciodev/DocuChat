import { useEffect } from "react"

interface Props {
  filePath: string
  content: string
  onClose: () => void
}

export default function SourcePanel({ filePath, content, onClose }: Props) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [onClose])

  return (
    <div
      className="source-panel glass border-l border-[var(--border-glow)]"
      style={{
        width: 420,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        height: "100vh",
      }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-dim)]">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] text-[var(--text-dim)] uppercase tracking-[0.15em] font-bold mb-0.5">source</p>
          <p className="text-[12px] text-[var(--accent-cyan)] font-mono truncate">{filePath}</p>
        </div>
        <button
          onClick={onClose}
          className="ml-3 p-1.5 text-[var(--text-dim)] hover:text-[var(--accent-red)] transition-colors cursor-pointer font-mono text-sm"
          aria-label="Close source panel"
        >
          &#x2715;
        </button>
      </div>
      <pre className="flex-1 overflow-y-auto p-4 text-[12px] text-[var(--text-primary)] font-mono leading-relaxed whitespace-pre-wrap bg-[var(--bg-input)]">
        {content}
      </pre>
    </div>
  )
}
