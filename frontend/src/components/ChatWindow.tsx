import { useState, useRef, useEffect, FormEvent, useMemo } from "react"
import ReactMarkdown from "react-markdown"
import type { Components } from "react-markdown"
import { useChat, Message } from "../hooks/useChat"
import SourceCitation from "./SourceCitation"
import ChatTabs from "./ChatTabs"
import SearchHistory from "./SearchHistory"
import { AuthUser } from "../lib/auth"

function safeUrl(href: string | undefined) {
  if (!href) return undefined
  if (href.startsWith("http://") || href.startsWith("https://") || href.startsWith("mailto:")) return href
  return undefined
}

const markdownComponents: Components = {
  a: ({ href, children, ...props }) => (
    <a href={safeUrl(href)} target="_blank" rel="noopener noreferrer" {...props}>{children}</a>
  ),
}

interface ChatTab {
  id: string
  title: string
}

interface Props {
  selectedRepo: string | null
  loadHistory: string | null
  sidebarCollapsed: boolean
  onToggleSidebar: () => void
  onSourceClick?: (filePath: string, content: string) => void
  historyItems?: string[]
  onAddHistory?: (q: string) => void
  tabs?: ChatTab[]
  activeTabId?: string | null
  onNewTab?: () => void
  onCloseTab?: (id: string) => void
  onSelectTab?: (id: string) => void
  onOpenSettings?: () => void
  onOpenHelp?: () => void
  onOpenAuth?: () => void
  currentUser?: AuthUser | null
}

interface MessageActionState {
  [msgIndex: number]: { copied: boolean }
}

function stripInitialLoadMsg(content: string): string {
  return content.replace(/^\s*\[LOAD\].*?\n\s*/, "")
}

