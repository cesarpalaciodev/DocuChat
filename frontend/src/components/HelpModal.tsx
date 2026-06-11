import { useEffect, useRef } from "react"

interface Props {
  isOpen: boolean
  onClose: () => void
  onOpenSettings: () => void
}

export default function HelpModal({ isOpen, onClose, onOpenSettings }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center cmd-palette-overlay"
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label="Help and documentation"
    >
      <div className="glass w-full max-w-2xl rounded-xl overflow-hidden shadow-2xl" style={{ borderColor: "var(--border-glow)", maxHeight: "85vh" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-dim)]">
          <h2 className="text-[13px] text-[var(--text-bright)] font-mono font-bold uppercase tracking-wider">
            <span className="text-[var(--accent-neon)] mr-1.5" style={{ textShadow: "0 0 8px var(--accent-neon-glow)" }}>&#9670;</span>
            DocuChat Help
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-[var(--text-dim)] hover:text-[var(--text-bright)] hover:bg-[rgba(52,211,153,0.08)] rounded transition-colors btn-press cursor-pointer"
            aria-label="Close help"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M3 3L13 13M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto p-5 space-y-6">
          <section>
            <h3 className="text-[11px] text-[var(--accent-neon)] font-bold uppercase tracking-[0.2em] mb-3">Getting Started</h3>
            <div className="space-y-2 text-[12px] text-[var(--text-primary)] font-mono leading-relaxed">
              <p>1. <strong className="text-[var(--text-bright)]">Clone a repository</strong> &mdash; enter a GitHub/GitLab URL in the sidebar and click <span className="text-[var(--accent-neon)]">index</span>.</p>
              <p>2. <strong className="text-[var(--text-bright)]">Configure your API key</strong> &mdash; open <button onClick={() => { onOpenSettings(); onClose() }} className="text-[var(--accent-neon)] underline cursor-pointer hover:text-white">Settings (Ctrl+\)</button> and paste your OpenRouter, OpenAI, Groq, or DeepSeek key.</p>
              <p>3. <strong className="text-[var(--text-bright)]">Ask a question</strong> &mdash; type in the input and press Enter. Answers stream token by token with source citations.</p>
              <p>4. <strong className="text-[var(--text-bright)]">Click a source</strong> &mdash; opens the full file in a side panel. Click the file path in citations to inspect context.</p>
            </div>
          </section>

          <section>
            <h3 className="text-[11px] text-[var(--accent-neon)] font-bold uppercase tracking-[0.2em] mb-3">How API Keys Work</h3>
            <div className="space-y-2 text-[12px] text-[var(--text-primary)] font-mono leading-relaxed">
              <p>Your API key is <strong className="text-[var(--text-bright)]">never stored on the server</strong>. It lives only in your browser's localStorage.</p>
              <p>Each request sends your key as an HTTP header (<code className="text-[var(--accent-cyan)] bg-[var(--bg-input)] px-1 rounded">X-User-API-Key</code>). The server uses it to call the LLM and then discards it.</p>
              <p>Get a free key at:</p>
              <ul className="list-disc pl-5 space-y-1 text-[var(--text-dim)]">
                <li><a href="https://openrouter.ai/keys" target="_blank" rel="noopener" className="text-[var(--accent-cyan)] hover:underline">openrouter.ai/keys</a> &mdash; no phone required, free credits</li>
                <li><a href="https://platform.openai.com" target="_blank" rel="noopener" className="text-[var(--accent-cyan)] hover:underline">platform.openai.com</a> &mdash; pay per use</li>
                <li><a href="https://console.groq.com/keys" target="_blank" rel="noopener" className="text-[var(--accent-cyan)] hover:underline">console.groq.com/keys</a> &mdash; free tier</li>
              </ul>
            </div>
          </section>

          <section>
            <h3 className="text-[11px] text-[var(--accent-neon)] font-bold uppercase tracking-[0.2em] mb-3">Keyboard Shortcuts</h3>
            <div className="grid grid-cols-1 gap-px">
              {[
                { key: "Ctrl+K", desc: "Command palette" },
                { key: "Ctrl+B", desc: "Toggle sidebar" },
                { key: "Ctrl+\\", desc: "API Settings" },
                { key: "Ctrl+Shift+Z", desc: "Zen mode" },
                { key: "?", desc: "Shortcuts reference" },
                { key: "Escape", desc: "Close modals / toggle input" },
                { key: "Ctrl+Shift+R", desc: "Regenerate last response" },
                { key: "Enter", desc: "Send message" },
              ].map(({ key, desc }) => (
                <div key={key} className="flex items-center justify-between px-3 py-2 rounded hover:bg-[rgba(52,211,153,0.04)] transition-colors">
                  <kbd className="px-2.5 py-1 text-[11px] font-mono text-[var(--accent-neon)] border border-[var(--border-glow)] rounded bg-[rgba(52,211,153,0.06)] min-w-[100px] text-center" style={{ boxShadow: "0 0 8px rgba(52,211,153,0.1)" }}>{key}</kbd>
                  <span className="text-[12px] text-[var(--text-primary)] font-mono ml-4">{desc}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-[11px] text-[var(--accent-neon)] font-bold uppercase tracking-[0.2em] mb-3">Features</h3>
            <div className="space-y-2 text-[12px] text-[var(--text-primary)] font-mono leading-relaxed">
              <p><span className="text-[var(--accent-neon)]">*</span> <strong className="text-[var(--text-bright)]">Multi-repo search</strong> &mdash; select "all repos" to search across every indexed repository simultaneously.</p>
              <p><span className="text-[var(--accent-neon)]">*</span> <strong className="text-[var(--text-bright)]">TF-IDF + NumPy</strong> &mdash; no GPU required. Runs local vector search with cosine similarity.</p>
              <p><span className="text-[var(--accent-neon)]">*</span> <strong className="text-[var(--text-bright)]">SSE Streaming</strong> &mdash; answers appear token by token. Press the Stop button to cancel.</p>
              <p><span className="text-[var(--accent-neon)]">*</span> <strong className="text-[var(--text-bright)]">Drag &amp; Drop</strong> &mdash; drag a GitHub URL onto the sidebar to clone instantly.</p>
              <p><span className="text-[var(--accent-neon)]">*</span> <strong className="text-[var(--text-bright)]">Conversation tabs</strong> &mdash; multiple chat threads, like terminal tabs.</p>
              <p><span className="text-[var(--accent-neon)]">*</span> <strong className="text-[var(--text-bright)]">Export</strong> &mdash; conversations export to Markdown format.</p>
            </div>
          </section>

          <section>
            <h3 className="text-[11px] text-[var(--accent-neon)] font-bold uppercase tracking-[0.2em] mb-3">Tech Stack</h3>
            <p className="text-[12px] text-[var(--text-dim)] font-mono leading-relaxed">
              Backend: Python 3.11+ &middot; FastAPI &middot; Uvicorn &middot; SQLite &middot; NumPy<br />
              Frontend: React 18 &middot; TypeScript 5.6 &middot; Tailwind CSS 3 &middot; Vite 6<br />
              LLM: OpenAI-compatible API (OpenRouter, Groq, DeepSeek, etc.)<br />
              License: MIT &middot; <a href="https://github.com/cesarpalaciodev/DocuChat" target="_blank" rel="noopener" className="text-[var(--accent-cyan)] hover:underline">github.com/cesarpalaciodev/DocuChat</a>
            </p>
          </section>
        </div>

        <div className="px-4 py-2 border-t border-[var(--border-dim)] text-[10px] text-[var(--text-dim)] font-mono flex items-center justify-between">
          <span>press <span className="text-[var(--accent-neon)]">esc</span> to close</span>
          <button onClick={() => { onOpenSettings(); onClose() }} className="text-[var(--accent-neon)] hover:text-white transition-colors cursor-pointer">open settings</button>
        </div>
      </div>
    </div>
  )
}
