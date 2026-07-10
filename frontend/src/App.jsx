import { useEffect, useRef, useState } from 'react'
import MessageBubble from './components/MessageBubble.jsx'
import TypingIndicator from './components/TypingIndicator.jsx'
import InputBar from './components/InputBar.jsx'
import StatusBadge from './components/StatusBadge.jsx'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const WELCOME_MESSAGE = {
  role: 'assistant',
  content:
    'Oi! Sou um assistente especializado em Java. Pode perguntar sobre ' +
    'sintaxe, orientação a objetos, coleções, streams, exceptions, ' +
    'concorrência ou qualquer outra dúvida sobre a linguagem.',
}

export default function App() {
  const [messages, setMessages] = useState([WELCOME_MESSAGE])
  const [isWaiting, setIsWaiting] = useState(false)
  const [status, setStatus] = useState('checking')
  const scrollRef = useRef(null)

  useEffect(() => {
    checkHealth()
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages, isWaiting])

  async function checkHealth() {
    try {
      const res = await fetch(`${API_URL}/api/health`)
      const data = await res.json()
      setStatus(data.status === 'ok' ? 'ok' : 'offline')
    } catch {
      setStatus('offline')
    }
  }

  async function handleSend(text) {
    const userMessage = { role: 'user', content: text }
    const history = messages.filter((m) => m !== WELCOME_MESSAGE)

    setMessages((prev) => [...prev, userMessage])
    setIsWaiting(true)

    let assistantContent = ''
    let appended = false

    const appendOrUpdate = (content, isError = false) => {
      setMessages((prev) => {
        if (!appended) {
          appended = true
          return [...prev, { role: 'assistant', content, error: isError }]
        }
        const next = [...prev]
        next[next.length - 1] = { role: 'assistant', content, error: isError }
        return next
      })
      setIsWaiting(false)
    }

    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history }),
      })

      if (!res.body) throw new Error('Resposta sem corpo de stream')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.trim()) continue
          const data = JSON.parse(line)

          if (data.error) {
            appendOrUpdate(`⚠️ ${data.error}`, true)
          } else if (data.chunk) {
            assistantContent += data.chunk
            appendOrUpdate(assistantContent)
          }
        }
      }
    } catch (err) {
      appendOrUpdate(
        '⚠️ Não consegui me conectar ao backend. Verifique se ele está rodando.',
        true
      )
    } finally {
      setIsWaiting(false)
    }
  }

  return (
    <div className="app">
      <div className="terminal">
        <header className="terminal__titlebar">
          <div className="terminal__dots">
            <span className="dot dot--amber" />
            <span className="dot dot--sage" />
            <span className="dot dot--cream" />
          </div>
          <div className="terminal__title">java-assistant — local</div>
          <StatusBadge status={status} />
        </header>

        <main className="terminal__body" ref={scrollRef}>
          {messages.map((msg, index) => (
            <MessageBubble
              key={index}
              role={msg.role}
              content={msg.content}
              error={msg.error}
            />
          ))}
          {isWaiting && <TypingIndicator />}
        </main>

        <InputBar
          onSend={handleSend}
          disabled={isWaiting || status !== 'ok'}
          placeholder={
            status !== 'ok'
              ? 'Backend offline — inicie o servidor e o Ollama'
              : undefined
          }
        />
      </div>

      <footer className="app__footer">
        Rodando 100% local via Ollama · código-fonte no{' '}
        <a
          href="https://github.com/"
          target="_blank"
          rel="noreferrer"
        >
          GitHub
        </a>
      </footer>
    </div>
  )
}