export default function ChatWindow({
  selectedRepo,
  loadHistory,
  sidebarCollapsed,
  onToggleSidebar,
  onSourceClick,
  historyItems,
  onAddHistory,
  tabs: externalTabs,
  activeTabId: externalActiveTabId,
  onNewTab: externalOnNewTab,
  onCloseTab: externalOnCloseTab,
  onSelectTab: externalOnSelectTab,
  onOpenSettings,
  onOpenHelp,
  onOpenAuth,
  currentUser,
}: Props) {
  const { messages, loading, ask, clear, loadMessages } = useChat()
  const [input, setInput] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [msgActions, setMsgActions] = useState<MessageActionState>({})
  const formRef = useRef<HTMLFormElement>(null)

  const defaultTabs = useMemo<ChatTab[]>(() => [{ id: "default", title: selectedRepo ? selectedRepo.slice(0, 8) : "global" }], [selectedRepo])
  const tabs = externalTabs ?? defaultTabs
  const activeId = externalActiveTabId ?? "default"

  useEffect(() => {
    if (loadHistory) {
      try {
        const msgs: Message[] = JSON.parse(loadHistory)
        const cleaned = msgs.map((m) => ({
          ...m,
          content: m.role === "assistant" ? stripInitialLoadMsg(m.content) : m.content,
        }))
        loadMessages(cleaned)
      } catch { /* ignore */ }
    }
  }, [loadHistory, loadMessages])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages])

  useEffect(() => {
    const handler = () => clear()
    window.addEventListener("docuchat:clear", handler)
    return () => window.removeEventListener("docuchat:clear", handler)
  }, [clear])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!input.trim() || loading) return
    const question = input.trim()
    ask(question, selectedRepo)
    setInput("")
    onAddHistory?.(question)
    setHistoryOpen(false)
  }

  async function handleCopy(msg: Message, idx: number) {
    try {
      await navigator.clipboard.writeText(msg.content)
      setMsgActions((prev) => ({ ...prev, [idx]: { copied: true } }))
      setTimeout(() => {
        setMsgActions((prev) => ({ ...prev, [idx]: { copied: false } }))
      }, 1500)
    } catch { /* clipboard denied */ }
  }

  function handleRegenerate(msgIdx: number) {
    const prevUserMsg = [...messages].slice(0, msgIdx).reverse().find((m) => m.role === "user")
    if (prevUserMsg) {
      ask(prevUserMsg.content, selectedRepo)
    }
  }

  function handleSourceCitationClick(filePath: string, content: string) {
    onSourceClick?.(filePath, content)
  }

  const showTabs = tabs.length > 1 || messages.length > 0

  return (
    <div className="flex-1 flex flex-col h-screen">
      {showTabs && (
        <ChatTabs
          tabs={tabs}
          activeId={activeId}
          onNew={externalOnNewTab ?? (() => {})}
          onClose={externalOnCloseTab ?? (() => {})}
          onSelect={externalOnSelectTab ?? (() => {})}
        />
      )}

      <header className="flex items-center justify-between px-6 py-4 glass">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="text-[var(--accent-neon)] hover:text-white transition-all duration-200 cursor-pointer p-1.5 rounded border border-[var(--accent-neon)]/30 hover:border-[var(--accent-neon)] hover:bg-[var(--accent-neon)]/10"
            title={sidebarCollapsed ? "Show sidebar (Ctrl+B)" : "Hide sidebar (Ctrl+B)"}
            aria-label={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              {sidebarCollapsed ? (
                <path d="M9 3L4 8L9 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              ) : (
                <path d="M7 3L12 8L7 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              )}
            </svg>
          </button>
          <span className="text-[var(--accent-neon)] text-lg select-none cursor-blink" aria-hidden />
          <div>
            <h2 className="text-xs font-bold text-[var(--text-bright)] tracking-wider uppercase">
              {selectedRepo ? <span className="text-[var(--accent-cyan)]">repo:</span> : <span className="text-[var(--accent-neon)]">global:</span>}
              {" "}{selectedRepo ? selectedRepo.slice(0, 8) : "query"}
            </h2>
            <p className="text-[10px] text-[var(--text-dim)] mt-0.5">
              {selectedRepo ? "single-repo mode" : "searching all indexed repos"}
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <button onClick={clear} className="flex items-center gap-2 px-4 py-2 text-[11px] text-[var(--text-dim)] hover:text-[var(--accent-red)] border border-[var(--border-dim)] hover:border-[var(--accent-red)]/40 transition-colors duration-200 cursor-pointer font-mono uppercase tracking-wider btn-press glass" aria-label="Clear chat">
            clear
          </button>
        )}
        <div className="flex items-center gap-1.5">
          {onOpenAuth && (
            <button
              onClick={onOpenAuth}
              className="text-[var(--text-dim)] hover:text-[var(--accent-neon)] transition-colors duration-200 cursor-pointer p-1.5 rounded border border-[var(--border-dim)] hover:border-[var(--accent-neon)]/30"
              title={currentUser ? `Signed in as ${currentUser.username}` : "Sign in"}
              aria-label={currentUser ? `Signed in as ${currentUser.username}` : "Sign in"}
            >
              {currentUser ? (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "var(--accent-neon)", boxShadow: "0 0 4px var(--accent-neon-glow)" }} />
                  <span className="text-[10px] font-mono text-[var(--accent-neon)]">{currentUser.username.slice(0, 8)}</span>
                </span>
              ) : (
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M3 14C3 10.5 5.5 9 8 9C10.5 9 13 10.5 13 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              )}
            </button>
          )}
          <button
            onClick={onOpenHelp}
            className="text-[var(--text-dim)] hover:text-[var(--accent-cyan)] transition-colors duration-200 cursor-pointer p-1.5 rounded border border-[var(--border-dim)] hover:border-[var(--accent-cyan)]/30"
            title="Help & Shortcuts (?)"
            aria-label="Help and documentation"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M6 6.5C6 5.5 7 5 8 5C9 5 10 5.5 10 6.5C10 7.5 9 8 8.5 9V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="8" cy="12.5" r="0.75" fill="currentColor" />
            </svg>
          </button>
          <button
            onClick={onOpenSettings}
            className="text-[var(--text-dim)] hover:text-[var(--accent-neon)] transition-colors duration-200 cursor-pointer p-1.5 rounded border border-[var(--border-dim)] hover:border-[var(--accent-neon)]/30"
            title="API Settings (Ctrl+\)"
            aria-label="API Settings"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M8 1.5V3.5M8 12.5V14.5M3.5 3.5L5 5M11 11L12.5 12.5M1.5 8H3.5M12.5 8H14.5M3.5 12.5L5 11M11 5L12.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-xl">
              <pre className="text-[var(--accent-neon)] text-xs leading-relaxed mb-8 select-none font-mono opacity-80" style={{ textShadow: "0 0 10px rgba(34,211,160,0.3)" }}>
{`     +============================================+
      |                                            |
      |   DOCUCHAT  //  v1.0.0                     |
      |   neural terminal interface                |
      |   retrieval-augmented generation           |
      |                                            |
      |   [*] repos indexed                        |
      |   [*] tf-idf + numpy + openrouter          |
      |                                            |
      +============================================+`}
              </pre>
              <p className="text-[13px] text-[var(--text-bright)] leading-relaxed mb-3">
                <span className="text-[var(--accent-neon)] font-bold">$</span>{" "}
                <span className="text-[var(--text-dim)]">git clone a repository from the sidebar</span>
              </p>
              <p className="text-[13px] text-[var(--text-bright)] leading-relaxed mb-6">
                <span className="text-[var(--accent-neon)] font-bold">{">"}</span>{" "}
                <span className="text-[var(--text-dim)]">then type your question below</span>
              </p>
              <div className="flex items-center justify-center gap-6 text-[10px] text-[var(--text-dim)] font-mono">
                <span className="flex items-center gap-1"><span className="text-[var(--accent-neon)]">^</span> cmd+k palette</span>
                <span className="flex items-center gap-1"><span className="text-[var(--accent-neon)]">^</span> esc toggle</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-5">
            {messages.map((msg, i) => {
              const isLastAssistant = loading && msg.role === "assistant" && i === messages.length - 1
              const action = msgActions[i]
              return (
                <div key={i} className={`msg-wrapper msg-enter flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-mono glass ${msg.role === "user" ? "neon-border-subtle text-[var(--accent-amber)]" : "neon-border text-[var(--accent-neon)]"}`}>
                    {msg.role === "user" ? "$" : ">"}
                  </div>
                  <div className={`max-w-[78%] px-5 py-4 card-hover ${msg.role === "user" ? "glass rounded-l-xl rounded-tr-xl border-[var(--accent-amber)]/20" : "glass rounded-r-xl rounded-tl-xl"}`}>
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm max-w-none
                        [&_*]:font-mono [&_*]:transition-none
                        [&_h1]:text-[var(--text-bright)] [&_h1]:text-base [&_h1]:font-bold [&_h1]:mt-5 [&_h1]:mb-3
                        [&_h2]:text-[var(--text-bright)] [&_h2]:text-sm [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-2
                        [&_h3]:text-[var(--text-primary)] [&_h3]:text-xs [&_h3]:font-bold [&_h3]:mt-3 [&_h3]:mb-1
                        [&_p]:text-[13px] [&_p]:text-[var(--text-primary)] [&_p]:leading-relaxed [&_p]:my-2
                        [&_code]:text-[var(--accent-neon)] [&_code]:bg-[var(--bg-input)] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[11px] [&_code]:rounded
                        [&_pre]:bg-[var(--bg-input)] [&_pre]:border [&_pre]:border-[var(--border-glow)] [&_pre]:p-4 [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-lg
                        [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-[var(--text-primary)] [&_pre_code]:text-[11px]
                        [&_a]:text-[var(--accent-cyan)] [&_a]:border-b [&_a]:border-[var(--accent-cyan)]/30 [&_a]:no-underline [&_a]:hover:border-[var(--accent-cyan)]
                        [&_ul]:text-[13px] [&_ul]:text-[var(--text-primary)] [&_ul]:pl-5 [&_ul]:my-2
                        [&_ol]:text-[13px] [&_ol]:text-[var(--text-primary)] [&_ol]:pl-5 [&_ol]:my-2
                        [&_li]:my-1
                        [&_strong]:text-[var(--text-bright)] [&_strong]:font-bold
                        [&_blockquote]:border-l-2 [&_blockquote]:border-[var(--accent-neon)]/40 [&_blockquote]:pl-4 [&_blockquote]:my-3 [&_blockquote]:text-[var(--text-dim)] [&_blockquote]:italic
                        [&_hr]:border-[var(--border-dim)] [&_hr]:my-5
                        [&_table]:w-full [&_table]:text-[12px] [&_table]:border-collapse [&_table]:my-3
                        [&_th]:border [&_th]:border-[var(--border-dim)] [&_th]:px-3 [&_th]:py-2 [&_th]:text-[var(--text-bright)] [&_th]:bg-[var(--bg-input)]
                        [&_td]:border [&_td]:border-[var(--border-dim)] [&_td]:px-3 [&_td]:py-1.5 [&_td]:text-[var(--text-primary)]">
                        <ReactMarkdown components={markdownComponents}>{msg.content}</ReactMarkdown>
                        {isLastAssistant && <span className="typewriter-cursor" />}
                      </div>
                    ) : (
                      <p className="text-[13px] text-[var(--text-bright)] leading-relaxed font-mono whitespace-pre-wrap">{msg.content}</p>
                    )}
                    {msg.sources && msg.sources.length > 0 && (
                      <SourceCitation
                        sources={msg.sources}
                        repoName={msg.repoName}
                        onSourceClick={handleSourceCitationClick}
                      />
                    )}
                    {msg.role === "assistant" && !loading && msg.content && (
                      <div className="msg-actions flex items-center gap-2 mt-2 pt-2 border-t border-[var(--border-dim)]">
                        <button
                          onClick={() => handleCopy(msg, i)}
                          className="text-[10px] text-[var(--text-dim)] hover:text-[var(--accent-neon)] transition-colors cursor-pointer font-mono"
                          aria-label="Copy message"
                          title="Copy"
                        >
                          {action?.copied ? (
                            <span className="text-[var(--accent-neon)]">&#x2713; copied</span>
                          ) : (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                          )}
                        </button>
                        <button
                          onClick={() => handleRegenerate(i)}
                          className="text-[10px] text-[var(--text-dim)] hover:text-[var(--accent-neon)] transition-colors cursor-pointer font-mono"
                          aria-label="Regenerate response"
                          title="Regenerate"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="23 4 23 10 17 10" />
                            <polyline points="1 20 1 14 7 14" />
                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
            {loading && messages[messages.length - 1]?.role === "user" && (
              <div className="msg-enter flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-[var(--accent-neon)] glass neon-border">&gt;</div>
                <div className="glass rounded-r-xl rounded-tl-xl px-5 py-4 flex items-center gap-1.5">
                  <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="glass p-4 relative">
        <div className="max-w-3xl mx-auto flex items-stretch gap-0 relative">
          <span className="flex items-center px-3 text-sm text-[var(--accent-neon)] bg-[var(--bg-input)] border border-r-0 border-[var(--border-glow)] rounded-l-lg font-mono select-none" style={{ textShadow: "0 0 6px rgba(34,211,160,0.3)" }}>$</span>
          <input
            id="chat-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setHistoryOpen((historyItems ?? []).length > 0)}
            placeholder="ask about the documentation..."
            className="flex-1 px-4 py-3 text-[13px] bg-[var(--bg-input)] border-y border-[var(--border-glow)] text-[var(--text-bright)] placeholder:text-[var(--text-dim)] outline-none font-mono transition-shadow duration-200 input-glow"
            disabled={loading}
            aria-label="Ask a question"
          />
          <button type="submit" disabled={!input.trim() || loading} className={`px-5 py-3 text-xs font-bold uppercase tracking-widest transition-all duration-200 btn-press rounded-r-lg ${!input.trim() || loading ? "bg-[var(--border-dim)] text-[var(--text-dim)] border border-[var(--border-dim)] cursor-not-allowed" : "bg-[var(--accent-neon)] text-[#050510] cursor-pointer border border-[var(--accent-neon)] btn-glow"}`} aria-label="Send message">send</button>
        </div>
        <SearchHistory
          items={historyItems ?? []}
          onSelect={(item) => { setInput(item); setHistoryOpen(false) }}
          visible={historyOpen}
        />
        <p className="text-[10px] text-[var(--text-dim)] text-center mt-3 max-w-3xl mx-auto font-mono">docu-chat may produce inaccurate results. verify important information.</p>
      </form>
    </div>
  )
}
