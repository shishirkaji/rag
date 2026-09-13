import { test } from "node:test";
import assert from "node:assert/strict";
import { getAction } from "../lib/getAction.js";
import type { ActionInput } from "../lib/getAction.js";

function input(overrides: Partial<ActionInput> = {}): ActionInput {
  return {
    documentId: "notes.pdf",
    documentIdExists: false,
    fileExistsAtSource: true,
    filename: "notes.pdf",
    fileHash: "hash-a",
    hashFound: false,
    ...overrides,
  };
}

test("DELETE when the source file is gone", () => {
  assert.equal(getAction(input({ fileExistsAtSource: false })), "DELETE");
});

test("SKIP when a known document's content is unchanged", () => {
  assert.equal(
    getAction(
      input({
        documentIdExists: true,
        existingHash: "hash-a",
        existingFilename: "notes.pdf",
        hashFound: true,
      }),
    ),
    "SKIP",
  );
});

test("RENAME when content is unchanged but the filename moved", () => {
  assert.equal(
    getAction(
      input({
        documentIdExists: true,
        existingHash: "hash-a",
        existingFilename: "old-name.pdf",
        filename: "new-name.pdf",
        hashFound: true,
      }),
    ),
    "RENAME",
  );
});

test("REINDEX when a known document's content changed", () => {
  assert.equal(
    getAction(
      input({
        documentIdExists: true,
        existingHash: "hash-old",
        fileHash: "hash-new",
        hashFound: false,
      }),
    ),
    "REINDEX",
  );
});

test("SHARE when unknown content is already indexed", () => {
  assert.equal(getAction(input({ hashFound: true })), "SHARE");
});

test("INGEST for brand-new content", () => {
  assert.equal(getAction(input()), "INGEST");
});
