import { useState, useEffect } from "react"
import { validateApiKey, getUserKeyInfo } from "../lib/api"

interface Props {
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
}

const PRESETS: { label: string; url: string; model: string; keyPlaceholder: string }[] = [
  { label: "OpenRouter", url: "https://openrouter.ai/api/v1", model: "meta-llama/llama-3-8b-instruct", keyPlaceholder: "sk-or-v1-..." },
  { label: "OpenAI", url: "https://api.openai.com/v1", model: "gpt-4o-mini", keyPlaceholder: "sk-..." },
  { label: "Groq", url: "https://api.groq.com/openai/v1", model: "llama3-8b-8192", keyPlaceholder: "gsk_..." },
  { label: "DeepSeek", url: "https://api.deepseek.com/v1", model: "deepseek-chat", keyPlaceholder: "sk-..." },
]

export default function SettingsModal({ isOpen, onClose, onSaved }: Props) {
  const [key, setKey] = useState("")
  const [model, setModel] = useState("")
  const [url, setUrl] = useState("")
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null)

  useEffect(() => {
    if (isOpen) {
      const info = getUserKeyInfo()
      setKey(info.key)
      setModel(info.model)
      setUrl(info.url)
      setTestResult(null)
    }
  }, [isOpen])

  if (!isOpen) return null

  function applyPreset(preset: typeof PRESETS[0]) {
    setUrl(preset.url)
    setModel(preset.model)
    setTestResult(null)
  }

  async function handleSave() {
    try {
      localStorage.setItem("docuchat_user_key", key.trim())
      localStorage.setItem("docuchat_user_model", model.trim())
      localStorage.setItem("docuchat_user_url", url.trim())
    } catch { /* unavailable */ }
    onSaved()
    onClose()
  }

  async function handleClear() {
    try {
      localStorage.removeItem("docuchat_user_key")
      localStorage.removeItem("docuchat_user_model")
      localStorage.removeItem("docuchat_user_url")
    } catch { /* unavailable */ }
    setKey("")
    setModel("")
    setUrl("")
    setTestResult(null)
    onSaved()
    onClose()
  }

  async function handleTest() {
    if (!key.trim()) {
      setTestResult({ ok: false, msg: "Enter an API key first" })
      return
    }
    setTesting(true)
    setTestResult(null)
    try {
      const result = await validateApiKey(key.trim(), url.trim() || undefined)
      setTestResult({ ok: result.valid, msg: result.valid ? "Key is valid" : (result.error || "Unknown error") })
    } catch {
      setTestResult({ ok: false, msg: "Network error" })
    } finally {
      setTesting(false)
    }
  }

  const hasKey = getUserKeyInfo().hasKey

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="glass neon-border-subtle rounded-xl p-6 w-full max-w-md mx-4"
        style={{ maxHeight: "80vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-bold text-[var(--text-bright)] uppercase tracking-wider">API Settings</h2>
          <button onClick={onClose} className="text-[var(--text-dim)] hover:text-[var(--accent-red)] transition-colors cursor-pointer text-lg" aria-label="Close settings">&times;</button>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => applyPreset(p)}
              className={`px-3 py-1.5 text-[10px] font-mono border rounded transition-colors cursor-pointer btn-press ${
                url === p.url ? "border-[var(--accent-neon)] text-[var(--accent-neon)] bg-[var(--accent-neon)]/5" : "border-[var(--border-dim)] text-[var(--text-dim)] hover:border-[var(--border-glow)]"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <label className="block text-[10px] text-[var(--text-dim)] uppercase tracking-wider font-bold mb-1.5">API Key</label>
        <input
          type="password"
          value={key}
          onChange={(e) => { setKey(e.target.value); setTestResult(null) }}
          placeholder="sk-or-v1-..."
          className="w-full px-3 py-2 text-[13px] bg-[var(--bg-input)] border border-[var(--border-glow)] rounded-lg text-[var(--text-bright)] placeholder:text-[var(--text-dim)] outline-none font-mono input-glow mb-3"
          aria-label="API Key"
        />

        <label className="block text-[10px] text-[var(--text-dim)] uppercase tracking-wider font-bold mb-1.5">Base URL</label>
        <input
          type="text"
          value={url}
          onChange={(e) => { setUrl(e.target.value); setTestResult(null) }}
          placeholder="https://openrouter.ai/api/v1"
          className="w-full px-3 py-2 text-[13px] bg-[var(--bg-input)] border border-[var(--border-glow)] rounded-lg text-[var(--text-bright)] placeholder:text-[var(--text-dim)] outline-none font-mono input-glow mb-3"
          aria-label="Base URL"
        />

        <label className="block text-[10px] text-[var(--text-dim)] uppercase tracking-wider font-bold mb-1.5">Model</label>
        <input
          type="text"
          value={model}
          onChange={(e) => { setModel(e.target.value); setTestResult(null) }}
          placeholder="meta-llama/llama-3-8b-instruct"
          className="w-full px-3 py-2 text-[13px] bg-[var(--bg-input)] border border-[var(--border-glow)] rounded-lg text-[var(--text-bright)] placeholder:text-[var(--text-dim)] outline-none font-mono input-glow mb-4"
          aria-label="Model"
        />

        {testResult && (
          <div className={`mb-4 px-3 py-2 rounded-lg text-[11px] font-mono border ${
            testResult.ok ? "bg-[var(--accent-neon)]/5 border-[var(--accent-neon)]/30 text-[var(--accent-neon)]" : "bg-[var(--accent-red)]/5 border-[var(--accent-red)]/30 text-[var(--accent-red)]"
          }`}>
            {testResult.ok ? "[ok] " : "[err] "}{testResult.msg}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleTest}
            disabled={testing || !key.trim()}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all duration-200 btn-press cursor-pointer ${
              testing || !key.trim() ? "bg-[var(--border-dim)] text-[var(--text-dim)] cursor-not-allowed" : "bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)] border border-[var(--accent-cyan)]/30 hover:bg-[var(--accent-cyan)]/30"
            }`}
          >
            {testing ? "testing..." : "test"}
          </button>
          <button
            onClick={handleSave}
            disabled={!key.trim()}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all duration-200 btn-press cursor-pointer ${
              !key.trim() ? "bg-[var(--border-dim)] text-[var(--text-dim)] cursor-not-allowed" : "bg-[var(--accent-neon)] text-[#050510] cursor-pointer btn-glow"
            }`}
          >
            save
          </button>
        </div>
        {hasKey && (
          <button onClick={handleClear} className="w-full mt-2 py-1.5 text-[10px] font-mono text-[var(--text-dim)] hover:text-[var(--accent-red)] transition-colors cursor-pointer text-center">
            remove saved key
          </button>
        )}
      </div>
    </div>
  )
}
