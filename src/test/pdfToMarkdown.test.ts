import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { pdfToMarkdown } from "../lib/pdfToMarkdown.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = path.resolve(
  __dirname,
  "fixtures/depron_micro_aerodynamics.pdf",
);

test("converts a PDF to markdown with the full body content", async () => {
  const markdown = await pdfToMarkdown(FIXTURE_PATH);

  // Regression guard: the converter must extract the body text, not just the
  // page footer ("RAG Evaluation Corpus — Depron Micro-Aerodynamics Page N").
  assert.ok(
    markdown.includes("Extruded polystyrene foam"),
    "expected body text to be present in the output",
  );

  // Headings should be preserved so the structure-aware chunker can use them.
  assert.ok(
    markdown.includes("1. Introduction & Material Characteristics"),
    "expected a section heading to be present in the output",
  );
  assert.ok(markdown.includes("# "), "expected at least one markdown heading");

  // The full document is ~6k characters; anything near the footer-only size
  // (~200 chars) means the conversion dropped the body again.
  assert.ok(
    markdown.length > 5000,
    `expected substantial content, got ${markdown.length} chars`,
  );
});

test("rejects when the PDF file does not exist", async () => {
  const missing = path.resolve(__dirname, "fixtures/does-not-exist.pdf");

  await assert.rejects(
    () => pdfToMarkdown(missing),
    /Error when parsing pdf to md/,
  );
});
