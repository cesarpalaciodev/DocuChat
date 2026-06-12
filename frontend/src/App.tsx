import { useState, useEffect, useCallback, useRef } from "react"
import Sidebar from "./components/Sidebar"
import ChatWindow from "./components/ChatWindow"
import ToastContainer from "./components/Toast"
import ErrorBoundary from "./components/ErrorBoundary"
import ParticleBackground from "./components/ParticleBackground"
import CommandPalette from "./components/CommandPalette"
import ShortcutsModal from "./components/ShortcutsModal"
import RepoDetail from "./components/RepoDetail"
import SourcePanel from "./components/SourcePanel"
import StatusBar from "./components/StatusBar"
import AuthModal from "./components/AuthModal"
import SettingsModal from "./components/SettingsModal"
import HelpModal from "./components/HelpModal"
import { getConversation, Repo, getUserKeyInfo } from "./lib/api"
import { getStoredUser, setStoredUser, AuthUser } from "./lib/auth"

const MIN_WIDTH = 220
const MAX_WIDTH = 520
const DEFAULT_WIDTH = 320

function loadHistoryItems(): string[] {
  try {
    const raw = localStorage.getItem("docuchat_history")
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export default function App() {
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null)
  const [loadConvId, setLoadConvId] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [width, setWidth] = useState(DEFAULT_WIDTH)
  const [zenMode, setZenMode] = useState(false)
  const [activeSource, setActiveSource] = useState<{ filePath: string; content: string } | null>(null)
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [detailRepo, setDetailRepo] = useState<Repo | null>(null)
  const [historyItems, setHistoryItems] = useState<string[]>(loadHistoryItems)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [userKeyInfo, setUserKeyInfo] = useState(getUserKeyInfo)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(getStoredUser)

  const [repos, setRepos] = useState<Repo[]>([])
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const isMobile = useRef(false)

  useEffect(() => {
    isMobile.current = window.innerWidth < 768
    const handler = () => { isMobile.current = window.innerWidth < 768 }
    window.addEventListener("resize", handler)
    return () => window.removeEventListener("resize", handler)
  }, [])

  useEffect(() => {
    import("./lib/api").then(({ listRepos }) => {
      listRepos().then(setRepos).catch(() => {})
    })
  }, [])

  async function handleLoadConversation(id: string) {
    try {
      const conv = await getConversation(id)
      const msgs = conv.messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
        sources: typeof m.sources === "string" ? (() => { try { return JSON.parse(m.sources) } catch { return undefined } })() : undefined,
      }))
      setLoadConvId(JSON.stringify(msgs))
    } catch { /* silent */ }
  }

  const toggleSidebar = useCallback(() => setCollapsed((c) => !c), [])

  const modalRef = useRef({ cmdPaletteOpen, shortcutsOpen, detailRepo, activeSource })
  modalRef.current = { cmdPaletteOpen, shortcutsOpen, detailRepo, activeSource }

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const m = modalRef.current

      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()
        setCmdPaletteOpen((v) => !v)
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "b") {
        e.preventDefault()
        toggleSidebar()
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "Z") {
        e.preventDefault()
        setZenMode((z) => !z)
        return
      }
      if (e.key === "?") {
        e.preventDefault()
        setShortcutsOpen((v) => !v)
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "\\") {
        e.preventDefault()
        setSettingsOpen((v) => !v)
        return
      }
      if (e.key === "Escape") {
        if (m.cmdPaletteOpen) { setCmdPaletteOpen(false); return }
        if (m.shortcutsOpen) { setShortcutsOpen(false); return }
        if (m.detailRepo) { setDetailRepo(null); return }
        if (m.activeSource) { setActiveSource(null); return }
        const input = document.querySelector<HTMLInputElement>('[aria-label="Ask a question"]')
        if (document.activeElement === input) input?.blur(); else input?.focus()
      }
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [toggleSidebar])

  return (
    <ErrorBoundary>
      <ParticleBackground />
      <div className="flex h-screen overflow-hidden crt-overlay" style={{ position: "relative", zIndex: 1 }}>
        {((!collapsed && !zenMode) || mobileDrawerOpen) && (
          <>
            {mobileDrawerOpen && (
              <div className="drawer-overlay md:hidden" onClick={() => setMobileDrawerOpen(false)} />
            )}
            <aside className={`${mobileDrawerOpen ? "drawer open" : ""} ${!mobileDrawerOpen && !collapsed && !zenMode ? "hidden md:block" : ""}`}>
              <Sidebar
                selectedRepo={selectedRepo}
                onSelectRepo={setSelectedRepo}
                onLoadConversation={handleLoadConversation}
                width={width}
                onResize={setWidth}
                minWidth={MIN_WIDTH}
                maxWidth={MAX_WIDTH}
                onDoubleClickRepo={setDetailRepo}
              />
            </aside>
          </>
        )}
        <div className="flex-1 flex flex-col min-w-0">
          <ChatWindow
            selectedRepo={selectedRepo}
            loadHistory={loadConvId}
            sidebarCollapsed={collapsed}
            onToggleSidebar={toggleSidebar}
            onSourceClick={(filePath, content) => setActiveSource({ filePath, content })}
            historyItems={historyItems}
            onAddHistory={(q: string) => {
              const next = [q, ...historyItems.filter((h) => h !== q)].slice(0, 10)
              setHistoryItems(next)
              try { localStorage.setItem("docuchat_history", JSON.stringify(next)) } catch {}
            }}
            onOpenSettings={() => setSettingsOpen(true)}
            onOpenHelp={() => setHelpOpen(true)}
            onOpenAuth={() => setAuthModalOpen(true)}
            currentUser={currentUser}
            onToggleMobileDrawer={() => setMobileDrawerOpen((v) => !v)}
          />
        </div>
        {activeSource && !zenMode && (
          <SourcePanel
            filePath={activeSource.filePath}
            content={activeSource.content}
            onClose={() => setActiveSource(null)}
          />
        )}
      </div>
      {!zenMode && <StatusBar selectedRepo={selectedRepo} hasUserKey={userKeyInfo.hasKey} userModel={userKeyInfo.model} onOpenSettings={() => setSettingsOpen(true)} currentUser={currentUser} onOpenAuth={() => setAuthModalOpen(true)} onLogout={() => { setStoredUser(null); setCurrentUser(null) }} />}
      <CommandPalette
        isOpen={cmdPaletteOpen}
        onClose={() => setCmdPaletteOpen(false)}
        repos={repos}
        onSelectRepo={setSelectedRepo}
        onToggleZen={() => setZenMode((z) => !z)}
        onClearChat={() => window.dispatchEvent(new CustomEvent("docuchat:clear"))}
        onShowShortcuts={() => { setShortcutsOpen(true); setCmdPaletteOpen(false) }}
        onOpenSettings={() => { setSettingsOpen(true); setCmdPaletteOpen(false) }}
      />
      <ShortcutsModal isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSaved={() => setUserKeyInfo(getUserKeyInfo())}
      />
      <HelpModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} onOpenSettings={() => { setHelpOpen(false); setSettingsOpen(true) }} />
      <RepoDetail isOpen={!!detailRepo} repo={detailRepo} onClose={() => setDetailRepo(null)} />
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} onAuth={(user) => setCurrentUser(user)} />
      <ToastContainer />
    </ErrorBoundary>
  )
}
