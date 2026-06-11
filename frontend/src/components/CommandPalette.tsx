import { useState, useEffect, useRef, useCallback } from "react"
import { Repo } from "../lib/api"

interface Props {
  isOpen: boolean
  onClose: () => void
  repos: Repo[]
  onSelectRepo: (id: string | null) => void
  onToggleZen: () => void
  onClearChat: () => void
  onShowShortcuts: () => void
  onOpenSettings: () => void
}

interface Command {
  id: string
  label: string
  shortcut: string
  section: string
  action: () => void
}

export default function CommandPalette({ isOpen, onClose, repos, onSelectRepo, onToggleZen, onClearChat, onShowShortcuts, onOpenSettings }: Props) {
  const [query, setQuery] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setQuery("")
      setActiveIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  const commands: Command[] = [
    ...(repos.length > 0 ? [{ id: "global", label: "search all repos", shortcut: "", section: "Repo", action: () => onSelectRepo(null) }] : []),
    ...repos.map((r) => ({
      id: r.id,
      label: r.name,
      shortcut: r.id.slice(0, 8),
      section: "Repo",
      action: () => onSelectRepo(r.id),
    })),
    { id: "zen", label: "Toggle zen mode", shortcut: "Ctrl+Shift+Z", section: "Actions", action: onToggleZen },
    { id: "clear", label: "Clear chat", shortcut: "", section: "Actions", action: onClearChat },
    { id: "shortcuts", label: "Keyboard shortcuts", shortcut: "?", section: "Actions", action: onShowShortcuts },
    { id: "settings", label: "API Settings", shortcut: "Ctrl+\\", section: "Actions", action: onOpenSettings },
  ]

  const filtered = commands.filter((c) =>
    c.label.toLowerCase().includes(query.toLowerCase())
  )

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  const handleKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setActiveIndex((i) => (i + 1) % Math.max(filtered.length, 1))
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setActiveIndex((i) => (i - 1 + filtered.length) % Math.max(filtered.length, 1))
      } else if (e.key === "Enter") {
        e.preventDefault()
        if (filtered[activeIndex]) {
          filtered[activeIndex].action()
          onClose()
        }
      } else if (e.key === "Escape") {
        onClose()
      }
    },
    [filtered, activeIndex, onClose]
  )

  if (!isOpen) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="glass neon-border w-full max-w-lg rounded-xl overflow-hidden"
        style={{ background: "var(--bg-panel)", boxShadow: "0 0 40px rgba(52,211,153,0.1)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4">
          <div className="flex items-center gap-3">
            <span className="text-[var(--accent-neon)] text-lg font-mono" style={{ textShadow: "0 0 10px var(--accent-neon-glow)" }}>&#9670;</span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Type a command..."
              className="cmd-palette-input flex-1"
              aria-label="Command palette"
            />
          </div>
        </div>
        <div className="max-h-72 overflow-y-auto px-2 pb-3">
          {filtered.length === 0 ? (
            <p className="text-[var(--text-dim)] text-xs font-mono px-4 py-6 text-center">no commands found</p>
          ) : (
            (() => {
              let lastSection = ""
              return filtered.map((cmd, i) => {
                const showSection = cmd.section !== lastSection
                lastSection = cmd.section
                return (
                  <div key={cmd.id}>
                    {showSection && <div className="cmd-section">{cmd.section}</div>}
                    <div
                      className={`cmd-result ${i === activeIndex ? "active" : ""}`}
                      onClick={() => { cmd.action(); onClose() }}
                      onMouseEnter={() => setActiveIndex(i)}
                    >
                      <span className="text-[var(--text-dim)]">{">"}</span>
                      <span className="flex-1">{cmd.label}</span>
                      {cmd.shortcut && (
                        <kbd className="text-[10px] text-[var(--text-dim)] bg-[var(--bg-input)] px-1.5 py-0.5 rounded border border-[var(--border-dim)] font-mono">{cmd.shortcut}</kbd>
                      )}
                    </div>
                  </div>
                )
              })
            })()
          )}
        </div>
      </div>
    </div>
  )
}
