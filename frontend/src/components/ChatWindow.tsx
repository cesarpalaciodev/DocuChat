import { useState, useRef, useEffect, FormEvent } from "react"
import ReactMarkdown from "react-markdown"
import type { Components } from "react-markdown"
import { useChat, type Message } from "../hooks/useChat"
import SourceCitation from "./SourceCitation"

interface Props {
  selectedRepo: string | null
  loadConversation: { messages: Message[]; convId: string } | null
}

function safeUrl(href: string | undefined) {
  if (!href) return undefined
  if (href.startsWith("http://") || href.startsWith("https://") || href.startsWith("mailto:")) return href
  return undefined
}

function ThemeToggle() {
  const [isLight, setIsLight] = useState(() => document.documentElement.classList.contains("light"))
  function toggle() {
    const html = document.documentElement
    html.classList.toggle("light")
    const next = html.classList.contains("light")
    setIsLight(next)
    localStorage.setItem("theme", next ? "light" : "dark")
  }
  return (
    <button onClick={toggle} className="relative w-14 h-7 rounded-full border transition-all duration-300 cursor-pointer"
      style={{ background: isLight ? "#e6edf3" : "var(--border-dim)", borderColor: isLight ? "#d0d7de" : "var(--border-glow)" }}
      aria-label={`Switch to ${isLight ? "dark" : "light"} mode`}>
      <span className="absolute top-0.5 w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all duration-300 shadow-sm"
        style={{ left: isLight ? "calc(100% - 26px)" : "2px", background: "var(--accent-amber)" }}>
        {isLight ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--bg-terminal)" strokeWidth="2.5"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--bg-terminal)" strokeWidth="2.5"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        )}
      </span>
    </button>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }
  return (
    <button onClick={copy} className="absolute top-2 right-2 px-2 py-1 text-[10px] font-mono border border-[var(--border-dim)] rounded hover:border-[var(--border-glow)] bg-[var(--bg-terminal)] text-[var(--text-dim)] hover:text-[var(--text-bright)] transition-all cursor-pointer">
      {copied ? "Copied!" : "Copy"}
    </button>
  )
}

const markdownComponents: Components = {
  a: ({ href, children, ...props }) => (
    <a href={safeUrl(href)} target="_blank" rel="noopener noreferrer" {...props}>{children}</a>
  ),
  pre: ({ children, ...props }) => {
    const child = (children as { props?: { children?: string } })?.props?.children || ""
    const code = typeof child === "string" ? child : String(child)
    const lang = ((children as { props?: { className?: string } })?.props?.className || "").replace("language-", "")
    return (
      <div className="relative group">
        {lang && <span className="absolute top-2 left-3 text-[9px] text-[var(--text-dim)] font-mono uppercase">{lang}</span>}
        <CopyButton text={code} />
        <pre {...props} className={`bg-[var(--bg-terminal)] border border-[var(--border-dim)] rounded-lg p-4 my-2 overflow-x-auto ${lang ? "pt-6" : ""}`}>
          {children}
        </pre>
      </div>
    )
  },
  code: ({ className, children, ...props }) => {
    const isInline = !className
    if (isInline) {
      return <code className="text-[var(--accent-green)] bg-[var(--bg-terminal)] px-1.5 py-0.5 rounded text-[11px]" {...props}>{children}</code>
    }
    return <code className={`text-[var(--text-primary)] text-[11px] font-mono`} {...props}>{children}</code>
  },
}

function EmptyState() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center max-w-md">
        <div className="w-12 h-12 mx-auto mb-6 rounded-xl bg-gradient-to-br from-[var(--accent-amber)] to-[var(--accent-amber)]/30 flex items-center justify-center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--bg-terminal)" strokeWidth="2.5">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </div>
        <h2 className="text-lg font-bold text-[var(--text-bright)] font-mono mb-2">DocuChat</h2>
        <p className="text-sm text-[var(--text-dim)]">
          <span className="text-[var(--accent-amber)]">git clone</span> a repo from the sidebar to start asking questions
        </p>
      </div>
    </div>
  )
}

