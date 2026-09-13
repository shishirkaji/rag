import { createHash } from "node:crypto";

/**
 * Deterministic SHA-256 fingerprint of a document's content.
 *
 * We hash the Markdown text that flows through chunking and embedding (rather
 * than the raw PDF bytes) so that the fingerprint tracks what is actually
 * indexed. Two files whose converted content is identical therefore share a
 * fingerprint even if their filenames or binary layouts differ.
 */
export function deriveFileHash(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

/**
 * Deterministic, UUID-shaped point id derived from a chunk's content.
 *
 * Stable across runs (same content -> same id) so Qdrant `upsert` overwrites
 * in place instead of appending duplicates. The digest is 128 bits, shaped
 * with version/variant nibbles so it is accepted as a UUID point id.
 */
export function deriveChunkId(pageContent: string): string {
  const hex = createHash("sha256").update(pageContent, "utf8").digest("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    "4" + hex.slice(13, 16),
    "8" + hex.slice(17, 20),
    hex.slice(20, 32),
  ].join("-");
}

/**
 * Resolve the stable document id used to anchor rename/edit/delete tracking.
 *
 * Prefer the source system's own id when available (e.g. a Drive file id).
 * When the source provides none, fall back to the filename so ingestion is
 * still possible without an external id.
 */
export function resolveDocumentId(
  sourceId: string | undefined,
  filename: string,
): string {
  return sourceId ?? filename;
}
