import { useState, useEffect, useRef, FormEvent } from "react"
import { login, register, setStoredUser, AuthUser, getMe } from "../lib/auth"

interface Props {
  isOpen: boolean
  onClose: () => void
  onAuth: (user: AuthUser) => void
}

export default function AuthModal({ isOpen, onClose, onAuth }: Props) {
  const [mode, setMode] = useState<"login" | "register">("login")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [isOpen, onClose])

  useEffect(() => {
    if (isOpen) {
      setUsername("")
      setPassword("")
      setError(null)
      setMode("login")
      getMe().then((user) => {
        if (user) { setStoredUser(user); onAuth(user) }
      })
    }
  }, [isOpen, onAuth])

  if (!isOpen) return null

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!username.trim() || !password.trim() || submitting) return

    setError(null)
    setSubmitting(true)

    try {
      const user = mode === "login"
        ? await login(username.trim(), password)
        : await register(username.trim(), password)
      setStoredUser(user)
      onAuth(user)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit = username.trim() && password.trim() && !submitting

  return (
    <div
      ref={overlayRef}
      className="modal-backdrop"
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label={mode === "login" ? "Sign in" : "Create account"}
    >
      <div
        className="glass neon-border-subtle rounded-xl p-6 w-full max-w-sm mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-bold text-[var(--text-bright)] uppercase tracking-wider">
            <span className="text-[var(--accent-neon)] mr-1.5" style={{ textShadow: "0 0 8px var(--accent-neon-glow)" }}>&#9670;</span>
            {mode === "login" ? "Sign In" : "Register"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-[var(--text-dim)] hover:text-[var(--accent-red)] transition-colors cursor-pointer text-lg leading-none"
            aria-label="Close auth"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] text-[var(--text-dim)] uppercase tracking-wider font-bold mb-1.5" htmlFor="auth-username">
              Username
            </label>
            <input
              id="auth-username"
              type="text"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(null) }}
              placeholder="username"
              className="w-full px-3 py-2 text-[13px] bg-[var(--bg-input)] border border-[var(--border-glow)] rounded-lg text-[var(--text-bright)] placeholder:text-[var(--text-dim)] outline-none font-mono input-glow"
              autoComplete="username"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-[10px] text-[var(--text-dim)] uppercase tracking-wider font-bold mb-1.5" htmlFor="auth-password">
              Password
            </label>
            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null) }}
              placeholder="password"
              className="w-full px-3 py-2 text-[13px] bg-[var(--bg-input)] border border-[var(--border-glow)] rounded-lg text-[var(--text-bright)] placeholder:text-[var(--text-dim)] outline-none font-mono input-glow"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </div>

          {error && (
            <div className="px-3 py-2 rounded-lg text-[11px] font-mono bg-[var(--accent-red)]/5 border border-[var(--accent-red)]/30 text-[var(--accent-red)]">
              [err] {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className={`w-full py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all duration-200 btn-press cursor-pointer ${
              canSubmit
                ? "bg-[var(--accent-neon)] text-[#050510] btn-glow"
                : "bg-[var(--border-dim)] text-[var(--text-dim)] cursor-not-allowed"
            }`}
          >
            {submitting ? "..." : mode === "login" ? "sign in" : "create account"}
          </button>
        </form>

        <p className="mt-4 text-[10px] text-[var(--text-dim)] font-mono text-center">
          {mode === "login" ? (
            <>no account? <button onClick={() => { setMode("register"); setError(null) }} className="text-[var(--accent-neon)] hover:text-white transition-colors cursor-pointer">register</button></>
          ) : (
            <>already have an account? <button onClick={() => { setMode("login"); setError(null) }} className="text-[var(--accent-neon)] hover:text-white transition-colors cursor-pointer">sign in</button></>
          )}
        </p>
      </div>
    </div>
  )
}
