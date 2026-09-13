import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  getDocumentById,
  loadRegistry,
  removeDocument,
  upsertDocument,
} from "../lib/documentsRegistry.js";
import type { DocumentRecord } from "../lib/documentsRegistry.js";

async function tempRegistryPath(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "rag-registry-"));
  return path.join(dir, "documents.json");
}

function record(overrides: Partial<DocumentRecord> = {}): DocumentRecord {
  return {
    documentId: "notes.pdf",
    filename: "notes.pdf",
    fileHash: "hash-a",
    updatedAt: "2026-09-13T00:00:00.000Z",
    ...overrides,
  };
}

test("returns an empty registry when the file does not exist", async () => {
  const filePath = await tempRegistryPath();
  assert.deepEqual(await loadRegistry(filePath), []);
});

test("upsert adds then updates a document", async () => {
  const filePath = await tempRegistryPath();

  await upsertDocument(record(), filePath);
  assert.deepEqual(await getDocumentById("notes.pdf", filePath), record());

  await upsertDocument(record({ filename: "renamed.pdf" }), filePath);
  const stored = await getDocumentById("notes.pdf", filePath);
  assert.equal(stored?.filename, "renamed.pdf");
  assert.equal((await loadRegistry(filePath)).length, 1, "no duplicates");
});

test("removeDocument deletes a document by id", async () => {
  const filePath = await tempRegistryPath();

  await upsertDocument(record(), filePath);
  await upsertDocument(record({ documentId: "other.pdf" }), filePath);

  await removeDocument("notes.pdf", filePath);

  assert.equal(await getDocumentById("notes.pdf", filePath), undefined);
  assert.deepEqual(
    (await loadRegistry(filePath)).map((r) => r.documentId),
    ["other.pdf"],
  );
});

test("getDocumentById returns undefined for an unknown id", async () => {
  const filePath = await tempRegistryPath();
  assert.equal(await getDocumentById("missing.pdf", filePath), undefined);
});
