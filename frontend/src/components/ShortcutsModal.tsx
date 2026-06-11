import { useEffect, useRef } from "react"

interface Props {
  isOpen: boolean
  onClose: () => void
}

interface ShortcutGroup {
  section: string
  items: { key: string; description: string }[]
}

const shortcutGroups: ShortcutGroup[] = [
  {
    section: "Navigation",
    items: [
      { key: "Ctrl+K", description: "Focus command palette" },
      { key: "Ctrl+B", description: "Toggle sidebar" },
      { key: "Ctrl+`", description: "Toggle source panel" },
      { key: "Ctrl+J", description: "Next conversation tab" },
      { key: "Ctrl+[", description: "Previous conversation tab" },
      { key: "Escape", description: "Focus chat / Blur chat" },
    ],
  },
  {
    section: "Chat",
    items: [
      { key: "Enter", description: "Send message" },
      { key: "Shift+Enter", description: "New line in input" },
      { key: "Ctrl+L", description: "Clear current chat" },
      { key: "Ctrl+E", description: "Export conversation as markdown" },
      { key: "Ctrl+Up", description: "Scroll to previous message" },
      { key: "Ctrl+Down", description: "Scroll to next message" },
    ],
  },
  {
    section: "Repos",
    items: [
      { key: "Ctrl+I", description: "Open repo index dialog" },
      { key: "Ctrl+Shift+R", description: "Refresh repo list" },
      { key: "Delete", description: "Remove selected repo" },
      { key: "Ctrl+Enter", description: "Re-index current repo" },
    ],
  },
  {
    section: "System",
    items: [
      { key: "Ctrl+Z", description: "Toggle zen mode" },
      { key: "Ctrl+\\", description: "Open API settings" },
      { key: "Ctrl+Shift+?", description: "Show keyboard shortcuts" },
      { key: "Ctrl+0", description: "Reset zoom / layout" },
      { key: "F11", description: "Toggle fullscreen" },
    ],
  },
]

export default function ShortcutsModal({ isOpen, onClose }: Props) {
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

  if (!isOpen) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center cmd-palette-overlay"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
    >
      <div className="glass w-full max-w-xl rounded-xl overflow-hidden shadow-2xl" style={{ borderColor: "var(--border-glow)" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-dim)]">
          <h2 className="text-[13px] text-[var(--text-bright)] font-mono font-bold uppercase tracking-wider">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-[var(--text-dim)] hover:text-[var(--text-bright)] hover:bg-[rgba(52,211,153,0.08)] rounded transition-colors btn-press cursor-pointer"
            aria-label="Close shortcuts"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M3 3L13 13M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="max-h-[420px] overflow-y-auto p-4">
          {shortcutGroups.map((group) => (
            <div key={group.section} className="mb-5 last:mb-0">
              <h3 className="cmd-section">{group.section}</h3>
              <div className="space-y-px">
                {group.items.map((item) => (
                  <div key={item.key} className="flex items-center justify-between px-3 py-2 rounded hover:bg-[rgba(52,211,153,0.04)] transition-colors">
                    <kbd className="px-2.5 py-1 text-[11px] font-mono text-[var(--accent-neon)] border border-[var(--border-glow)] rounded bg-[rgba(52,211,153,0.06)] min-w-[100px] text-center" style={{ boxShadow: "0 0 8px rgba(52,211,153,0.1)" }}>
                      {item.key}
                    </kbd>
                    <span className="text-[12px] text-[var(--text-primary)] font-mono ml-4">{item.description}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="px-4 py-2 border-t border-[var(--border-dim)] text-[10px] text-[var(--text-dim)] font-mono flex items-center gap-4">
          <span>press <span className="text-[var(--accent-neon)]">esc</span> to close</span>
        </div>
      </div>
    </div>
  )
}
