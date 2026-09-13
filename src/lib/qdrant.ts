import { QdrantClient } from "@qdrant/js-client-rest";
import type { Schemas } from "@qdrant/js-client-rest";
import type { StructuredChunkMetadata } from "./structureAwareChunker.js";

export const QDRANT_URL = "http://localhost:6333";
export const COLLECTION_NAME = "local_rag_collection";

type QdrantFilter = Schemas["Filter"];

export function createQdrantClient(): QdrantClient {
  return new QdrantClient({ url: QDRANT_URL });
}

/** Filter for points whose fileHash matches. */
function fileHashFilter(fileHash: string): QdrantFilter {
  return {
    must: [{ key: "metadata.fileHash", match: { value: fileHash } }],
  };
}

/** Filter for points whose documentIds array contains the given id. */
function documentIdFilter(documentId: string): QdrantFilter {
  return {
    must: [{ key: "metadata.documentIds", match: { any: [documentId] } }],
  };
}

async function collectionExists(client: QdrantClient): Promise<boolean> {
  const { collections } = await client.getCollections();
  return collections.some((collection) => collection.name === COLLECTION_NAME);
}

/** Whether any point already carries this content fingerprint. */
export async function hasFileHash(
  client: QdrantClient,
  fileHash: string,
): Promise<boolean> {
  if (!(await collectionExists(client))) return false;
  const { count } = await client.count(COLLECTION_NAME, {
    filter: fileHashFilter(fileHash),
    exact: true,
  });
  return count > 0;
}

export interface ScrolledPoint {
  id: string | number;
  vector: number[] | undefined;
  metadata: StructuredChunkMetadata;
  content: string;
}

/** Scroll (page through) every chunk point matching a filter. */
export async function scrollChunkPoints(
  client: QdrantClient,
  filter: QdrantFilter,
): Promise<ScrolledPoint[]> {
  const points: ScrolledPoint[] = [];
  let offset: string | number | null = null;

  do {
    const response = await client.scroll(COLLECTION_NAME, {
      filter,
      limit: 100,
      offset: offset ?? undefined,
      with_payload: true,
      with_vector: true,
    });

    for (const point of response.points) {
      const payload = (point.payload ?? {}) as Record<string, unknown>;
      const metadata = (payload.metadata ?? {}) as StructuredChunkMetadata;
      // Single unnamed dense vector -> returned as a flat number[].
      const vector = Array.isArray(point.vector)
        ? (point.vector as unknown as number[])
        : undefined;

      points.push({
        id: point.id,
        vector,
        metadata,
        content: (payload.content as string) ?? "",
      });
    }

    offset = (response.next_page_offset ?? null) as string | number | null;
  } while (offset !== null);

  return points;
}

export function scrollPointsByFileHash(
  client: QdrantClient,
  fileHash: string,
): Promise<ScrolledPoint[]> {
  return scrollChunkPoints(client, fileHashFilter(fileHash));
}

export function scrollPointsByDocumentId(
  client: QdrantClient,
  documentId: string,
): Promise<ScrolledPoint[]> {
  return scrollChunkPoints(client, documentIdFilter(documentId));
}

/** Delete the given points by id (used when a chunk's last reference is gone). */
export async function deletePointsByIds(
  client: QdrantClient,
  ids: Array<string | number>,
): Promise<void> {
  if (ids.length === 0) return;
  await client.delete(COLLECTION_NAME, {
    wait: true,
    points: ids,
  });
}
