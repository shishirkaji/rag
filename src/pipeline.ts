// import pdf
// convert into md
// structure aware chunking
// make sure the chunks have appropriate metadata
// embed chunks using ai model
// store into vector db.

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Document } from "@langchain/core/documents";
import { createStructuredChunks } from "./lib/structureAwareChunker.js";

const execFileAsync = promisify(execFile);

const pdfToMarkdow = async (fileName: string): Promise<string> => {
  const { stdout, stderr } = await execFileAsync("python3", [
    "src/python/pdftomd.py",
    fileName,
  ]);
  if (stderr) {
    throw Error("Error when parsing pdf to md \n" + stderr);
  }

  return stdout;
};

export const main = async () => {
  const pdfSource = "src/data/depron_micro_aerodynamics.pdf";
  const knowledgeMd = await pdfToMarkdow(pdfSource);

  const doc = new Document({
    pageContent: knowledgeMd,
    metadata: { source: pdfSource },
  });

  const chunks = await createStructuredChunks(doc, {
    chunkSize: 500,
    chunkOverlap: 50,
  });

  console.log(chunks)
};
