import { getAuthHeaders } from "./auth"

const BASE = "/api"

export function getUserHeaders(): Record<string, string> {
  const headers: Record<string, string> = {}
  try {
    const key = localStorage.getItem("docuchat_user_key")
    const model = localStorage.getItem("docuchat_user_model")
    const url = localStorage.getItem("docuchat_user_url")
    if (key) headers["X-User-API-Key"] = key
    if (model) headers["X-User-Model"] = model
    if (url) headers["X-User-Base-URL"] = url
  } catch { /* localStorage unavailable */ }
  return headers
}

export function getUserKeyInfo(): { key: string; model: string; url: string; hasKey: boolean } {
  try {
    return {
      key: localStorage.getItem("docuchat_user_key") || "",
      model: localStorage.getItem("docuchat_user_model") || "",
      url: localStorage.getItem("docuchat_user_url") || "",
      hasKey: !!(localStorage.getItem("docuchat_user_key")),
    }
  } catch {
    return { key: "", model: "", url: "", hasKey: false }
  }
}

export async function validateApiKey(apiKey: string, baseUrl?: string): Promise<{ valid: boolean; error: string | null }> {
  const res = await fetch(`${BASE}/validate-key`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getUserHeaders(), ...getAuthHeaders() },
    body: JSON.stringify({ api_key: apiKey, base_url: baseUrl || undefined }),
  })
  if (!res.ok) return { valid: false, error: "Validation endpoint error" }
  return res.json()
}

export interface SourceDoc {
  file_path: string
  content_snippet: string
}

export interface ChatResponse {
  answer: string
  sources: SourceDoc[]
  repo_name: string | null
  conversation_id: string | null
}

export interface Repo {
  id: string
  url: string
  name: string
  indexed_documents: number
  status: string
}

export interface RepoStatus {
  status: string
  indexed?: number
  error?: string
}

export async function sendMessage(question: string, repoId: string | null, conversationId: string | null = null): Promise<ChatResponse> {
  const res = await fetch(`${BASE}/chat/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getUserHeaders(), ...getAuthHeaders() },
    body: JSON.stringify({ question, repo_id: repoId, conversation_id: conversationId }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }))
    throw new Error(err.detail || "Request failed")
  }
  return res.json()
}

export async function listRepos(): Promise<Repo[]> {
  const res = await fetch(`${BASE}/repos/`, {
    headers: { ...getUserHeaders(), ...getAuthHeaders() },
  })
  if (!res.ok) throw new Error("Failed to fetch repos")
  return res.json()
}

export async function addRepo(url: string, branch: string): Promise<Repo> {
  const res = await fetch(`${BASE}/repos/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getUserHeaders(), ...getAuthHeaders() },
    body: JSON.stringify({ url, branch }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }))
    throw new Error(err.detail || "Failed to add repo")
  }
  return res.json()
}

export async function getRepoStatus(repoId: string): Promise<RepoStatus> {
  const res = await fetch(`${BASE}/repos/${repoId}/status`, {
    headers: { ...getUserHeaders(), ...getAuthHeaders() },
  })
  if (!res.ok) throw new Error("Failed to get status")
  return res.json()
}

export async function deleteRepo(repoId: string): Promise<void> {
  const res = await fetch(`${BASE}/repos/${repoId}`, {
    method: "DELETE",
    headers: { ...getUserHeaders(), ...getAuthHeaders() },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }))
    throw new Error(err.detail || "Failed to delete repo")
  }
}

export interface Conversation {
  id: string
  repo_id: string | null
  created_at: string
}

export interface ConversationMessage {
  id: number
  conversation_id: string
  role: "user" | "assistant"
  content: string
  sources: string | null
  created_at: string
}

export interface ConversationListResponse {
  items: Conversation[]
  total: number
  offset: number
  limit: number
}

export async function listConversations(repoId: string | null = null): Promise<Conversation[]> {
  const params = repoId ? `?repo_id=${repoId}` : ""
  const res = await fetch(`${BASE}/chat/conversations${params}`, {
    headers: { ...getUserHeaders(), ...getAuthHeaders() },
  })
  if (!res.ok) throw new Error("Failed to fetch conversations")
  const data: ConversationListResponse = await res.json()
  return data.items
}

export async function getConversation(id: string): Promise<{ id: string; messages: ConversationMessage[] }> {
  const res = await fetch(`${BASE}/chat/conversations/${id}`, {
    headers: { ...getUserHeaders(), ...getAuthHeaders() },
  })
  if (!res.ok) throw new Error("Conversation not found")
  return res.json()
}

export async function deleteConversation(id: string): Promise<void> {
  const res = await fetch(`${BASE}/chat/conversations/${id}`, {
    method: "DELETE",
    headers: { ...getUserHeaders(), ...getAuthHeaders() },
  })
  if (!res.ok) throw new Error("Failed to delete conversation")
}

export interface StreamCallbacks {
  onToken: (token: string) => void
  onDone: (result: { conv_id: string; repo_name?: string; sources?: SourceDoc[] }) => void
  onError: (error: string) => void
}

export async function sendMessageStream(
  question: string,
  repoId: string | null,
  conversationId: string | null,
  signal: AbortSignal | null,
  callbacks: StreamCallbacks,
): Promise<void> {
  const res = await fetch(`${BASE}/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getUserHeaders(), ...getAuthHeaders() },
    body: JSON.stringify({ question, repo_id: repoId, conversation_id: conversationId }),
    signal,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }))
    throw new Error(err.detail || "Request failed")
  }

  const reader = res.body?.getReader()
  if (!reader) throw new Error("No response body")

  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() || ""

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          const data = JSON.parse(line.slice(6))
          if (data.error) {
            callbacks.onError(data.error)
            return
          }
          if (data.done) {
            callbacks.onDone({
              conv_id: data.conv_id,
              repo_name: data.repo_name,
              sources: data.sources,
            })
            return
          }
          if (data.token) {
            callbacks.onToken(data.token)
          }
        } catch {
          // skip malformed lines
        }
      }
    }
  }
}
