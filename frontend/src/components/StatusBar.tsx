import { useCallback, useEffect, useState } from "react"

import { AuthUser } from "../lib/auth"

interface Props {
  selectedRepo: string | null
  repoName?: string | null
  loading?: boolean
  hasUserKey: boolean
  userModel: string
  onOpenSettings: () => void
  currentUser: AuthUser | null
  onOpenAuth: () => void
  onLogout: () => void
}

export default function StatusBar({ selectedRepo, repoName, loading, hasUserKey, userModel, onOpenSettings, currentUser, onOpenAuth, onLogout }: Props) {
  const [light, setLight] = useState(() => document.documentElement.classList.contains("light"))

  const toggleTheme = useCallback(() => {
    const next = !light
    setLight(next)
    if (next) {
      document.documentElement.classList.add("light")
      localStorage.setItem("theme", "light")
    } else {
      document.documentElement.classList.remove("light")
      localStorage.setItem("theme", "dark")
    }
  }, [light])

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: light)")
    const handler = (e: MediaQueryListEvent) => {
      if (localStorage.getItem("theme") === null) {
        const preferLight = e.matches
        setLight(preferLight)
        document.documentElement.classList.toggle("light", preferLight)
      }
    }
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  return (
    <div
      className="fixed bottom-0 left-0 right-0 h-8 flex items-center justify-between px-4 text-[10px] font-mono glass border-t border-[var(--border-dim)]"
      style={{ zIndex: 20 }}
    >
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5">
          <span
            className="w-1.5 h-1.5 rounded-full inline-block"
            style={{
              background: loading ? "var(--accent-amber)" : "var(--accent-neon)",
              boxShadow: loading
                ? "0 0 6px var(--accent-amber)"
                : "0 0 6px var(--accent-neon-glow)",
            }}
          />
          <span style={{ color: loading ? "var(--accent-amber)" : "var(--accent-neon)" }}>
            {loading ? "processing" : "ready"}
          </span>
        </span>
        <span className="text-[var(--text-dim)]">|</span>
        <span className="text-[var(--text-dim)]">
          repo: <span className="text-[var(--text-primary)]">{selectedRepo ? repoName || selectedRepo.slice(0, 8) : "global"}</span>
        </span>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenSettings}
          className="text-[var(--text-dim)] hover:text-[var(--accent-neon)] transition-colors cursor-pointer flex items-center gap-1"
          title="Open API Settings (Ctrl+\)"
        >
          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: hasUserKey ? "var(--accent-neon)" : "var(--text-dim)", boxShadow: hasUserKey ? "0 0 4px var(--accent-neon-glow)" : "none" }} />
          <span>key: {hasUserKey ? (userModel ? userModel.split("/").pop()?.slice(0, 14) || "yours" : "yours") : "not set"}</span>
        </button>
        <span className="text-[var(--text-dim)]">|</span>
        {currentUser ? (
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[var(--text-dim)]">
              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "var(--accent-neon)", boxShadow: "0 0 4px var(--accent-neon-glow)" }} />
              <span className="text-[var(--text-primary)]">{currentUser.username}</span>
            </span>
            <button
              onClick={onLogout}
              className="text-[var(--text-dim)] hover:text-[var(--accent-red)] transition-colors cursor-pointer font-mono"
              title="Sign out"
            >
              logout
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="text-[var(--text-dim)] hover:text-[var(--accent-neon)] transition-colors cursor-pointer font-mono"
          >
            sign in
          </button>
        )}
        <span className="text-[var(--text-dim)]">docu-chat v1.0.0</span>
        <button
          onClick={toggleTheme}
          className="text-[var(--text-dim)] hover:text-[var(--accent-neon)] transition-colors cursor-pointer flex items-center"
          title={light ? "Switch to dark mode" : "Switch to light mode"}
          aria-label={light ? "Switch to dark mode" : "Switch to light mode"}
        >
          {light ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}
