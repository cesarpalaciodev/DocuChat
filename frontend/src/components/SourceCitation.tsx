import { useState } from "react"
import { SourceDoc } from "../lib/api"

interface Props {
  sources: SourceDoc[]
  repoName?: string | null
  onSourceClick?: (filePath: string, content: string) => void
}

export default function SourceCitation({ sources, repoName, onSourceClick }: Props) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  if (!sources || sources.length === 0) return null

  return (
    <div className="mt-4 pt-3 border-t border-[var(--border-dim)]">
      <p className="text-[10px] uppercase tracking-[0.15em] font-bold mb-3" style={{ color: "var(--accent-neon)" }}>
        &gt; sources{repoName ? ` /${repoName}` : ""}
      </p>
      <div className="space-y-2">
        {sources.map((src, i) => {
          const isExpanded = expandedIndex === i
          return (
            <div key={i}>
              <div
                className="flex items-start gap-2 cursor-pointer"
                onClick={() => setExpandedIndex(isExpanded ? null : i)}
              >
                <span
                  className="text-[var(--accent-neon)] text-[11px] font-mono mt-0.5 select-none transition-transform duration-200"
                  style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}
                >
                  &gt;
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className="text-[11px] text-[var(--accent-cyan)] font-mono truncate hover:underline cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation()
                      onSourceClick?.(src.file_path, src.content_snippet.slice(0, 2000))
                    }}
                  >
                    {src.file_path}
                  </p>
                  {!isExpanded && (
                    <p className="text-[10px] text-[var(--text-dim)] mt-0.5 line-clamp-2 leading-relaxed">
                      {src.content_snippet}
                    </p>
                  )}
                </div>
              </div>
              <div className={`source-expand ${isExpanded ? "open" : ""}`}>
                <div className="min-h-0">
                  <p className="text-[10px] text-[var(--text-primary)] mt-1 mb-2 ml-5 leading-relaxed whitespace-pre-wrap">
                    {src.content_snippet}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
