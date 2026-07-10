"""
Java Assistant API
------------------
Backend em FastAPI que expõe um endpoint de chat conectado a um modelo
rodando localmente via Ollama (https://ollama.com). O modelo é instruído,
por meio de um system prompt, a atuar como um assistente especializado
exclusivamente na linguagem de programação Java.

Rodar localmente:
    uvicorn app:app --reload --port 8000

Pré-requisitos:
    - Ollama instalado e rodando (`ollama serve`)
    - Um modelo baixado (ex: `ollama pull llama3.2`)
"""

import json
import os
from typing import List, Optional

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

load_dotenv()

OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
).split(",")

SYSTEM_PROMPT = """Você é o Java Assistant, um assistente virtual especializado \
EXCLUSIVAMENTE na linguagem de programação Java.

Regras que você deve seguir sempre:
1. Responda apenas perguntas relacionadas a Java: sintaxe, orientação a \
objetos, coleções, streams, exceptions, concorrência, JVM, ecossistema \
(Maven, Gradle, Spring, etc.) e tópicos diretamente relacionados.
2. Se a pergunta não tiver relação com Java, explique educadamente que você \
é especializado apenas em Java e sugira reformular a pergunta.
3. Responda sempre no mesmo idioma em que a pergunta foi feita.
4. Seja claro, direto e didático. Para dúvidas de código, inclua exemplos \
curtos e corretos usando blocos de código markdown (```java ... ```).
5. Quando houver mais de uma forma de resolver algo, mencione brevemente \
as alternativas mais relevantes, mas não se estenda demais.
"""

app = FastAPI(title="Java Assistant API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []


@app.get("/api/health")
async def health():
    """Usado pelo frontend para saber se o backend + Ollama estão de pé."""
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            response = await client.get(f"{OLLAMA_HOST}/api/tags")
            response.raise_for_status()
        return {"status": "ok", "ollama": "connected", "model": OLLAMA_MODEL}
    except Exception:
        return {"status": "degraded", "ollama": "unreachable", "model": OLLAMA_MODEL}


@app.post("/api/chat")
async def chat(req: ChatRequest):
    """
    Recebe a mensagem do usuário + histórico, encaminha para o Ollama e
    devolve a resposta em streaming (NDJSON: uma linha JSON por chunk).
    """
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for m in req.history[-10:]:
        messages.append({"role": m.role, "content": m.content})
    messages.append({"role": "user", "content": req.message})

    payload = {"model": OLLAMA_MODEL, "messages": messages, "stream": True}

    async def stream_generator():
        try:
            async with httpx.AsyncClient(timeout=None) as client:
                async with client.stream(
                    "POST", f"{OLLAMA_HOST}/api/chat", json=payload
                ) as response:
                    if response.status_code != 200:
                        yield json.dumps(
                            {
                                "error": (
                                    "Não foi possível falar com o Ollama. "
                                    f"Verifique se o modelo '{OLLAMA_MODEL}' "
                                    "está baixado e o serviço está rodando."
                                )
                            }
                        ) + "\n"
                        return

                    async for line in response.aiter_lines():
                        if not line:
                            continue
                        try:
                            data = json.loads(line)
                        except json.JSONDecodeError:
                            continue

                        content = data.get("message", {}).get("content", "")
                        if content:
                            yield json.dumps({"chunk": content}) + "\n"
                        if data.get("done"):
                            yield json.dumps({"done": True}) + "\n"
        except httpx.ConnectError:
            yield json.dumps(
                {"error": f"Ollama não está rodando em {OLLAMA_HOST}."}
            ) + "\n"
        except Exception as exc:  # segurança extra p/ nunca travar o stream
            yield json.dumps({"error": f"Erro inesperado: {exc}"}) + "\n"

    return StreamingResponse(stream_generator(), media_type="application/x-ndjson")