function SkeletonLine({ w }: { w: string }) {
  return <div className="h-3 rounded bg-[var(--border-dim)] animate-pulse" style={{ width: w }} />
}

function SkeletonMessage() {
  return (
    <div className="flex gap-3 msg-enter">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[var(--accent-green)]/20 flex items-center justify-center">
        <span className="text-xs text-[var(--accent-green)] font-bold">AI</span>
      </div>
      <div className="flex-1 max-w-[75%] px-5 py-4 rounded-2xl rounded-tl-md bg-[var(--bg-panel)] border border-[var(--border-dim)] space-y-2.5">
        <SkeletonLine w="90%" />
        <SkeletonLine w="75%" />
        <SkeletonLine w="85%" />
        <SkeletonLine w="60%" />
      </div>
    </div>
  )
}

export default function ChatWindow({ selectedRepo, loadConversation }: Props) {
  const { messages, loading, ask, clear, loadMessages, stop, regenerate } = useChat()
  const [input, setInput] = useState("")
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (loadConversation) {
      loadMessages(loadConversation.messages, loadConversation.convId)
    }
  }, [loadConversation, loadMessages])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    function check() { setShowScrollBtn(el!.scrollHeight - el!.scrollTop - el!.clientHeight > 100) }
    el.addEventListener("scroll", check)
    return () => el.removeEventListener("scroll", check)
  }, [])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!input.trim() || loading) return
    ask(input.trim(), selectedRepo)
    setInput("")
  }

  const lastAssistantMsg = [...messages].reverse().find(m => m.role === "assistant")

  return (
    <div className="flex-1 flex flex-col h-screen min-w-0">
      <header className="flex items-center justify-between px-6 py-3 border-b border-[var(--border-dim)] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-md bg-[var(--accent-amber)]/20 flex items-center justify-center">
            <span className="text-[11px] text-[var(--accent-amber)] font-bold font-mono">{selectedRepo ? "R" : "*"}</span>
          </div>
          <h2 className="text-xs font-bold text-[var(--text-bright)] font-mono tracking-wide">
            {selectedRepo ? selectedRepo.slice(0, 8) : "DocuChat RAG"}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          {messages.length > 0 && (
            <button onClick={clear} className="px-3 py-1.5 text-[10px] text-[var(--text-dim)] hover:text-[var(--accent-red)] border border-[var(--border-dim)] hover:border-[var(--accent-red)]/30 rounded-lg transition-all duration-200 cursor-pointer font-mono uppercase tracking-wider">
              + New Chat
            </button>
          )}
        </div>
      </header>

      <div ref={containerRef} className="flex-1 overflow-y-auto">
        {messages.length === 0 ? <EmptyState /> : (
          <div className="max-w-3xl mx-auto px-6 py-6 space-y-5">
            {messages.map((msg, i) => {
              const isUser = msg.role === "user"
              return (
                <div key={i} className={`msg-enter flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
                  <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${isUser ? "bg-[var(--accent-amber)]/20" : "bg-[var(--accent-green)]/20"}`}>
                    <span className={`text-xs font-bold font-mono ${isUser ? "text-[var(--accent-amber)]" : "text-[var(--accent-green)]"}`}>
                      {isUser ? "U" : "AI"}
                    </span>
                  </div>
                  <div className={`max-w-[78%] px-4 py-3 rounded-2xl ${isUser ? "bg-[var(--accent-amber)]/10 border border-[var(--accent-amber)]/20 rounded-tr-md" : "bg-[var(--bg-panel)] border border-[var(--border-dim)] rounded-tl-md shadow-sm"}`}>
                    {!isUser ? (
                      <div className="prose prose-sm max-w-none
                        [&_*]:font-mono
                        [&_p]:text-[13px] [&_p]:text-[var(--text-primary)] [&_p]:leading-relaxed [&_p]:my-1
                        [&_code]:text-[var(--accent-green)] [&_code]:bg-[var(--bg-terminal)] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[11px]
                        [&_pre]:bg-[var(--bg-terminal)] [&_pre]:border [&_pre]:border-[var(--border-dim)] [&_pre]:rounded-lg [&_pre]:p-4 [&_pre]:my-2 [&_pre]:overflow-x-auto
                        [&_a]:text-[var(--accent-cyan)] [&_a]:no-underline
                        [&_strong]:text-[var(--text-bright)] [&_strong]:font-bold
                        [&_blockquote]:border-l-2 [&_blockquote]:border-[var(--accent-amber)]/40 [&_blockquote]:pl-3 [&_blockquote]:my-2 [&_blockquote]:text-[var(--text-dim)] [&_blockquote]:italic">
                        <ReactMarkdown components={markdownComponents}>{msg.content}</ReactMarkdown>
                    {!isUser && !loading && i === messages.length - 1 && messages.length > 1 && (
                      <button
                        onClick={() => regenerate(selectedRepo)}
                        className="mt-2 flex items-center gap-1 px-2 py-1 text-[10px] text-[var(--text-dim)] hover:text-[var(--accent-amber)] border border-transparent hover:border-[var(--border-dim)] rounded transition-all cursor-pointer font-mono"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>
                        Regenerate
                      </button>
                    )}
                  </div>
                    ) : (
                      <p className="text-[13px] text-[var(--text-bright)] leading-relaxed font-mono whitespace-pre-wrap">{msg.content}</p>
                    )}
                    {msg.sources && msg.sources.length > 0 && (
                      <SourceCitation sources={msg.sources} repoName={msg.repoName} />
                    )}
                  </div>
                </div>
              )
            })}
            {loading && !lastAssistantMsg && <SkeletonMessage />}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {showScrollBtn && (
        <button onClick={() => bottomRef.current?.scrollIntoView({ behavior: "smooth" })}
          className="absolute bottom-20 right-6 w-8 h-8 rounded-full bg-[var(--bg-panel)] border border-[var(--border-dim)] shadow-md flex items-center justify-center text-[var(--text-dim)] hover:text-[var(--text-bright)] transition-colors cursor-pointer"
          aria-label="Scroll to bottom">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
        </button>
      )}

      <form onSubmit={handleSubmit} className="border-t border-[var(--border-dim)] p-4 shrink-0">
        <div className="max-w-3xl mx-auto flex items-center gap-2">
          <div className="flex-1 flex items-center bg-[var(--bg-input)] rounded-xl border border-[var(--border-dim)] focus-within:border-[var(--accent-amber)]/50 focus-within:shadow-sm focus-within:shadow-[var(--accent-amber)]/10 transition-all duration-200">
            <span className="hidden sm:flex items-center px-3 py-1 rounded-md border border-[var(--border-dim)] text-[10px] text-[var(--text-dim)] font-mono ml-3 select-none">
              ⌘K
            </span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={selectedRepo ? `Ask about ${selectedRepo.slice(0, 8)}...` : "Ask about your documentation..."}
              className="flex-1 px-3 sm:px-4 py-3 text-[13px] bg-transparent text-[var(--text-bright)] placeholder:text-[var(--text-dim)] focus:outline-none font-mono"
              disabled={loading}
              aria-label="Ask a question"
            />
            <button
              type={loading ? "button" : "submit"}
              onClick={loading ? stop : undefined}
              disabled={!loading && (!input.trim() || loading)}
              className={`m-1.5 px-4 py-1.5 rounded-lg text-xs font-bold font-mono uppercase tracking-wider transition-all duration-200 ${
                loading
                  ? "bg-[var(--accent-red)]/20 border border-[var(--accent-red)]/30 text-[var(--accent-red)] hover:bg-[var(--accent-red)]/30 cursor-pointer"
                  : !input.trim()
                    ? "bg-[var(--border-dim)] text-[var(--text-dim)] cursor-not-allowed"
                    : "bg-[var(--accent-amber)] text-[var(--bg-terminal)] hover:bg-[var(--accent-amber)]/80 active:scale-95 cursor-pointer"
              }`}
              aria-label={loading ? "Stop generating" : "Send message"}>{loading ? "Stop" : "Send"}</button>
          </div>
        </div>
      </form>
    </div>
  )
}
