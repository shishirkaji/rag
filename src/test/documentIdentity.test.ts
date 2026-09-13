import { test } from "node:test";
import assert from "node:assert/strict";
import {
  deriveChunkId,
  deriveFileHash,
  resolveDocumentId,
} from "../lib/documentIdentity.js";

test("deriveFileHash is deterministic and 64 hex chars", () => {
  const content = "Extruded polystyrene foam # Introduction";
  const a = deriveFileHash(content);
  const b = deriveFileHash(content);

  assert.equal(a, b, "same content must produce the same hash");
  assert.match(a, /^[0-9a-f]{64}$/, "SHA-256 hex digest");
  assert.notEqual(a, deriveFileHash(content + " "), "content changes hash");
});

test("deriveChunkId is deterministic and UUID-shaped", () => {
  const content = "some chunk of text";
  const a = deriveChunkId(content);
  const b = deriveChunkId(content);

  assert.equal(a, b, "same content must produce the same id");
  assert.match(
    a,
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    "id should look like a version-4 UUID",
  );
  assert.notEqual(a, deriveChunkId("different chunk"), "content changes id");
});

test("resolveDocumentId prefers the source id and falls back to filename", () => {
  assert.equal(resolveDocumentId("drive-123", "notes.pdf"), "drive-123");
  assert.equal(resolveDocumentId(undefined, "notes.pdf"), "notes.pdf");
});
