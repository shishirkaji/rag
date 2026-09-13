import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { splitMarkdownByHeadings } from "./splitMarkdownByHeadings.js";
import { deriveChunkId } from "./documentIdentity.js";

// Metadata attached to every structure-aware chunk. The "Header N" keys
// mirror the document's heading hierarchy (H1/H2/H3), so downstream steps
// (embedding, retrieval) can filter or weight chunks by section.
//
// `documentIds` is an array so identical content shared across documents can
// reference the same chunk points (dedup); `fileHash` fingerprints the source
// content so the pipeline can detect changes and duplicates.
export interface StructuredChunkMetadata {
  documentIds: string[];
  fileHash: string;
  source?: string;
  "Header 1"?: string;
  "Header 2"?: string;
  "Header 3"?: string;
  chunkIndex: number;
  [key: string]: unknown;
}

/** Stable identity attached to every chunk produced for a given document. */
export interface ChunkIdentity {
  documentIds: string[];
  fileHash: string;
}

export interface ChunkOptions {
  chunkSize?: number;
  chunkOverlap?: number;
}

/**
 * Create structure-aware chunks from a Markdown Document.
 *
 * Two-pass approach:
 *   1. Split on Markdown headings (H1-H3) so each section carries its
 *      heading hierarchy in metadata.
 *   2. Split any oversized section with a Markdown-aware
 *      `RecursiveCharacterTextSplitter` so chunks respect heading,
 *      code-fence and paragraph boundaries and stay under `chunkSize`.
 */
export async function createStructuredChunks(
  doc: Document,
  identity: ChunkIdentity,
  options: ChunkOptions = {}
): Promise<Document<StructuredChunkMetadata>[]> {
  const chunkSize = options.chunkSize ?? 500;
  const chunkOverlap = options.chunkOverlap ?? 50;
  const source = (doc.metadata.source as string | undefined) ?? "unknown";

  // 1) Structure-aware split on headings.
  const sections = splitMarkdownByHeadings(doc.pageContent);

  // 2) Size-aware split using Markdown-aware separators.
  const splitter = RecursiveCharacterTextSplitter.fromLanguage("markdown", {
    chunkSize,
    chunkOverlap,
  });

  const chunks: Document<StructuredChunkMetadata>[] = [];
  let chunkIndex = 0;

  for (const section of sections) {
    const subChunks =
      section.content.length > chunkSize
        ? await splitter.splitDocuments([
            new Document({ pageContent: section.content }),
          ])
        : [new Document({ pageContent: section.content })];

    for (const subChunk of subChunks) {
      chunks.push(
        new Document({
          // Stable, content-derived point id so re-runs upsert in place.
          id: deriveChunkId(subChunk.pageContent),
          pageContent: subChunk.pageContent,
          metadata: {
            documentIds: identity.documentIds,
            fileHash: identity.fileHash,
            source,
            ...section.headers,
            chunkIndex: chunkIndex++,
          },
        })
      );
    }
  }

  return chunks;
}
