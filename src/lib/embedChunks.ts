import { OpenAIEmbeddings } from "@langchain/openai";
import type { Document } from "@langchain/core/documents";

// Single source of truth for which OpenAI embedding model the RAG pipeline
// uses. Keeping it in one place means the embedding step and the storage step
// can never drift apart on the model name.
export const EMBEDDING_MODEL_NAME = "text-embedding-3-small";

/**
 * Create the OpenAI embeddings model used throughout the pipeline.
 *
 * Reads the API key from the environment (`OPEN_AI_KEY`) so no secrets are
 * hardcoded here. Callers that need to embed documents *and* store them can
 * pass the returned instance to both steps so the model is only configured
 * once.
 */
export function createEmbeddings(): OpenAIEmbeddings {
  return new OpenAIEmbeddings({
    modelName: EMBEDDING_MODEL_NAME,
    apiKey: process.env.OPEN_AI_KEY,
  });
}

/**
 * Embed the page content of each chunk into a dense vector.
 *
 * @param chunks The chunks to embed.
 * @param embeddings Optional embeddings instance; defaults to `createEmbeddings()`.
 * @returns One vector per chunk, in the same order as `chunks`.
 */
export async function embedChunks(
  chunks: Document[],
  embeddings: OpenAIEmbeddings = createEmbeddings(),
): Promise<number[][]> {
  const texts = chunks.map((chunk) => chunk.pageContent);
  return embeddings.embedDocuments(texts);
}
