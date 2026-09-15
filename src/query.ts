// Post-ingestion retrieval smoke test.
//
// Usage (after `npm start` has ingested the PDF):
//   npm run query -- "what is depron foam?"
//   npm run query -- --k 3 "material characteristics"
//
// Every query run also dumps the full response to a timestamped `.txt` file in
// the `queryResponse/` directory (git-ignored).

import { promises as fs } from "node:fs";
import path from "node:path";
import { retrieveChunks } from "./lib/retrieveChunks.js";
import type { RetrievedChunk } from "./lib/retrieveChunks.js";

const DEFAULT_QUERY = "What is Depron foam?";
const DEFAULT_K = 5;

const QUERY_RESPONSE_DIR = path.resolve(process.cwd(), "queryResponse");

function parseArgs(argv: string[]): { query: string; k: number } {
  let k = DEFAULT_K;
  const positional: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--k=")) {
      const parsed = Number.parseInt(arg.slice(4), 10);
      if (!Number.isNaN(parsed)) k = parsed;
    } else if (arg === "--k") {
      const parsed = Number.parseInt(argv[++i] ?? "", 10);
      if (!Number.isNaN(parsed)) k = parsed;
    } else {
      positional.push(arg);
    }
  }

  return { query: positional.join(" ") || DEFAULT_QUERY, k };
}

/** Format the full response as a plain-text string (console + file share this). */
function formatResponse(
  query: string,
  k: number,
  results: RetrievedChunk[],
): string {
  const lines: string[] = [`Query: "${query}" (k=${k})`, ""];

  if (results.length === 0) {
    lines.push("No results. Did you run ingestion (`npm start`) first?");
    return lines.join("\n");
  }

  results.forEach((chunk, index) => {
    lines.push(`--- Result ${index + 1} (score ${chunk.score.toFixed(4)}) ---`);
    lines.push(`source: ${chunk.source ?? "unknown"}`);
    if (chunk.headings.length > 0) {
      lines.push(`headings: ${chunk.headings.join(" > ")}`);
    }

    lines.push(chunk.content);
    lines.push("");
  });

  return lines.join("\n");
}

/** Filesystem-safe timestamp, e.g. 2026-09-13_16-45-00. */
function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(
    d.getHours(),
  )}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

const main = async () => {
  const { query, k } = parseArgs(process.argv.slice(2));

  const results = await retrieveChunks(query, k);
  const response = formatResponse(query, k, results);

  // Echo to the terminal.
  console.log(`\n${response}\n`);

  // Persist the response to queryResponse/<timestamp>.txt.
  const filePath = path.join(QUERY_RESPONSE_DIR, `query_${timestamp()}.txt`);
  await fs.mkdir(QUERY_RESPONSE_DIR, { recursive: true });
  await fs.writeFile(filePath, response, "utf8");
  console.log(`Response saved to ${filePath}`);
};

main().catch((err) => {
  console.error("Query failed:", err);
  process.exit(1);
});
