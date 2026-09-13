import { QdrantVectorStore } from "@langchain/qdrant";
import type { OpenAIEmbeddings } from "@langchain/openai";
import type { Document } from "@langchain/core/documents";
import type { StructuredChunkMetadata } from "./structureAwareChunker.js";
import { QDRANT_URL, COLLECTION_NAME } from "./qdrant.js";

/**
 * Store precomputed embedding vectors and their chunks into a local Qdrant
 * instance (running as a Docker container on your Mac).
 *
 * Accepting the vectors (rather than embedding them here) keeps this step
 * storage-only: the pipeline embeds once with `embedChunks` and passes the
 * result in, so chunks are never embedded twice.
 *
 * @param chunks The chunks whose content/metadata become the point payloads.
 * @param embeddings The embeddings instance used to configure the vector store.
 * @param vectors One vector per chunk, in the same order as `chunks`.
 * @returns The configured vector store.
 */
export async function storeChunksInQdrant(
  chunks: Document<StructuredChunkMetadata>[],
  embeddings: OpenAIEmbeddings,
  vectors: number[][],
): Promise<QdrantVectorStore> {
  const vectorStore = new QdrantVectorStore(embeddings, {
    url: QDRANT_URL,
    collectionName: COLLECTION_NAME,
  });

  // `addVectors` ensures the collection exists, then upserts the points. Each
  // chunk already carries a stable `id`, so re-running overwrites in place
  // instead of appending duplicates.
  await vectorStore.addVectors(vectors, chunks);

  console.log(`Successfully stored ${chunks.length} chunks in local Qdrant!`);
  return vectorStore;
}