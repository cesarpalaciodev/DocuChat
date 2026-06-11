import { useEffect, useRef } from "react"
import { Repo } from "../lib/api"

interface Props {
  isOpen: boolean
  repo: Repo | null
  onClose: () => void
}

export default function RepoDetail({ isOpen, repo, onClose }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [isOpen, onClose])

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose()
  }

  if (!isOpen || !repo) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center cmd-palette-overlay"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label={`Repository detail: ${repo.name}`}
    >
      <div
        className="glass rounded-xl overflow-hidden shadow-2xl"
        style={{
          borderColor: "var(--border-glow)",
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? "scale(1)" : "scale(0.95)",
          transition: "opacity 200ms var(--ease-out), transform 200ms var(--ease-out)",
        }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-dim)]">
          <div className="flex items-center gap-3">
            <span className="text-[var(--accent-neon)]" aria-hidden>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 4.5L8 1L14 4.5V11.5L8 15L2 11.5V4.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M8 8.5L14 5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M2 5L8 8.5" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </span>
            <h2 className="text-[14px] text-[var(--text-bright)] font-mono font-bold truncate max-w-[300px]">{repo.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[var(--text-dim)] hover:text-[var(--text-bright)] hover:bg-[rgba(52,211,153,0.08)] rounded transition-colors btn-press cursor-pointer"
            aria-label="Close repo detail"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M3 3L13 13M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <span className="text-[10px] text-[var(--text-dim)] uppercase tracking-[0.15em] font-bold">Repository URL</span>
            <p className="mt-1 text-[12px] text-[var(--accent-cyan)] font-mono break-all">{repo.url}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-[10px] text-[var(--text-dim)] uppercase tracking-[0.15em] font-bold">Branch</span>
              <p className="mt-1 text-[12px] text-[var(--text-bright)] font-mono">
                {repo.url.includes("/tree/") ? repo.url.split("/tree/")[1]?.split("/")[0] || "main" : "main"}
              </p>
            </div>
            <div>
              <span className="text-[10px] text-[var(--text-dim)] uppercase tracking-[0.15em] font-bold">Chunks</span>
              <p className="mt-1 text-[12px] text-[var(--accent-neon)] font-mono">{repo.indexed_documents}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-[10px] text-[var(--text-dim)] uppercase tracking-[0.15em] font-bold">Status</span>
              <p className="mt-1 text-[12px] font-mono flex items-center gap-1.5">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: repo.status === "ready" ? "var(--accent-neon)" : repo.status === "error" ? "var(--accent-red)" : "var(--accent-amber)",
                    boxShadow: repo.status === "ready" ? "0 0 6px var(--accent-neon-glow)" : "none",
                  }}
                  aria-hidden
                />
                <span style={{ color: repo.status === "ready" ? "var(--accent-neon)" : repo.status === "error" ? "var(--accent-red)" : "var(--accent-amber)" }}>
                  {repo.status}
                </span>
              </p>
            </div>
            <div>
              <span className="text-[10px] text-[var(--text-dim)] uppercase tracking-[0.15em] font-bold">Repo ID</span>
              <p className="mt-1 text-[11px] text-[var(--text-dim)] font-mono truncate">{repo.id}</p>
            </div>
          </div>
        </div>

        <div className="px-4 py-2 border-t border-[var(--border-dim)] text-[10px] text-[var(--text-dim)] font-mono flex items-center gap-4">
          <span>press <span className="text-[var(--accent-neon)]">esc</span> to close</span>
        </div>
      </div>
    </div>
  )
}
