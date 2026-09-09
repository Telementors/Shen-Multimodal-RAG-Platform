# Configuration Examples

This directory contains example configuration files for deploying and running the **Shen — Multimodal RAG Platform**. Copy and modify these files to match your environment.

## Files

| File | Purpose | Copy To |
|---|---|---|
| `backend.env.ollama` | Backend config for **Ollama** (local, free) | `src/Shen_RAG_Core/.env` |
| `backend.env.openai` | Backend config for **OpenAI** (cloud) | `src/Shen_RAG_Core/.env` |
| `frontend.env.local` | Frontend environment variables | `src/Shen_App/.env.local` |
| `docker-compose.yml` | Full 4-service Docker Compose orchestration | `src/docker-compose.yml` |
| `docker-compose.override.yml` | Override example for custom ports/volumes | `src/docker-compose.override.yml` |
| `nginx.conf` | Reverse proxy config for production deployment | Deploy alongside Docker Compose |

## Quick Start

### Option A — Ollama (Free, Local)

```bash
# Copy Ollama backend config
cp backend.env.ollama ../src/Shen_RAG_Core/.env

# Copy frontend config
cp frontend.env.local ../src/Shen_App/.env.local

# Start all services
cd ../src
docker compose up --build
```

### Option B — OpenAI (Cloud)

```bash
# Copy OpenAI backend config
cp backend.env.openai ../src/Shen_RAG_Core/.env

# ⚠️ Edit the file and set your actual API key
# nano ../src/Shen_RAG_Core/.env

# Copy frontend config
cp frontend.env.local ../src/Shen_App/.env.local

# Start all services
cd ../src
docker compose up --build
```

### Option C — Production with Nginx

```bash
# Copy all configs
cp backend.env.ollama ../src/Shen_RAG_Core/.env
cp frontend.env.local ../src/Shen_App/.env.local
cp docker-compose.yml ../src/docker-compose.yml
cp docker-compose.override.yml ../src/docker-compose.override.yml
cp nginx.conf ../nginx.conf

# Edit configs to match your domain/ports
# Start services
cd ../src
docker compose up --build -d
```

## Environment Variable Reference

For a complete reference of all supported environment variables, see the [Configuration section](../README.md#configuration) in the main README.
