export interface HeaderContext {
  "Header 1"?: string;
  "Header 2"?: string;
  "Header 3"?: string;
}

export interface Section {
  headers: HeaderContext;
  content: string;
}

// Matches ATX-style H1, H2 and H3 headings (e.g. "# Title").
const HEADING_REGEX = /^(#{1,3})\s+(.+)$/;

/**
 * Split a Markdown document into sections on H1-H3 headings, tracking the
 * heading hierarchy that is active for each section. This is a lightweight
 * replacement for the (now removed) `MarkdownHeaderTextSplitter`.
 */
export function splitMarkdownByHeadings(markdown: string): Section[] {
  const lines = markdown.split("\n");
  const sections: Section[] = [];
  let headers: HeaderContext = {};
  let buffer: string[] = [];

  const flush = () => {
    const content = buffer.join("\n").trim();
    if (content) {
      sections.push({ headers: { ...headers }, content });
    }
    buffer = [];
  };

  for (const line of lines) {
    const match = line.match(HEADING_REGEX);
    if (match) {
      flush();
      const level = match[1].length;
      const title = match[2].trim();
      if (level === 1) {
        headers = { "Header 1": title };
      } else if (level === 2) {
        headers = { ...headers, "Header 2": title };
        delete headers["Header 3"];
      } else {
        headers = { ...headers, "Header 3": title };
      }
    }
    buffer.push(line);
  }
  flush();

  return sections;
}
