import { QdrantVectorStore } from "@langchain/qdrant";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Document } from "langchain";
import { StructuredChunkMetadata } from "./structureAwareChunker.js";

export async function storeChunksInQdrant(chunks:Document<StructuredChunkMetadata>[]) {
  const embeddings = new OpenAIEmbeddings({
    modelName: "text-embedding-3-small",
  });

  // Connects directly to the Docker container running on your Mac
  const vectorStore = await QdrantVectorStore.fromDocuments(
    chunks,
    embeddings,
    {
      url: "http://localhost:6333",
      collectionName: "local_rag_collection",
    }
  );

  console.log("Successfully stored in local Qdrant!");
  return vectorStore;
}