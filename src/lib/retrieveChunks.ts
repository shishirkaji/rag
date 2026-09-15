import { QdrantVectorStore } from "@langchain/qdrant";
import type { OpenAIEmbeddings } from "@langchain/openai";
import { createEmbeddings } from "./embedChunks.js";
import { COLLECTION_NAME, QDRANT_URL } from "./qdrant.js";
import type { StructuredChunkMetadata } from "./structureAwareChunker.js";

/** A chunk returned by similarity search, flattened for easy reading/logging. */
export interface RetrievedChunk {
  content: string;
  score: number;
  source?: string;
  headings: string[];
}

/**
 * Build a read-only vector store over the ingested collection. Uses the same
 * shared constants as the ingestion path so retrieval and storage can never
 * drift apart on the collection name or URL.
 */
export function createRetriever(
  embeddings: OpenAIEmbeddings = createEmbeddings(),
): QdrantVectorStore {
  return new QdrantVectorStore(embeddings, {
    url: QDRANT_URL,
    collectionName: COLLECTION_NAME,
  });
}

/**
 * Run a similarity query against the ingested chunks and return the top-k
 * matches with their score, source and heading path.
 *
 * @param query Natural-language question.
 * @param k Number of chunks to return.
 * @param embeddings Embeddings model (defaults to the shared pipeline model).
 */
export async function retrieveChunks(
  query: string,
  k = 5,
  embeddings: OpenAIEmbeddings = createEmbeddings(),
): Promise<RetrievedChunk[]> {
  const store = createRetriever(embeddings);
  const results = await store.similaritySearchWithScore(query, k);

  return results.map(([doc, score]) => {
    const metadata = doc.metadata as StructuredChunkMetadata;
    const headings = ["Header 1", "Header 2", "Header 3"]
      .map((key) => metadata[key])
      .filter((value): value is string => typeof value === "string");

    return {
      content: doc.pageContent,
      score,
      source: metadata.source,
      headings,
    };
  });
}
