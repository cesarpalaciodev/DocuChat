import { useState, useEffect } from "react"
import Sidebar from "./components/Sidebar"
import ChatWindow from "./components/ChatWindow"
import ToastContainer from "./components/Toast"
import ErrorBoundary from "./components/ErrorBoundary"
import { getConversation } from "./lib/api"

export default function App() {
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null)
  const [loadConvId, setLoadConvId] = useState<string | null>(null)

  async function handleLoadConversation(id: string) {
    try {
      const conv = await getConversation(id)
      const msgs = conv.messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
        sources: typeof m.sources === "string" ? (() => { try { return JSON.parse(m.sources) } catch { return undefined } })() : undefined,
      }))
      setLoadConvId(JSON.stringify(msgs))
    } catch {
      // silent
    }
  }

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        const input = document.querySelector<HTMLInputElement>('[aria-label="Ask a question"]')
        if (document.activeElement === input) {
          input?.blur()
        } else {
          input?.focus()
        }
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
      <div className="flex flex-col lg:flex-row h-screen overflow-hidden crt-overlay">
        <Sidebar selectedRepo={selectedRepo} onSelectRepo={setSelectedRepo} onLoadConversation={handleLoadConversation} />
        <ChatWindow selectedRepo={selectedRepo} loadHistory={loadConvId} />
        <ToastContainer />
      </div>
    </ErrorBoundary>
  )
}
