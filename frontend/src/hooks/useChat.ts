import { useState, useCallback, useRef } from "react"
import { sendMessageStream, SourceDoc } from "../lib/api"
import { notify } from "../components/Toast"

export interface Message {
  role: "user" | "assistant"
  content: string
  sources?: SourceDoc[]
  repoName?: string | null
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const convIdRef = useRef<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const lastQuestionRef = useRef<string>("")

  const ask = useCallback(async (question: string, repoId: string | null) => {
    if (abortRef.current) { abortRef.current.abort() }
    const controller = new AbortController()
    abortRef.current = controller

    lastQuestionRef.current = question

    setMessages((prev) => [...prev, { role: "user", content: question }])
    setLoading(true)
    setError(null)

    const msgIndex = messages.length + 1
    setMessages((prev) => [...prev, { role: "assistant", content: "" }])

    try {
      await sendMessageStream(question, repoId, convIdRef.current, controller.signal, {
        onToken(token: string) {
          setMessages((prev) => {
            const updated = [...prev]
            const msg = updated[msgIndex]
            if (msg) {
              updated[msgIndex] = { ...msg, content: msg.content + token }
            }
            return updated
          })
        },
        onDone(result) {
          convIdRef.current = result.conv_id
          setMessages((prev) => {
            const updated = [...prev]
            const msg = updated[msgIndex]
            if (msg) {
              updated[msgIndex] = {
                ...msg,
                sources: result.sources,
                repoName: result.repo_name ?? null,
              }
            }
            return updated
          })
          setLoading(false)
          abortRef.current = null
        },
        onError(errMsg: string) {
          setMessages((prev) => {
            const updated = [...prev]
            updated[msgIndex] = { role: "assistant", content: `[err] ${errMsg}` }
            return updated
          })
          setError(errMsg)
          notify(errMsg, "error")
          setLoading(false)
          abortRef.current = null
        },
      })
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === "AbortError") {
        return
      }
      const msg = e instanceof Error ? e.message : "Unknown error"
      setError(msg)
      notify(msg, "error")
      setMessages((prev) => {
        const updated = [...prev]
        updated[msgIndex] = { role: "assistant", content: `[err] ${msg}` }
        return updated
      })
      setLoading(false)
      abortRef.current = null
    }
  }, [messages.length])

  const clear = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
    setMessages([])
    setError(null)
    convIdRef.current = null
  }, [])

  const loadMessages = useCallback((msgs: Message[], convId: string | null) => {
    if (abortRef.current) abortRef.current.abort()
    setMessages(msgs)
    setError(null)
    convIdRef.current = convId
  }, [])

  const stop = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
    setLoading(false)
  }, [])

  const regenerate = useCallback((repoId: string | null) => {
    if (!lastQuestionRef.current) return
    convIdRef.current = null
    setMessages((prev) => prev.slice(0, -1))
    ask(lastQuestionRef.current, repoId)
  }, [ask])

  return { messages, loading, error, ask, clear, loadMessages, stop, regenerate }
}
