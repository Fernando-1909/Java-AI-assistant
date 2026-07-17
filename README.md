# Java Assistant

Assistente de IA especializado em tirar dúvidas sobre a linguagem **Java**,
rodando **100% localmente** através do [Ollama](https://ollama.com), com uma
interface de chat em React inspirada em um terminal de desenvolvedor.

> Backend em Python (FastAPI) · Frontend em React + Vite · IA local via Ollama

---

## Sobre o projeto

Em vez de depender de uma API paga de LLM, este projeto roda o modelo de
linguagem **na própria máquina** através do Ollama. O backend em Python só
faz a ponte entre o frontend e o modelo local, injetando um *system prompt*
que restringe o assistente a responder apenas sobre Java (sintaxe, POO,
coleções, streams, exceptions, concorrência, ecossistema Maven/Gradle/Spring,
etc).

Para ficar acessível via web sem custo de hospedagem, o backend local é
exposto publicamente através de um túnel (Cloudflare Tunnel / ngrok),
enquanto o frontend (estático) é hospedado gratuitamente no GitHub Pages
ou Vercel.

```
┌─────────────────────┐        ┌──────────────────────────┐
│   Frontend (React)  │        │   Sua máquina local       │
│   GitHub Pages /    │  HTTP  │  ┌────────────────────┐  │
│   Vercel             │◄──────┼─►│ Backend FastAPI     │  │
│                      │ túnel  │  │  :8000              │  │
└─────────────────────┘        │  └─────────┬──────────┘  │
                                │            │              │
                                │  ┌─────────▼──────────┐  │
                                │  │ Ollama (LLM local)  │  │
                                │  │  :11434             │  │
                                │  └────────────────────┘  │
                                └──────────────────────────┘
```

## Stack

| Camada    | Tecnologia                              |
|-----------|------------------------------------------|
| IA        | [Ollama](https://ollama.com) (modelo local, ex: `llama3.2`, `codellama`) |
| Backend   | Python 3.11+, FastAPI, httpx (streaming) |
| Frontend  | React 18, Vite, CSS puro (sem framework) |
| Deploy    | GitHub Pages/Vercel (frontend) + Cloudflare Tunnel/ngrok (backend) |

## Estrutura

```
java-ai-assistant/
├── backend/
│   ├── app.py              # API FastAPI (endpoint /api/chat com streaming)
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/     # MessageBubble, InputBar, TypingIndicator, StatusBadge
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── styles.css
│   ├── index.html
│   ├── package.json
│   └── .env.example
└── README.md
```

## Rodando localmente

### Pré-requisitos

- [Ollama](https://ollama.com/download) instalado
- Python 3.11+
- Node.js 18+

### 1. Baixe um modelo no Ollama

```bash
ollama pull llama3.2
```

> Outras opções mais focadas em código: `codellama`, `deepseek-coder-v2`,
> `qwen2.5-coder`. Modelos maiores respondem melhor, mas exigem mais RAM.

### 2. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env           # ajuste o modelo se quiser
uvicorn app:app --reload --port 8000
```

Verifique em `http://localhost:8000/api/health`.

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Acesse `http://localhost:5173`.

## Publicando para acesso via web

O modelo roda na sua máquina, então "publicar" aqui significa expor seu
backend local com uma URL pública e hospedar o frontend estático de graça.

### Passo 1 — Expor o backend local

Usando [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/do-more-with-tunnels/trycloudflare/) (grátis, sem cadastro):

```bash
cloudflared tunnel --url http://localhost:8000
```

Isso gera uma URL pública (ex: `https://algo-aleatorio.trycloudflare.com`)
que redireciona para o seu backend local. Alternativa: `ngrok http 8000`.

### Passo 2 — Apontar o frontend para essa URL

No `frontend/.env`:

```
VITE_API_URL=https://algo-aleatorio.trycloudflare.com
```

E no backend, adicione a URL do frontend publicado em `ALLOWED_ORIGINS`
(no `backend/.env`).

### Passo 3 — Publicar o frontend

**GitHub Pages:**
```bash
cd frontend
npm run build
# publique o conteúdo de frontend/dist na branch gh-pages
```

**Vercel:** conecte o repositório, defina o diretório raiz como `frontend`
e a variável de ambiente `VITE_API_URL` no painel do projeto.

> O túnel e o backend só existem enquanto sua máquina estiver ligada e
> rodando `ollama serve` + `uvicorn`. Para um portfólio, isso costuma ser
> perfeitamente aceitável — liga a demo quando for mostrar, ou grava um
> vídeo/gif do uso para deixar fixo no README.

## Notas

- Nenhuma chave de API é necessária — tudo roda local via Ollama.
- O CORS do backend só libera as origens listadas em `ALLOWED_ORIGINS`.
- O system prompt mantém o assistente restrito ao tema Java.

