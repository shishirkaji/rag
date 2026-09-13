import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import path from "node:path";

const execFileAsync = promisify(execFile);

// Resolve the Python helper relative to this module (not the current working
// directory) so the function behaves the same no matter where the process is
// launched from (e.g. `npm start`, `node --test`, or a CI runner).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PYTHON_SCRIPT = path.resolve(__dirname, "../python/pdftomd.py");

/**
 * Convert a PDF file to Markdown by shelling out to the Python helper script
 * (`src/python/pdftomd.py`), which uses `pymupdf4llm`.
 *
 * @param pdfPath Path to the source PDF file.
 * @returns The generated Markdown text.
 * @throws If the Python helper fails or writes to stderr.
 */
export async function pdfToMarkdown(pdfPath: string): Promise<string> {
  let stdout = "";
  let stderr = "";

  try {
    ({ stdout, stderr } = await execFileAsync("python3", [
      PYTHON_SCRIPT,
      pdfPath,
    ]));
  } catch (err) {
    // `execFile` rejects when the child exits non-zero; surface its stderr.
    stderr = (err as { stderr?: string })?.stderr ?? String(err);
  }

  if (stderr) {
    throw new Error(`Error when parsing pdf to md\n${stderr}`);
  }

  return stdout;
}
