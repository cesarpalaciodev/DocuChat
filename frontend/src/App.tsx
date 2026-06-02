import { useState, useEffect } from "react"
import Sidebar from "./components/Sidebar"
import ChatWindow from "./components/ChatWindow"
import ToastContainer from "./components/Toast"
import ErrorBoundary from "./components/ErrorBoundary"
import { getConversation } from "./lib/api"

export default function App() {
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null)
  const [loadConvData, setLoadConvData] = useState<{ messages: any[]; convId: string } | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  async function handleLoadConversation(id: string) {
    try {
      const conv = await getConversation(id)
      const msgs = conv.messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
        sources: typeof m.sources === "string" ? (() => { try { return JSON.parse(m.sources) } catch { return undefined } })() : undefined,
      }))
      setLoadConvData({ messages: msgs, convId: id })
      setSidebarOpen(false)
    } catch { /* silent */ }
  }

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        const input = document.querySelector<HTMLInputElement>('[aria-label="Ask a question"]')
        if (document.activeElement === input) { input?.blur() } else { input?.focus() }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()
        document.querySelector<HTMLInputElement>('[aria-label="Ask a question"]')?.focus()
      }
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [])

  return (
    <ErrorBoundary>
      <div className="flex flex-col lg:flex-row h-screen overflow-hidden relative">
        {/* Mobile hamburger */}
        <button onClick={() => setSidebarOpen(true)}
          className="lg:hidden fixed top-3 left-3 z-40 p-2 rounded-lg bg-[var(--bg-panel)] border border-[var(--border-dim)] text-[var(--text-dim)] hover:text-[var(--text-bright)] transition-colors cursor-pointer"
          aria-label="Open sidebar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
        </button>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar - slide on mobile, static on desktop */}
        <div className={`lg:relative lg:flex ${sidebarOpen ? "fixed inset-y-0 left-0 z-40 flex" : "hidden lg:flex"} transition-transform duration-300`}>
          <Sidebar selectedRepo={selectedRepo} onSelectRepo={(id) => { setSelectedRepo(id); setSidebarOpen(false) }} onLoadConversation={handleLoadConversation} />
        </div>

        <ChatWindow selectedRepo={selectedRepo} loadConversation={loadConvData} />
        <ToastContainer />
      </div>
    </ErrorBoundary>
  )
}
