import { useRef, useEffect } from "react"

interface Tab {
  id: string
  title: string
}

interface Props {
  tabs: Tab[]
  activeId: string | null
  onSelect: (id: string) => void
  onClose: (id: string) => void
  onNew: () => void
}

export default function ChatTabs({ tabs, activeId, onSelect, onClose, onNew }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const active = el.querySelector(".tab.active") as HTMLElement | undefined
    active?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" })
  }, [activeId])

  function handleClose(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    onClose(id)
  }

  if (tabs.length === 0) {
    return (
      <div className="tab-bar px-4 py-2 text-[10px] text-[var(--text-dim)] font-mono">
        no conversations yet
      </div>
    )
  }

  return (
    <div ref={scrollRef} className="tab-bar" role="tablist" aria-label="Conversation tabs">
      <button
        onClick={onNew}
        className="tab text-[var(--accent-neon)] hover:!text-[var(--accent-neon)]"
        role="tab"
        title="New conversation"
        aria-label="New conversation"
      >
        <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
          <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      {tabs.map((tab, i) => (
        <button
          key={tab.id}
          onClick={() => onSelect(tab.id)}
          className={`tab btn-press ${activeId === tab.id ? "active" : ""}`}
          role="tab"
          aria-selected={activeId === tab.id}
          aria-label={tab.title}
          style={{ animationDelay: `${i * 30}ms`, animation: "msg-materialize 200ms var(--ease-out) both" } as React.CSSProperties}
        >
          <span className="truncate max-w-[120px]">{tab.title}</span>
          <span
            className="tab-close"
            onClick={(e) => handleClose(e, tab.id)}
            role="button"
            tabIndex={0}
            aria-label={`Close ${tab.title}`}
            onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onClose(tab.id) } }}
          >
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
              <path d="M3 3L13 13M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </span>
        </button>
      ))}
    </div>
  )
}
