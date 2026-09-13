import type { OpenAIEmbeddings } from "@langchain/openai";
import { Document } from "@langchain/core/documents";
import type { QdrantClient } from "@qdrant/js-client-rest";
import {
  COLLECTION_NAME,
  createQdrantClient,
  deletePointsByIds,
  scrollPointsByDocumentId,
  scrollPointsByFileHash,
} from "./qdrant.js";
import { createStructuredChunks } from "./structureAwareChunker.js";
import { embedChunks } from "./embedChunks.js";
import { storeChunksInQdrant } from "./storeChunksInDb.js";
import {
  getDocumentById,
  removeDocument,
  upsertDocument,
} from "./documentsRegistry.js";
import type { DocumentRecord } from "./documentsRegistry.js";

/** Everything the pipeline needs to process a single document. */
export interface IngestContext {
  documentId: string;
  filename: string;
  fileHash: string;
  markdown: string;
  embeddings: OpenAIEmbeddings;
}

function registryRecord(ctx: IngestContext): DocumentRecord {
  return {
    documentId: ctx.documentId,
    filename: ctx.filename,
    fileHash: ctx.fileHash,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Append `documentId` to every chunk already indexed under `fileHash`. This is
 * the dedup path: identical content under a new document simply reuses the
 * existing vectors (no re-embedding), and the chunk gains another reference.
 */
async function addDocumentIdToPoints(
  client: QdrantClient,
  documentId: string,
  fileHash: string,
): Promise<void> {
  const points = await scrollPointsByFileHash(client, fileHash);

  const updates = points
    .filter((p): p is typeof p & { vector: number[] } => p.vector !== undefined)
    .map((p) => {
      const documentIds = p.metadata.documentIds.includes(documentId)
        ? p.metadata.documentIds
        : [...p.metadata.documentIds, documentId];
      return {
        id: p.id,
        vector: p.vector,
        payload: { content: p.content, metadata: { ...p.metadata, documentIds } },
      };
    });

  if (updates.length > 0) {
    await client.upsert(COLLECTION_NAME, { wait: true, points: updates });
  }
}

/**
 * Remove `documentId` from every chunk that references it. A chunk whose
 * `documentIds` becomes empty has lost its last reference and is deleted.
 */
async function removeDocumentIdFromPoints(
  client: QdrantClient,
  documentId: string,
): Promise<void> {
  const points = await scrollPointsByDocumentId(client, documentId);

  const updates = [];
  const deletions: Array<string | number> = [];

  for (const point of points) {
    const remaining = point.metadata.documentIds.filter(
      (id) => id !== documentId,
    );
    if (remaining.length === 0) {
      deletions.push(point.id);
    } else if (point.vector !== undefined) {
      updates.push({
        id: point.id,
        vector: point.vector,
        payload: {
          content: point.content,
          metadata: { ...point.metadata, documentIds: remaining },
        },
      });
    }
  }

  if (updates.length > 0) {
    await client.upsert(COLLECTION_NAME, { wait: true, points: updates });
  }
  await deletePointsByIds(client, deletions);
}

/** New content: chunk, embed, store, then record in the registry. */
export async function ingestDocument(ctx: IngestContext): Promise<void> {
  const chunks = await createStructuredChunks(
    new Document({ pageContent: ctx.markdown, metadata: { source: ctx.filename } }),
    { documentIds: [ctx.documentId], fileHash: ctx.fileHash },
  );

  const vectors = await embedChunks(chunks, ctx.embeddings);
  await storeChunksInQdrant(chunks, ctx.embeddings, vectors);

  await upsertDocument(registryRecord(ctx));
  console.log(`INGEST ${ctx.filename} (${chunks.length} chunks)`);
}

/** Same document, changed content: drop old references, then ingest fresh. */
export async function reindexDocument(ctx: IngestContext): Promise<void> {
  const client = createQdrantClient();
  await removeDocumentIdFromPoints(client, ctx.documentId);
  await ingestDocument(ctx);
  console.log(`REINDEX ${ctx.filename}`);
}

/** Duplicate content under a new document: reuse existing vectors. */
export async function shareDocument(ctx: IngestContext): Promise<void> {
  const client = createQdrantClient();
  await addDocumentIdToPoints(client, ctx.documentId, ctx.fileHash);
  await upsertDocument(registryRecord(ctx));
  console.log(`SHARE ${ctx.filename} (reused existing vectors)`);
}

/** Rename: update only the registry's filename (metadata-only change). */
export async function renameDocument(
  documentId: string,
  newFilename: string,
): Promise<void> {
  const existing = await getDocumentById(documentId);
  if (!existing) return;
  await upsertDocument({
    ...existing,
    filename: newFilename,
    updatedAt: new Date().toISOString(),
  });
  console.log(`RENAME ${existing.filename} -> ${newFilename}`);
}

/** Delete: drop this document's references and its registry entry. */
export async function deleteDocument(documentId: string): Promise<void> {
  const client = createQdrantClient();
  await removeDocumentIdFromPoints(client, documentId);
  await removeDocument(documentId);
  console.log(`DELETE ${documentId}`);
}
