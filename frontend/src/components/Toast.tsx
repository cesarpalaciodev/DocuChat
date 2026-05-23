import { useEffect, useState } from "react"

interface Toast {
  id: number
  message: string
  type: "info" | "error" | "success"
}

let toastId = 0
const listeners: Set<(toasts: Toast[]) => void> = new Set()
let currentToasts: Toast[] = []

function notify(message: string, type: "info" | "error" | "success" = "info") {
  const toast: Toast = { id: ++toastId, message, type }
  currentToasts = [...currentToasts, toast]
  listeners.forEach((fn) => fn(currentToasts))
  setTimeout(() => {
    currentToasts = currentToasts.filter((t) => t.id !== toast.id)
    listeners.forEach((fn) => fn(currentToasts))
  }, 4000)
}

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>(currentToasts)

  useEffect(() => {
    listeners.add(setToasts)
    return () => { listeners.delete(setToasts) }
  }, [])

  return { toasts, notify }
}

export default function ToastContainer() {
  const { toasts } = useToasts()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-2 text-xs font-mono border transition-all animate-[msg-slide_0.2s_ease-out] ${
            t.type === "error"
              ? "bg-[#cc5555]/10 border-[#cc5555]/30 text-[#cc5555]"
              : t.type === "success"
                ? "bg-[#6a9955]/10 border-[#6a9955]/30 text-[#6a9955]"
                : "bg-[#c8962e]/10 border-[#c8962e]/30 text-[#c8962e]"
          }`}
        >
          {t.type === "error" ? "[err] " : t.type === "success" ? "[ok] " : "[*] "}
          {t.message}
        </div>
      ))}
    </div>
  )
}

export { notify }
