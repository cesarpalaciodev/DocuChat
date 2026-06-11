import { useState, useEffect, useCallback, useRef } from "react"

const STORAGE_KEY = "docuchat_history"
const MAX_HISTORY = 50

export function useSearchHistory() {
  const [history, setHistory] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  const addToHistory = useCallback((query: string) => {
    if (!query.trim()) return
    setHistory((prev) => {
      const filtered = prev.filter((item) => item !== query.trim())
      const next = [query.trim(), ...filtered].slice(0, MAX_HISTORY)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  return { history, addToHistory }
}

interface Props {
  items: string[]
  onSelect: (query: string) => void
  visible: boolean
}

export default function SearchHistory({ items, onSelect, visible }: Props) {
  const [activeIndex, setActiveIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setActiveIndex(0)
  }, [items.length, visible])

  useEffect(() => {
    if (!visible) return
    function handleKey(e: KeyboardEvent) {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault()
          setActiveIndex((i) => (i + 1) % Math.max(items.length, 1))
          break
        case "ArrowUp":
          e.preventDefault()
          setActiveIndex((i) => (i - 1 + items.length) % Math.max(items.length, 1))
          break
        case "Enter":
          e.preventDefault()
          if (items[activeIndex]) onSelect(items[activeIndex])
          break
        case "Escape":
          break
      }
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [visible, items, activeIndex, onSelect])

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    const active = el.children[activeIndex] as HTMLElement | undefined
    active?.scrollIntoView({ block: "nearest" })
  }, [activeIndex])

  if (!visible || items.length === 0) return null

  return (
    <div
      className="absolute left-0 right-0 bottom-full mb-1 glass rounded-lg overflow-hidden shadow-lg"
      style={{ borderColor: "var(--border-glow)" }}
      role="listbox"
      aria-label="Search history"
    >
      <div className="px-3 py-1.5 border-b border-[var(--border-dim)] text-[10px] text-[var(--text-dim)] font-mono uppercase tracking-wider">
        recent searches
      </div>
      <div ref={listRef} className="max-h-[180px] overflow-y-auto">
        {items.map((item, i) => (
          <div
            key={`${item}-${i}`}
            className={`search-history-item ${i === activeIndex ? "active" : ""}`}
            onClick={() => onSelect(item)}
            onMouseEnter={() => setActiveIndex(i)}
            role="option"
            aria-selected={i === activeIndex}
          >
            <span className="text-[var(--text-dim)] mr-2" aria-hidden>
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M11 11L14.5 14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </span>
            <span className="truncate" style={{ color: i === activeIndex ? "var(--accent-neon)" : "var(--text-primary)" }}>
              {item}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
