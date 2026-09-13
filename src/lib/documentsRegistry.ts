import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * A single document tracked by the registry. Maps a stable `documentId` to its
 * current filename and content fingerprint so we can detect renames, edits and
 * deletes without re-reading the vector store.
 */
export interface DocumentRecord {
  documentId: string;
  filename: string;
  fileHash: string;
  updatedAt: string;
}

const DEFAULT_REGISTRY_PATH = path.resolve(
  process.cwd(),
  ".rag",
  "documents.json",
);

export async function loadRegistry(
  filePath: string = DEFAULT_REGISTRY_PATH,
): Promise<DocumentRecord[]> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as DocumentRecord[]) : [];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

export async function saveRegistry(
  records: DocumentRecord[],
  filePath: string = DEFAULT_REGISTRY_PATH,
): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(records, null, 2), "utf8");
}

export async function getDocumentById(
  documentId: string,
  filePath: string = DEFAULT_REGISTRY_PATH,
): Promise<DocumentRecord | undefined> {
  const records = await loadRegistry(filePath);
  return records.find((record) => record.documentId === documentId);
}

export async function upsertDocument(
  record: DocumentRecord,
  filePath: string = DEFAULT_REGISTRY_PATH,
): Promise<void> {
  const records = await loadRegistry(filePath);
  const index = records.findIndex((r) => r.documentId === record.documentId);
  if (index === -1) records.push(record);
  else records[index] = record;
  await saveRegistry(records, filePath);
}

export async function removeDocument(
  documentId: string,
  filePath: string = DEFAULT_REGISTRY_PATH,
): Promise<void> {
  const records = await loadRegistry(filePath);
  await saveRegistry(
    records.filter((record) => record.documentId !== documentId),
    filePath,
  );
}
