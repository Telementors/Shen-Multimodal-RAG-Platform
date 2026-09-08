"""FastAPI application for the multimodal RAG platform."""

from __future__ import annotations

import logging
import shutil
from functools import lru_cache
from pathlib import Path
from uuid import uuid4

from fastapi import Depends, FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles

from api.config import CORS_ORIGINS, UPLOAD_DIR
from config import settings
from api.schemas import DocumentsResponse, IndexResponse, QueryRequest, QueryResponse
from api.services import DocumentService, IndexService, QueryService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Shen RAG Core API",
    description="Shen multimodal knowledge engine — parse, index, and query documents across text, tables, and images with intelligent routing.",
    version="2.4.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# ── Serve images — mount data/images/ directory ──────────────────
# DB stores paths like: data\images\<doc_folder>\<filename>.png
# Frontend fetches:     GET /images/<doc_folder>/<filename>.png
_img_dir = Path("data/images")
_img_dir.mkdir(parents=True, exist_ok=True)
app.mount("/images", StaticFiles(directory=str(_img_dir)), name="images")


@lru_cache
def get_query_service() -> QueryService:
    return QueryService()


@lru_cache
def get_document_service() -> DocumentService:
    return DocumentService()


# No lru_cache — fresh instance per request to avoid stale parser
def get_index_service() -> IndexService:
    return IndexService()


@app.get("/")
def root() -> RedirectResponse:
    return RedirectResponse(url="/docs")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.on_event("startup")
async def startup_preindex():
    """Auto-index Ashen Era corpus if CORPUS_DIR is set (non-blocking background thread)."""
    if settings.corpus_dir and settings.corpus_dir.exists():
        import threading

        def _run_preindex():
            try:
                import asyncio
                from corpus.pre_index import PreIndexer
                indexer = PreIndexer()
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                loop.run_until_complete(indexer.run_async(clean=settings.corpus_clean_on_start))
                loop.close()
                logger.info("✅ Background corpus pre-indexing completed.")
            except Exception:
                logger.exception("❌ Background corpus pre-indexing failed.")

        thread = threading.Thread(target=_run_preindex, daemon=True)
        thread.start()
        logger.info("🚀 Corpus pre-indexing started in background thread.")


@app.get("/corpus/status")
def corpus_status() -> dict:
    """Show corpus indexing status."""
    from api.services import DocumentService
    docs = DocumentService().list_documents()
    total_text = sum(d.text_chunks for d in docs)
    total_table = sum(d.table_chunks for d in docs)
    total_image = sum(d.image_chunks for d in docs)
    return {
        "corpus_name": settings.corpus_name,
        "documents_indexed": len(docs),
        "total_text_chunks": total_text,
        "total_table_chunks": total_table,
        "total_image_chunks": total_image,
        "corpus_dir_configured": bool(settings.corpus_dir),
    }


@app.post("/query", response_model=QueryResponse)
def query_documents(
    body: QueryRequest,
    service: QueryService = Depends(get_query_service),
) -> QueryResponse:
    return service.answer_query(body.query, doc_id=body.doc_id, top_k=body.top_k)


@app.get("/documents", response_model=DocumentsResponse)
def list_documents(
    service: DocumentService = Depends(get_document_service),
) -> DocumentsResponse:
    return DocumentsResponse(documents=service.list_documents())


@app.post("/index", response_model=IndexResponse)
async def index_documents(
    files: list[UploadFile] = File(...),
    service: IndexService = Depends(get_index_service),
) -> IndexResponse:
    if not files:
        return IndexResponse(indexed=[])

    saved: list[tuple[str, Path]] = []
    for upload in files:
        if not upload.filename or not upload.filename.lower().endswith(".pdf"):
            logger.warning("Skipping non-PDF: %s", upload.filename)
            continue
        dest = UPLOAD_DIR / f"{uuid4().hex}_{Path(upload.filename).name}"
        with dest.open("wb") as out:
            shutil.copyfileobj(upload.file, out)
        saved.append((upload.filename, dest))
        logger.info("Saved: %s → %s", upload.filename, dest)

    if not saved:
        return IndexResponse(indexed=[])

    logger.info("Indexing %d files", len(saved))
    result = service.index_files(saved)
    logger.info("Done: %s", result)
    return result


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "api.main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.api_reload,
    )