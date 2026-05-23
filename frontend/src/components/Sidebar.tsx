import { useEffect, useState, useCallback } from "react"
import { listRepos, deleteRepo, Repo } from "../lib/api"
import RepoUpload from "./RepoUpload"

export const STYLE = {
  aside: "w-80 h-screen flex flex-col border-r",
  border: "border-[var(--border-dim)]",
  bg: "bg-[var(--bg-panel)]",
  text: "text-[var(--text-primary)]",
  dim: "text-[var(--text-dim)]",
  bright: "text-[var(--text-bright)]",
  accent: "text-[var(--accent-amber)]",
  accentBg: "bg-[var(--accent-amber)]/10",
  accentBorder: "border-[var(--accent-amber)]/30",
  hoverBg: "hover:bg-[var(--bg-input)]",
  btnBg: "bg-[var(--accent-amber)] hover:bg-[#b08626] text-[var(--bg-terminal)] font-bold",
  btnDisabled: "bg-[var(--border-dim)] text-[var(--text-dim)]",
  input: "bg-[var(--bg-terminal)] border-[var(--border-glow)] focus:border-[var(--accent-amber)] text-[var(--text-bright)] placeholder:text-[var(--text-dim)]",
  active: "bg-[var(--accent-amber)]/10 text-[var(--accent-amber)] border-[var(--accent-amber)]/30",
  hoverActive: "hover:bg-[var(--bg-input)]",
  hr: "border-[var(--border-dim)]",
  selected: "text-[var(--accent-amber)] bg-[var(--accent-amber)]/10 border-[var(--accent-amber)]/30",
  red: "text-[var(--accent-red)] hover:text-[#ee6666]",
} as const

interface Props {
  selectedRepo: string | null
  onSelectRepo: (id: string | null) => void
}

function useRepos() {
  const [repos, setRepos] = useState<Repo[]>([])
  const [loading, setLoading] = useState(true)

  const fetchRepos = useCallback(async () => {
    try {
      setRepos(await listRepos())
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchRepos() }, [fetchRepos])

  return { repos, loading, refetch: fetchRepos, setRepos }
}

export default function Sidebar({ selectedRepo, onSelectRepo }: Props) {
  const { repos, loading, refetch } = useRepos()

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    try {
      await deleteRepo(id)
      if (selectedRepo === id) onSelectRepo(null)
      refetch()
    } catch { /* silent */ }
  }

  const cls = (base: string, ...classes: string[]) =>
    `${STYLE[base as keyof typeof STYLE] || base} ${classes.join(" ")}`

  return (
    <aside className={cls("aside", "border-[var(--border-dim)] bg-[var(--bg-panel)]")}>
      {/* Header */}
      <div className="px-5 py-5 border-b border-[var(--border-dim)]">
        <div className="flex items-center gap-3">
          <span className="text-xl select-none" aria-hidden>◈</span>
          <div>
            <h1 className="text-base font-bold text-[var(--text-bright)] tracking-wide">
              docu-chat
            </h1>
            <p className="text-[11px] text-[var(--text-dim)] mt-0.5 tracking-widest uppercase">
              rag terminal v1.0
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-[10px] text-[var(--text-dim)] font-mono">
          <span className="w-2 h-2 rounded-full bg-[var(--accent-green)] inline-block" />
          system operational
          <button
            onClick={() => document.documentElement.classList.toggle("light")}
            className="ml-auto px-2 py-0.5 border border-[var(--border-dim)] hover:border-[var(--accent-amber)] text-[var(--text-dim)] hover:text-[var(--accent-amber)] transition-colors text-[9px] uppercase tracking-wider"
            title="Toggle theme"
            aria-label="Toggle dark/light theme"
          >
            theme
          </button>
        </div>
      </div>

      {/* Repo Upload */}
      <RepoUpload onRepoAdded={refetch} />

      {/* Repo List */}
      <div className="flex-1 overflow-y-auto">
        {/* "All repos" button */}
        <div className="px-4 py-3">
          <button
            onClick={() => onSelectRepo(null)}
            className={`w-full text-left px-4 py-3 border text-xs transition-colors duration-150 font-mono ${
              selectedRepo === null
                ? cls("selected")
                : "text-[var(--text-dim)] border-[var(--border-dim)] hover:bg-[var(--bg-input)] hover:border-[var(--border-glow)]"
            }`}
          >
            <span className="text-[var(--accent-amber)] mr-2">[*]</span>
            ./all_repositories
            <span className="float-right text-[var(--text-dim)]">root</span>
          </button>
        </div>

        {/* Separator */}
        <div className="px-5 pb-2">
          <h3 className="text-[10px] text-[var(--text-dim)] uppercase tracking-[0.2em] font-bold">
            indexed repos ({repos.length})
          </h3>
        </div>

        {/* Repo Items */}
        <div className="px-4 pb-4 space-y-1">
          {loading ? (
            <p className="text-[11px] text-[var(--text-dim)] px-4 py-2 pulse-glow">
              scanning...
            </p>
          ) : repos.length === 0 ? (
            <p className="text-[11px] text-[var(--text-dim)] px-4 py-2 italic">
              &lt;empty&gt;
            </p>
          ) : (
            repos.map((repo) => (
              <button
                key={repo.id}
                onClick={() => onSelectRepo(repo.id)}
                className={`w-full text-left px-4 py-3 border text-xs transition-colors duration-150 group ${
                  selectedRepo === repo.id
                    ? cls("selected")
                    : "text-[var(--text-primary)] border-[var(--border-dim)] hover:bg-[var(--bg-input)] hover:border-[var(--border-glow)]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="truncate font-bold text-[var(--text-bright)]">
                    {repo.name}
                  </span>
                  <span
                    onClick={(e) => handleDelete(repo.id, e)}
                    className="ml-2 p-1 opacity-0 group-hover:opacity-100 text-[var(--text-dim)] hover:text-[var(--accent-red)] transition-all cursor-pointer select-none"
                    title="rm -rf"
                    role="button"
                    tabIndex={0}
                    aria-label={`Delete ${repo.name}`}
                  >
                    ×
                  </span>
                </div>
                <div className="flex gap-3 mt-1.5">
                  <span className="text-[var(--text-dim)]">
                    chunks: <span className="text-[var(--accent-green)]">{repo.indexed_documents}</span>
                  </span>
                  <span className="text-[var(--text-dim)]">
                    id: <span className="text-[var(--text-dim)]">{repo.id.slice(0, 8)}</span>
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-[var(--border-dim)] text-[10px] text-[var(--text-dim)] font-mono flex items-center justify-between">
        <span>langchain + chromadb</span>
        <span>groq/llama3</span>
      </div>
    </aside>
  )
}
