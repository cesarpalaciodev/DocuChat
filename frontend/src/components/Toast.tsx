import { useEffect, useState } from "react"

export interface ToastAction {
  label: string
  onClick: () => void
}

interface Toast {
  id: number
  message: string
  type: "info" | "error" | "success"
  action?: ToastAction
}

let toastId = 0
const listeners: Set<(toasts: Toast[]) => void> = new Set()
let currentToasts: Toast[] = []

function notify(message: string, type: "info" | "error" | "success" = "info", action?: ToastAction) {
  const toast: Toast = { id: ++toastId, message, type, action }
  currentToasts = [...currentToasts, toast]
  listeners.forEach((fn) => fn(currentToasts))
  setTimeout(() => {
    currentToasts = currentToasts.filter((t) => t.id !== toast.id)
    listeners.forEach((fn) => fn(currentToasts))
  }, 4000)
}

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>(currentToasts)
  useEffect(() => { listeners.add(setToasts); return () => { listeners.delete(setToasts) } }, [])
  return { toasts, notify }
}

export default function ToastContainer() {
  const { toasts } = useToasts()
  if (toasts.length === 0) return null

  const colors: Record<string, { bg: string; border: string; text: string; icon: string }> = {
    error: { bg: "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.3)", text: "#f87171", icon: "[err]" },
    success: { bg: "rgba(34,211,160,0.08)", border: "rgba(34,211,160,0.3)", text: "#22d3a0", icon: "[ok]" },
    info: { bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.3)", text: "#f59e0b", icon: "[*]" },
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2" role="status" aria-live="polite">
      {toasts.map((t) => {
        const c = colors[t.type]
        return (
          <div key={t.id} className="toast-enter px-4 py-2 text-xs font-mono glass neon-border-subtle flex items-center gap-3" style={{ background: c.bg, borderColor: c.border }}>
            <span className="flex items-center gap-1.5 flex-1 min-w-0">
              <span style={{ color: c.text }}>{c.icon}</span>
              <span style={{ color: "var(--text-primary)" }} className="truncate">{t.message}</span>
            </span>
            {t.action && (
              <button
                onClick={t.action.onClick}
                className="shrink-0 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--accent-neon)] glass border border-[var(--border-glow)] hover:border-[var(--accent-neon)] transition-all cursor-pointer rounded btn-press"
              >
                {t.action.label}
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

export { notify }
