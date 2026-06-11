import { useEffect, useState, useCallback, useRef } from "react"
import { listRepos, deleteRepo, Repo, listConversations, deleteConversation, Conversation } from "../lib/api"
import RepoUpload from "./RepoUpload"

interface Props {
  selectedRepo: string | null
  onSelectRepo: (id: string | null) => void
  onLoadConversation: (id: string) => void
  width: number
  onResize: (w: number) => void
  minWidth: number
  maxWidth: number
  onDoubleClickRepo?: (repo: Repo) => void
}

function useRepos() {
  const [repos, setRepos] = useState<Repo[]>([])
  const [loading, setLoading] = useState(true)
  const fetchRepos = useCallback(async () => {
    try { setRepos(await listRepos()) } catch { /* silent */ }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { fetchRepos() }, [fetchRepos])
  return { repos, loading, refetch: fetchRepos }
}

export default function Sidebar({ selectedRepo, onSelectRepo, onLoadConversation, width, onResize, minWidth, maxWidth, onDoubleClickRepo }: Props) {
  const { repos, loading, refetch } = useRepos()
  const draggingH = useRef(false)
  const draggingV = useRef(false)
  const [convHeight, setConvHeight] = useState(160)
  const sidebarRef = useRef<HTMLElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (draggingH.current) {
        const w = Math.min(maxWidth, Math.max(minWidth, e.clientX))
        onResize(w)
      }
      if (draggingV.current && sidebarRef.current) {
        const rect = sidebarRef.current.getBoundingClientRect()
        const footerH = 32
        const maxConvH = rect.height - 280 - footerH
        const h = Math.min(maxConvH, Math.max(80, rect.bottom - e.clientY - footerH))
        setConvHeight(h)
      }
    }
    function onMouseUp() {
      draggingH.current = false
      draggingV.current = false
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }
    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)
    return () => { window.removeEventListener("mousemove", onMouseMove); window.removeEventListener("mouseup", onMouseUp) }
  }, [onResize, minWidth, maxWidth])

  function startResizeH(e: React.MouseEvent) {
    e.preventDefault()
    draggingH.current = true
    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"
  }

  function startResizeV(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    draggingV.current = true
    document.body.style.cursor = "row-resize"
    document.body.style.userSelect = "none"
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    try { await deleteRepo(id); if (selectedRepo === id) onSelectRepo(null); refetch() } catch { /* silent */ }
  }

  const [conversations, setConversations] = useState<Conversation[]>([])
  const fetchConvs = useCallback(async () => {
    try { setConversations(await listConversations()) } catch { /* silent */ }
  }, [])
  useEffect(() => { fetchConvs() }, [fetchConvs])

  async function handleDeleteConv(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    try { await deleteConversation(id); fetchConvs() } catch { /* silent */ }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.dataTransfer.dropEffect = "copy"
    setIsDragOver(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    if (e.currentTarget === e.target || !(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
      setIsDragOver(false)
    }
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(false)
    const url = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain")
    if (url && (url.startsWith("https://github.com/") || url.includes("github.com/"))) {
      const input = document.querySelector<HTMLInputElement>('#repo-url')
      if (input) {
        input.value = url
        input.dispatchEvent(new Event("input", { bubbles: true }))
        setTimeout(() => {
          const form = document.querySelector<HTMLFormElement>('#repo-form')
          if (form) form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))
        }, 100)
      }
    }
  }

  return (
    <aside
      ref={sidebarRef}
      className="h-screen flex flex-col glass border-r-0 shrink-0 relative"
      style={{ width }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragOver && (
        <div className="drag-overlay">
          <span className="drag-overlay-text">drop to clone</span>
        </div>
      )}

      <div className="px-5 py-5">
        <div className="flex items-center gap-3">
          <span className="text-2xl select-none" aria-hidden style={{ color: "var(--accent-neon)", textShadow: "0 0 16px rgba(34,211,160,0.4)" }}>&#9670;</span>
          <div className="min-w-0">
            <h1 className="glitch-text text-lg font-bold text-[var(--text-bright)] tracking-wide truncate" data-text="docu-chat">docu-chat</h1>
            <p className="text-[10px] text-[var(--text-dim)] mt-0.5 tracking-widest uppercase">neural terminal v1.0</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-[10px] text-[var(--text-dim)] font-mono">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: "var(--accent-neon)", boxShadow: "0 0 6px var(--accent-neon-glow)" }} />
          <span className="text-[var(--accent-neon)]">online</span>
        </div>
      </div>

      <RepoUpload onRepoAdded={refetch} />

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-3">
          <button onClick={() => onSelectRepo(null)} className={`w-full text-left px-4 py-3 border text-xs transition-colors duration-200 cursor-pointer font-mono btn-press neon-border-subtle card-hover ${selectedRepo === null ? "!border-[var(--accent-neon)]" : "text-[var(--text-dim)] glass"}`}>
            <span className="text-[var(--accent-neon)] mr-2">[*]</span>./all_repositories
            <span className="float-right text-[var(--text-dim)]">root</span>
          </button>
        </div>

        <div className="px-5 pb-2">
          <h3 className="text-[10px] text-[var(--text-dim)] uppercase tracking-[0.2em] font-bold">indexed repos ({repos.length})</h3>
        </div>

        <div className="px-4 pb-4 space-y-1">
          {loading ? (
            <p className="text-[11px] text-[var(--text-dim)] px-4 py-2">scanning...</p>
          ) : repos.length === 0 ? (
            <p className="text-[11px] text-[var(--text-dim)] px-4 py-2 italic">&lt;empty&gt;</p>
          ) : (
            repos.map((repo) => (
              <button
                key={repo.id}
                onClick={() => onSelectRepo(repo.id)}
                onDoubleClick={() => onDoubleClickRepo?.(repo)}
                className={`w-full text-left px-4 py-3 border text-xs transition-colors duration-200 cursor-pointer group btn-press card-hover ${selectedRepo === repo.id ? "!border-[var(--accent-neon)] glass" : "text-[var(--text-primary)] border-[var(--border-dim)] glass"}`}
              >
                <div className="flex items-center justify-between">
                  <span className="truncate font-bold text-[var(--text-bright)]">{repo.name}</span>
                  <span onClick={(e) => handleDelete(repo.id, e)} className="ml-2 p-1 opacity-0 group-hover:opacity-100 text-[var(--text-dim)] hover:text-[var(--accent-red)] transition-all cursor-pointer select-none text-[10px]" title="rm -rf" role="button" tabIndex={0} aria-label={`Delete ${repo.name}`}>&#x2715;</span>
                </div>
                <div className="flex gap-3 mt-1.5">
                  <span className="text-[var(--text-dim)]">chunks: <span className="text-[var(--accent-neon)]">{repo.indexed_documents}</span></span>
                  <span className="text-[var(--text-dim)]">id: <span className="text-[var(--text-dim)]">{repo.id.slice(0, 8)}</span></span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div
        className="shrink-0 cursor-row-resize group/resizeV flex items-center justify-center py-1 border-t border-[var(--border-dim)]"
        onMouseDown={startResizeV}
      >
        <div className="w-8 h-1 rounded-full transition-opacity opacity-25 group-hover/resizeV:opacity-100" style={{ background: "var(--accent-neon)" }} />
      </div>

      <div className="shrink-0 border-t border-[var(--border-dim)] px-4 pt-2 pb-3" style={{ height: convHeight }}>
        <h3 className="text-[10px] text-[var(--text-dim)] uppercase tracking-[0.2em] font-bold mb-2">conversations ({conversations.length})</h3>
        {conversations.length === 0 ? (
          <p className="text-[11px] text-[var(--text-dim)] italic">&lt;no history&gt;</p>
        ) : (
          <div className="space-y-1 overflow-y-auto" style={{ height: convHeight - 40 }}>
            {conversations.slice(0, 50).map((conv) => (
              <div key={conv.id} className="flex items-center justify-between px-3 py-1.5 border border-[var(--border-dim)] glass card-hover transition-colors duration-200 cursor-pointer group btn-press" onClick={() => onLoadConversation(conv.id)} role="button" tabIndex={0} aria-label={`Load conversation ${conv.id}`}>
                <span className="text-[11px] text-[var(--text-primary)] font-mono truncate">{conv.id.slice(0, 10)}...</span>
                <span onClick={(e) => handleDeleteConv(conv.id, e)} className="ml-1 p-0.5 opacity-0 group-hover:opacity-100 text-[var(--text-dim)] hover:text-[var(--accent-red)] transition-all cursor-pointer text-[10px]" title="Delete conversation" role="button" tabIndex={0} aria-label={`Delete conversation ${conv.id}`}>&#x2715;</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="px-5 py-2 border-t border-[var(--border-dim)] text-[10px] text-[var(--text-dim)] font-mono flex items-center justify-between shrink-0 glass">
        <span className="text-[var(--accent-neon)]">tf-idf + numpy</span>
        <span className="text-[var(--accent-cyan)]">openrouter</span>
      </div>

      <div
        className="absolute top-0 right-0 w-3 h-full cursor-col-resize z-20"
        style={{ marginRight: -4, background: "linear-gradient(90deg, transparent 40%, var(--accent-neon) 40%, var(--accent-neon) 60%, transparent 60%)", opacity: 0.15 }}
        onMouseDown={startResizeH}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.6" }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.15" }}
      />
    </aside>
  )
}
