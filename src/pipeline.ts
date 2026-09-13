// import pdf
// convert into md
// resolve document identity (id + content hash)
// decide what to do (getAction)
// structure aware chunking + appropriate metadata
// embed chunks using ai model
// store into vector db.

import { existsSync } from "node:fs";
import path from "node:path";
import { pdfToMarkdown } from "./lib/pdfToMarkdown.js";
import { createEmbeddings } from "./lib/embedChunks.js";
import {
  deriveFileHash,
  resolveDocumentId,
} from "./lib/documentIdentity.js";
import { getDocumentById } from "./lib/documentsRegistry.js";
import { createQdrantClient, hasFileHash } from "./lib/qdrant.js";
import { getAction } from "./lib/getAction.js";
import {
  deleteDocument,
  ingestDocument,
  reindexDocument,
  renameDocument,
  shareDocument,
} from "./lib/documentOps.js";
import type { IngestContext } from "./lib/documentOps.js";

export const main = async () => {
  // 1) import pdf
  const pdfSource = "src/data/depron_micro_aerodynamics.pdf";
  const filename = path.basename(pdfSource);
  const fileExistsAtSource = existsSync(pdfSource);

  // 2) convert into md
  const knowledgeMd = await pdfToMarkdown(pdfSource);

  // Resolve identity: a stable id (the filename here, since no source id is
  // provided) and a content fingerprint.
  const fileHash = deriveFileHash(knowledgeMd);
  const documentId = resolveDocumentId(undefined, filename);

  // Gather the facts getAction needs: is this document already known, and is
  // this content already indexed?
  const client = createQdrantClient();
  const [existing, hashFound] = await Promise.all([
    getDocumentById(documentId),
    hasFileHash(client, fileHash),
  ]);

  const action = getAction({
    providedDocumentId: undefined,
    documentId,
    documentIdExists: existing !== undefined,
    fileExistsAtSource,
    filename,
    fileHash,
    hashFound,
    existingHash: existing?.fileHash,
    existingFilename: existing?.filename,
  });

  console.log(`[${filename}] action: ${action}`);

  const embeddings = createEmbeddings();
  const ctx: IngestContext = {
    documentId,
    filename,
    fileHash,
    markdown: knowledgeMd,
    embeddings,
  };

  // 3-6) act on the decision. (DELETE is normally driven by a source-system
  // webhook and invoked via deleteDocument() directly; this switch also
  // covers it for completeness.)
  switch (action) {
    case "INGEST":
      await ingestDocument(ctx);
      break;
    case "REINDEX":
      await reindexDocument(ctx);
      break;
    case "SHARE":
      await shareDocument(ctx);
      break;
    case "RENAME":
      await renameDocument(documentId, filename);
      break;
    case "DELETE":
      await deleteDocument(documentId);
      break;
    case "SKIP":
      console.log("SKIP: content unchanged.");
      break;
  }
};
