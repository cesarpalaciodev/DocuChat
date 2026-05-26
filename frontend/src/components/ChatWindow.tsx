import { useState, useRef, useEffect, FormEvent } from "react"
import ReactMarkdown from "react-markdown"
import type { Components } from "react-markdown"
import { useChat, Message } from "../hooks/useChat"
import SourceCitation from "./SourceCitation"

function safeUrl(href: string | undefined) {
  if (!href) return undefined
  if (href.startsWith("http://") || href.startsWith("https://") || href.startsWith("mailto:")) {
    return href
  }
  return undefined
}

const markdownComponents: Components = {
  a: ({ href, children, ...props }) => (
    <a href={safeUrl(href)} target="_blank" rel="noopener noreferrer" {...props}>
      {children}
    </a>
  ),
}

interface Props {
  selectedRepo: string | null
  loadHistory: string | null
}

export default function ChatWindow({ selectedRepo, loadHistory }: Props) {
  const { messages, loading, ask, clear, loadMessages } = useChat()
  const [input, setInput] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (loadHistory) {
      try {
        const msgs: Message[] = JSON.parse(loadHistory)
        loadMessages(msgs)
      } catch { /* ignore */ }
    }
  }, [loadHistory, loadMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!input.trim() || loading) return
    ask(input.trim(), selectedRepo)
    setInput("")
  }

  return (
    <div className="flex-1 flex flex-col h-screen">
      <header className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-dim)]">
        <div className="flex items-center gap-3">
          <span className="text-[var(--accent-amber)] text-lg select-none" aria-hidden>
            {"\u25B8"}
          </span>
          <div>
            <h2 className="text-xs font-bold text-[var(--text-bright)] tracking-wider uppercase">
              {selectedRepo ? `repository: ${selectedRepo.slice(0, 8)}` : "global query"}
            </h2>
            <p className="text-[10px] text-[var(--text-dim)] mt-0.5">
              {selectedRepo ? "single repo mode" : "searching all indexed repos"}
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clear}
            className="flex items-center gap-2 px-4 py-2 text-[11px] text-[var(--text-dim)] hover:text-[var(--accent-red)] border border-[var(--border-dim)] hover:border-[var(--accent-red)]/30 transition-colors font-mono uppercase tracking-wider"
            aria-label="Clear chat"
          >
            clear
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-lg">
              <pre className="text-[var(--accent-amber)] text-xs leading-relaxed mb-6 select-none font-mono">
{`  +==========================================+
  |                                          |
  |   docu-chat v1.0.0                       |
  |   retrieval augmented generation         |
  |   technical documentation assistant      |
  |                                          |
  +==========================================+`}
              </pre>
              <p className="text-xs text-[var(--text-dim)] leading-relaxed">
                <span className="text-[var(--accent-amber)]">$ git clone</span> un repositorio en el panel izquierdo
                y luego escribe tu pregunta abajo.
              </p>
              <p className="text-[10px] text-[var(--text-dim)] mt-4 font-mono">
                powered by FastAPI + TF-IDF + OpenRouter
              </p>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`msg-enter flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`flex-shrink-0 w-7 h-7 flex items-center justify-center text-xs font-bold font-mono ${
                    msg.role === "user" ? "text-[var(--accent-amber)]" : "text-[var(--accent-green)]"
                  }`}
                >
                  {msg.role === "user" ? "$" : ">"}
                </div>

                <div
                  className={`max-w-[80%] px-5 py-4 border ${
                    msg.role === "user"
                      ? "bg-[var(--accent-amber)]/5 border-[var(--accent-amber)]/20 rounded-l-lg rounded-tr-lg"
                      : "bg-[var(--bg-panel)] border-[var(--border-dim)] rounded-r-lg rounded-tl-lg"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div
                      className="prose prose-sm max-w-none
                        [&_*]:font-mono
                        [&_h1]:text-[var(--text-bright)] [&_h1]:text-base [&_h1]:font-bold [&_h1]:mt-4 [&_h1]:mb-2
                        [&_h2]:text-[var(--text-bright)] [&_h2]:text-sm [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-1
                        [&_h3]:text-[var(--text-primary)] [&_h3]:text-xs [&_h3]:font-bold [&_h3]:mt-3 [&_h3]:mb-1
                        [&_p]:text-[13px] [&_p]:text-[var(--text-primary)] [&_p]:leading-relaxed [&_p]:my-1.5
                        [&_code]:text-[var(--accent-green)] [&_code]:bg-[var(--bg-terminal)] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[11px]
                        [&_pre]:bg-[var(--bg-terminal)] [&_pre]:border [&_pre]:border-[var(--border-dim)] [&_pre]:p-4 [&_pre]:my-3 [&_pre]:overflow-x-auto
                        [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-[var(--text-primary)] [&_pre_code]:text-[11px]
                        [&_a]:text-[var(--accent-cyan)] [&_a]:border-b [&_a]:border-[var(--accent-cyan)]/30 [&_a]:no-underline
                        [&_ul]:text-[13px] [&_ul]:text-[var(--text-primary)] [&_ul]:pl-4 [&_ul]:my-1.5
                        [&_ol]:text-[13px] [&_ol]:text-[var(--text-primary)] [&_ol]:pl-4 [&_ol]:my-1.5
                        [&_li]:my-0.5
                        [&_strong]:text-[var(--text-bright)] [&_strong]:font-bold
                        [&_blockquote]:border-l-2 [&_blockquote]:border-[var(--accent-amber)]/40 [&_blockquote]:pl-4 [&_blockquote]:my-2 [&_blockquote]:text-[var(--text-dim)] [&_blockquote]:italic
                        [&_hr]:border-[var(--border-dim)] [&_hr]:my-4
                        [&_table]:w-full [&_table]:text-[12px] [&_table]:border-collapse [&_table]:my-2
                        [&_th]:border [&_th]:border-[var(--border-dim)] [&_th]:px-3 [&_th]:py-1.5 [&_th]:text-[var(--text-bright)] [&_th]:bg-[var(--bg-terminal)]
                        [&_td]:border [&_td]:border-[var(--border-dim)] [&_td]:px-3 [&_td]:py-1.5 [&_td]:text-[var(--text-primary)]"
                    >
                      <ReactMarkdown components={markdownComponents}>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-[13px] text-[var(--text-bright)] leading-relaxed font-mono whitespace-pre-wrap">
                      {msg.content}
                    </p>
                  )}

                  {msg.sources && msg.sources.length > 0 && (
                    <SourceCitation sources={msg.sources} repoName={msg.repoName} />
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="msg-enter flex gap-3">
                <div className="flex-shrink-0 w-7 h-7 flex items-center justify-center text-xs font-bold text-[var(--accent-green)] font-mono">
                  &gt;
                </div>
                <div className="bg-[var(--bg-panel)] border border-[var(--border-dim)] rounded-r-lg rounded-tl-lg px-5 py-4 flex items-center gap-1.5">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="border-t border-[var(--border-dim)] p-4">
        <div className="max-w-3xl mx-auto flex items-stretch gap-0">
          <span className="flex items-center px-3 text-sm text-[var(--accent-amber)] bg-[var(--bg-panel)] border border-r-0 border-[var(--border-glow)] font-mono select-none">
            $
          </span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="ask about the documentation..."
            className="flex-1 px-4 py-3 text-[13px] bg-[var(--bg-panel)] border-y border-[var(--border-glow)] text-[var(--text-bright)] placeholder:text-[var(--text-dim)] focus:outline-none font-mono"
            disabled={loading}
            aria-label="Ask a question"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className={`px-5 py-3 text-xs font-bold uppercase tracking-widest transition-all duration-150 ${
              !input.trim() || loading
                ? "bg-[var(--border-dim)] text-[var(--text-dim)] border border-[var(--border-dim)] cursor-not-allowed"
                : "bg-[var(--accent-amber)] text-[var(--bg-terminal)] border border-[var(--accent-amber)] hover:bg-[#b08626] active:scale-[0.98]"
            }`}
            aria-label="Send message"
          >
            send
          </button>
        </div>
        <p className="text-[10px] text-[var(--text-dim)] text-center mt-2.5 max-w-3xl mx-auto font-mono">
          docu-chat can make mistakes. verify important data.
        </p>
      </form>
    </div>
  )
}
