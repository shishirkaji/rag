export type IngestAction =
  | "INGEST" //   new content, never indexed
  | "REINDEX" //  same document, content changed (edit)
  | "SHARE" //    content already indexed under a different document
  | "SKIP" //     unchanged (same document + same hash)
  | "RENAME" //   unchanged content, filename differs
  | "DELETE"; //  source file gone

export interface ActionInput {
  /** Raw id from the source system (e.g. Drive file id). May be undefined. */
  providedDocumentId?: string;
  /** Resolved id = providedDocumentId ?? filename. */
  documentId: string;
  /** Is this documentId already recorded in the documents registry? */
  documentIdExists: boolean;
  /** Does the file still exist upstream (in the source system)? */
  fileExistsAtSource: boolean;
  /** Current filename. */
  filename: string;
  /** SHA-256 of the current content. */
  fileHash: string;
  /** Is this fileHash already indexed (any chunk carries it)? */
  hashFound: boolean;
  /** Hash previously stored for this document (when documentIdExists). */
  existingHash?: string;
  /** Filename previously stored for this document (when documentIdExists). */
  existingFilename?: string;
}

/**
 * Decide what the pipeline should do for a given document.
 *
 * Precedence:
 *   1. source file gone        -> DELETE
 *   2. known document:
 *        content unchanged     -> SKIP (or RENAME if the filename moved)
 *        content changed       -> REINDEX
 *   3. unknown document:
 *        content already known -> SHARE
 *        otherwise             -> INGEST
 */
export function getAction(input: ActionInput): IngestAction {
  const {
    documentIdExists,
    fileExistsAtSource,
    hashFound,
    fileHash,
    existingHash,
    existingFilename,
    filename,
  } = input;

  if (!fileExistsAtSource) return "DELETE";

  if (documentIdExists) {
    if (existingHash === fileHash) {
      return existingFilename !== filename ? "RENAME" : "SKIP";
    }
    return "REINDEX";
  }

  return hashFound ? "SHARE" : "INGEST";
}
