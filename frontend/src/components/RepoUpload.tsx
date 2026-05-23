import { useState, FormEvent, useEffect, useRef } from "react"
import { addRepo, getRepoStatus } from "../lib/api"

interface Props {
  onRepoAdded: () => void
}

export default function RepoUpload({ onRepoAdded }: Props) {
  const [url, setUrl] = useState("")
  const [branch, setBranch] = useState("main")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [indexingRepoId, setIndexingRepoId] = useState<string | null>(null)
  const [progress, setProgress] = useState("")
  const pollRef = useRef<ReturnType<typeof setInterval>>()

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!url.trim()) return
    setLoading(true)
    setError(null)
    try {
      const repo = await addRepo(url.trim(), branch.trim() || "main")
      setUrl("")
      if (repo.status === "indexing") {
        setIndexingRepoId(repo.id)
        setProgress("cloning + indexing...")
        pollRef.current = setInterval(async () => {
          try {
            const status = await getRepoStatus(repo.id)
            if (status.status === "ready") {
              clearInterval(pollRef.current)
              setIndexingRepoId(null)
              setProgress("")
              setLoading(false)
              onRepoAdded()
            } else if (status.status === "error") {
              clearInterval(pollRef.current)
              setIndexingRepoId(null)
              setProgress("")
              setLoading(false)
              setError(status.error || "indexing failed")
            } else {
              setProgress(`indexing... ${status.indexed ?? 0} chunks`)
            }
          } catch {
            // keep polling
          }
        }, 1500)
      } else {
        setLoading(false)
        onRepoAdded()
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "clone failed")
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="px-4 py-4 border-b border-[var(--border-dim)]">
      <label className="text-[10px] text-[var(--text-dim)] uppercase tracking-[0.2em] font-bold block mb-3">
        git clone
      </label>

      <div className="flex items-stretch gap-0">
        <span className="flex items-center px-2 text-[11px] text-[var(--text-dim)] bg-[var(--bg-terminal)] border border-r-0 border-[var(--border-glow)] font-mono select-none">
          $
        </span>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://github.com/user/repo.git"
          className="flex-1 px-3 py-2 text-[13px] bg-[var(--bg-terminal)] border border-[var(--border-glow)] text-[var(--text-bright)] placeholder:text-[var(--text-dim)] focus:outline-none focus:border-[var(--accent-amber)] transition-colors font-mono"
          disabled={loading || indexingRepoId !== null}
        />
      </div>

      <div className="flex gap-2 mt-2">
        <div className="flex items-stretch flex-1 gap-0">
          <span className="flex items-center px-2 text-[11px] text-[var(--text-dim)] bg-[var(--bg-terminal)] border border-r-0 border-[var(--border-glow)] font-mono select-none">
            @
          </span>
          <input
            type="text"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            placeholder="main"
            className="flex-1 px-3 py-2 text-[13px] bg-[var(--bg-terminal)] border border-[var(--border-glow)] text-[var(--text-bright)] placeholder:text-[var(--text-dim)] focus:outline-none focus:border-[var(--accent-amber)] transition-colors font-mono"
            disabled={loading || indexingRepoId !== null}
          />
        </div>
        <button
          type="submit"
          disabled={loading || !url.trim() || indexingRepoId !== null}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all duration-150 ${
            loading || !url.trim() || indexingRepoId !== null
              ? "bg-[var(--border-dim)] text-[var(--text-dim)] cursor-not-allowed border border-[var(--border-dim)]"
              : "bg-[var(--accent-amber)] text-[var(--bg-terminal)] border border-[var(--accent-amber)] hover:bg-[#b08626] active:scale-[0.98]"
          }`}
        >
          {loading || indexingRepoId !== null ? (
            <span className="pulse-glow">...</span>
          ) : (
            "index"
          )}
        </button>
      </div>

      {progress && (
        <p className="mt-2 text-[11px] text-[var(--accent-green)] font-mono animate-pulse">
          {progress}
        </p>
      )}
      {error && (
        <p className="mt-2 text-[11px] text-[var(--accent-red)] font-mono">
          [err] {error}
        </p>
      )}
    </form>
  )
}
