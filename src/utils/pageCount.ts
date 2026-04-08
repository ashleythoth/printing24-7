export async function getPageCount(file: File): Promise<number> {
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "pdf") {
    const { PDFDocument } = await import("pdf-lib");
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    return pdf.getPageCount();
  }

  if (ext === "docx") {
    const mammoth = await import("mammoth");
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    // Estimate pages: ~500 words per page
    const wordCount = result.value.trim().split(/\s+/).length;
    return Math.max(1, Math.ceil(wordCount / 500));
  }

  // JPG, PNG, etc. — single page
  return 1;
}