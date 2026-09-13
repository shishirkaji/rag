// import pdf
// convert into md
// structure aware chunking
// make sure the chunks have appropriate metadata
// embed chunks using ai model
// store into vector db.

import { Document } from "@langchain/core/documents";
import { createStructuredChunks } from "./lib/structureAwareChunker.js";
import { pdfToMarkdown } from "./lib/pdfToMarkdown.js";

export const main = async () => {
  const pdfSource = "src/data/depron_micro_aerodynamics.pdf";
  const knowledgeMd = await pdfToMarkdown(pdfSource);

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
