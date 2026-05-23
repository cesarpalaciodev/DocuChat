import { SourceDoc } from "../lib/api"

interface Props {
  sources: SourceDoc[]
  repoName?: string | null
}

export default function SourceCitation({ sources, repoName }: Props) {
  if (!sources || sources.length === 0) return null

  return (
    <div className="mt-4 pt-3 border-t border-[var(--border-dim)]">
      <p className="text-[10px] text-[var(--text-dim)] uppercase tracking-[0.15em] font-bold mb-3">
        &gt; sources{repoName ? ` /${repoName}` : ""}
      </p>
      <div className="space-y-2.5">
        {sources.map((src, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="text-[var(--accent-amber)] text-[11px] font-mono mt-0.5 select-none">
              {'>'}
            </span>
            <div className="min-w-0">
              <p className="text-[11px] text-[var(--accent-green)] font-mono truncate">
                {src.file_path}
              </p>
              <p className="text-[10px] text-[var(--text-dim)] mt-0.5 line-clamp-2 leading-relaxed">
                {src.content_snippet}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
