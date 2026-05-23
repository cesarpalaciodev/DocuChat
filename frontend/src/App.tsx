import { useState, useEffect } from "react"
import Sidebar from "./components/Sidebar"
import ChatWindow from "./components/ChatWindow"
import ToastContainer from "./components/Toast"
import ErrorBoundary from "./components/ErrorBoundary"

export default function App() {
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null)

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
        <Sidebar selectedRepo={selectedRepo} onSelectRepo={setSelectedRepo} />
        <ChatWindow selectedRepo={selectedRepo} />
        <ToastContainer />
      </div>
    </ErrorBoundary>
  )
}
