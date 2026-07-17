import { useEffect, useReducer, useRef, useState } from 'react'
import MessageBubble from './components/MessageBubble.jsx'
import TypingIndicator from './components/TypingIndicator.jsx'
import InputBar from './components/InputBar.jsx'
import StatusBadge from './components/StatusBadge.jsx'

const DEFAULT_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const GITHUB_URL = 'https://github.com/Fernando-1909'
const SIZE_STORAGE_KEY = 'java-assistant:size'
const API_URL_STORAGE_KEY = 'java-assistant:apiUrl'

// Tamanhos disponíveis para a janela de chat. A escolha fica salva no
// navegador (localStorage) e persiste entre sessões.
const SIZES = ['compact', 'comfortable', 'expanded']
const SIZE_LABELS = {
  compact: 'Compacto',
  comfortable: 'Confortável',
  expanded: 'Expandido',
}

let idCounter = 0
// Gera um ID único e estável por mensagem. Usar IDs (em vez da posição no
// array) evita qualquer ambiguidade ao atualizar a mensagem certa durante
// o streaming da resposta — se uma linha do stream vier corrompida, só ela
// é ignorada, sem afetar as demais mensagens já exibidas.
function makeId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  idCounter += 1
  return `msg-${idCounter}-${Date.now()}`
}

const WELCOME_MESSAGE = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Oi! Sou um assistente especializado em Java. Pode perguntar sobre ' +
    'sintaxe, orientação a objetos, coleções, streams, exceptions, ' +
    'concorrência ou qualquer outra dúvida sobre a linguagem.',
}

function messagesReducer(state, action) {
  switch (action.type) {
    case 'ADD_MESSAGE':
      return [...state, action.message]
    case 'UPDATE_MESSAGE':
      return state.map((msg) =>
        msg.id === action.id
          ? { ...msg, content: action.content, error: action.error ?? false }
          : msg
      )
    default:
      return state
  }
}

function getInitialSize() {
  if (typeof window === 'undefined') return 'comfortable'
  const saved = window.localStorage.getItem(SIZE_STORAGE_KEY)
  return SIZES.includes(saved) ? saved : 'comfortable'
}

function getInitialApiUrl() {
  if (typeof window === 'undefined') return DEFAULT_API_URL
  return window.localStorage.getItem(API_URL_STORAGE_KEY) || DEFAULT_API_URL
}

export default function App() {
  const [messages, dispatch] = useReducer(messagesReducer, [WELCOME_MESSAGE])
  const [isWaiting, setIsWaiting] = useState(false)
  const [status, setStatus] = useState('checking')
  const [size, setSize] = useState(getInitialSize)
  const [apiUrl, setApiUrl] = useState(getInitialApiUrl)
  const [apiUrlDraft, setApiUrlDraft] = useState(apiUrl)
  const [showApiSettings, setShowApiSettings] = useState(false)
  const scrollRef = useRef(null)

  function cycleSize() {
    setSize((current) => {
      const next = SIZES[(SIZES.indexOf(current) + 1) % SIZES.length]
      window.localStorage.setItem(SIZE_STORAGE_KEY, next)
      return next
    })
  }

  function saveApiUrl(event) {
    event.preventDefault()
    const trimmed = apiUrlDraft.trim().replace(/\/+$/, '')
    if (!trimmed) return
    window.localStorage.setItem(API_URL_STORAGE_KEY, trimmed)
    setApiUrl(trimmed)
    setShowApiSettings(false)
  }

  useEffect(() => {
    checkHealth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiUrl])

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages, isWaiting])

  async function checkHealth() {
    setStatus('checking')
    try {
      const res = await fetch(`${apiUrl}/api/health`)
      const data = await res.json()
      setStatus(data.status === 'ok' ? 'ok' : 'offline')
    } catch {
      setStatus('offline')
    }
  }

  async function handleSend(text) {
    const history = messages
      .filter((m) => m.id !== 'welcome')
      .map(({ role, content }) => ({ role, content }))

    dispatch({
      type: 'ADD_MESSAGE',
      message: { id: makeId(), role: 'user', content: text },
    })
    setIsWaiting(true)

    const assistantId = makeId()
    let assistantContent = ''
    let started = false

    const pushOrUpdate = (content, isError = false) => {
      if (!started) {
        started = true
        dispatch({
          type: 'ADD_MESSAGE',
          message: { id: assistantId, role: 'assistant', content, error: isError },
        })
      } else {
        dispatch({ type: 'UPDATE_MESSAGE', id: assistantId, content, error: isError })
      }
      setIsWaiting(false)
    }

    try {
      const res = await fetch(`${apiUrl}/api/chat`, {
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
          let data
          try {
            data = JSON.parse(line)
          } catch {
            continue // linha incompleta/corrompida: ignora só ela, não derruba o stream
          }

          if (data.error) {
            pushOrUpdate(`⚠️ ${data.error}`, true)
          } else if (data.chunk) {
            assistantContent += data.chunk
            pushOrUpdate(assistantContent)
          }
        }
      }
    } catch (err) {
      pushOrUpdate(
        '⚠️ Não consegui me conectar ao backend. Verifique se ele está rodando e se a URL configurada está correta.',
        true
      )
    } finally {
      setIsWaiting(false)
    }
  }

  return (
    <div className="app">
      <div className={`terminal terminal--${size}`}>
        <header className="terminal__titlebar">
          <div className="terminal__dots">
            <span className="dot dot--amber" />
            <span className="dot dot--sage" />
            <span className="dot dot--cream" />
          </div>
          <div className="terminal__title">java-assistant — local</div>

          <button
            type="button"
            className="size-toggle"
            onClick={cycleSize}
            title={`Tamanho: ${SIZE_LABELS[size]} (clique para alternar)`}
          >
            ⤢ {SIZE_LABELS[size]}
          </button>

          <button
            type="button"
            className="size-toggle"
            onClick={() => {
              setApiUrlDraft(apiUrl)
              setShowApiSettings((v) => !v)
            }}
            title="Configurar URL do backend"
          >
            ⚙ API
          </button>

          <StatusBadge status={status} />
        </header>

        {showApiSettings && (
          <form className="api-settings" onSubmit={saveApiUrl}>
            <label htmlFor="api-url" className="api-settings__label">
              URL do backend (túnel):
            </label>
            <input
              id="api-url"
              type="text"
              className="api-settings__field"
              value={apiUrlDraft}
              onChange={(e) => setApiUrlDraft(e.target.value)}
              placeholder="https://algo.devtunnels.ms"
              autoFocus
            />
            <button type="submit" className="api-settings__save">
              Salvar
            </button>
          </form>
        )}

        <main className="terminal__body" ref={scrollRef}>
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
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
              ? 'Backend offline — configure a URL da API acima (⚙)'
              : undefined
          }
        />
      </div>

      <footer className="app__footer">
        Rodando 100% local via Ollama · código-fonte no{' '}
        <a href={GITHUB_URL} target="_blank" rel="noreferrer">
          GitHub
        </a>
      </footer>
    </div>
  )
}
