import sys

import pymupdf4llm


def pdf_to_md(pdf_filename: str) -> str:
    """Convert a PDF file to Markdown text and print it to stdout.

    Args:
        pdf_filename: Path to the PDF file to convert.

    Returns:
        The generated Markdown text (also written to stdout).
    """
    md_text = pymupdf4llm.to_markdown(
        pdf_filename,
        ignore_graphics=True,
        ignore_images=True,
    )
    print(md_text)
    return md_text


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: python pdftomd.py <pdf_filename>", file=sys.stderr)
        sys.exit(1)
    pdf_to_md(sys.argv[1])


if __name__ == "__main__":
    main()

