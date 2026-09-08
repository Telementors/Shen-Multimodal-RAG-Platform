"""
Pre-index Ashen Era Archive corpus on startup.

- Reads from CORPUS_DIR (sub-folders: chronicles/, codex/, ephemera/, wiki/)
- Skips already-indexed doc_ids (idempotent)
- --clean flag: DB truncate before indexing
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

from config import settings

logger = logging.getLogger(__name__)

# File extensions we can index
INDEXABLE_EXTENSIONS = {".pdf"}

# Sub-folders to scan inside the corpus directory
CORPUS_SUBDIRS = ["chronicles", "codex", "ephemera", "wiki"]


class PreIndexer:
    """Scan the Ashen Era corpus directory and index un-indexed PDFs."""

    def __init__(self, corpus_dir: Path | None = None) -> None:
        self.corpus_dir = corpus_dir or settings.corpus_dir
        self._index_service: Any = None
        self._doc_service: Any = None

    def _get_index_service(self) -> Any:
        if self._index_service is None:
            from api.services import IndexService
            self._index_service = IndexService()
        return self._index_service

    def _get_doc_service(self) -> Any:
        if self._doc_service is None:
            from api.services import DocumentService
            self._doc_service = DocumentService()
        return self._doc_service

    def _collect_pdfs(self) -> list[tuple[str, Path]]:
        """Collect all indexable PDFs from corpus sub-directories."""
        if not self.corpus_dir or not self.corpus_dir.exists():
            logger.warning("Corpus directory not found: %s", self.corpus_dir)
            return []

        files: list[tuple[str, Path]] = []

        # Walk through known sub-directories
        for subdir_name in CORPUS_SUBDIRS:
            subdir = self.corpus_dir / subdir_name
            if not subdir.exists():
                logger.info("Corpus sub-directory not found, skipping: %s", subdir)
                continue

            for file_path in sorted(subdir.rglob("*")):
                if file_path.is_file() and file_path.suffix.lower() in INDEXABLE_EXTENSIONS:
                    files.append((file_path.name, file_path))

        logger.info(
            "Found %d indexable files in corpus: %s", len(files), self.corpus_dir
        )
        return files

    def _get_indexed_doc_ids(self) -> set[str]:
        """Get set of already-indexed document IDs."""
        try:
            docs = self._get_doc_service().list_documents()
            return {doc.doc_id for doc in docs}
        except Exception as exc:
            logger.warning("Could not fetch indexed docs: %s", exc)
            return set()

    def run(self, *, clean: bool = False) -> dict[str, int]:
        """
        Run the pre-indexing process synchronously.

        Returns dict with counts: total, skipped, indexed, errors.
        """
        if not self.corpus_dir or not self.corpus_dir.exists():
            logger.info("No corpus directory configured, skipping pre-index.")
            return {"total": 0, "skipped": 0, "indexed": 0, "errors": 0}

        logger.info(
            "Pre-indexing %s corpus from: %s",
            settings.corpus_name,
            self.corpus_dir,
        )

        all_files = self._collect_pdfs()
        if not all_files:
            logger.info("No indexable files found in corpus.")
            return {"total": 0, "skipped": 0, "indexed": 0, "errors": 0}

        # Get already-indexed docs
        indexed_ids = set() if clean else self._get_indexed_doc_ids()

        # Filter out already-indexed
        to_index: list[tuple[str, Path]] = []
        skipped = 0
        for filename, path in all_files:
            doc_id = Path(filename).stem
            if doc_id in indexed_ids:
                logger.debug("Already indexed, skipping: %s", doc_id)
                skipped += 1
            else:
                to_index.append((filename, path))

        if not to_index:
            logger.info(
                "All %d corpus documents already indexed. Nothing to do.",
                len(all_files),
            )
            return {
                "total": len(all_files),
                "skipped": skipped,
                "indexed": 0,
                "errors": 0,
            }

        logger.info(
            "Indexing %d new documents (%d already indexed)...",
            len(to_index),
            skipped,
        )

        # Index in batches to avoid memory issues
        batch_size = 5
        indexed_count = 0
        error_count = 0

        for i in range(0, len(to_index), batch_size):
            batch = to_index[i : i + batch_size]
            try:
                self._get_index_service().index_files(batch)
                indexed_count += len(batch)
                logger.info(
                    "Indexed batch %d/%d (%d files)",
                    i // batch_size + 1,
                    (len(to_index) + batch_size - 1) // batch_size,
                    len(batch),
                )
            except Exception as exc:
                error_count += len(batch)
                logger.error("Failed to index batch: %s", exc)

        result = {
            "total": len(all_files),
            "skipped": skipped,
            "indexed": indexed_count,
            "errors": error_count,
        }
        logger.info("Pre-indexing complete: %s", result)
        return result

    async def run_async(self, *, clean: bool = False) -> dict[str, int]:
        """Async wrapper around run() for use in FastAPI startup."""
        import asyncio
        return await asyncio.to_thread(self.run, clean=clean)


if __name__ == "__main__":
    import argparse

    logging.basicConfig(level=logging.INFO)
    cli = argparse.ArgumentParser(description="Pre-index Ashen Era corpus.")
    cli.add_argument(
        "--clean",
        action="store_true",
        help="Ignore existing indexed docs and re-index everything.",
    )
    cli.add_argument(
        "--corpus-dir",
        type=Path,
        default=None,
        help="Override corpus directory path.",
    )
    args = cli.parse_args()

    indexer = PreIndexer(corpus_dir=args.corpus_dir)
    result = indexer.run(clean=args.clean)
    print(f"Result: {result}")
