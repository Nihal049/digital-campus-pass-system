/**
 * Chunker module: Splits documents into semantic chunks with overlap.
 * Preserves section headers and paragraph structure.
 */

function cleanText(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .trim();
}

function chunkDocument(rawText, options = {}) {
  const {
    maxChunkSize = 600, // approximate characters per chunk
    chunkOverlap = 120,  // character overlap between adjacent chunks
  } = options;

  const text = cleanText(rawText);
  if (!text) return [];

  // Split by double newlines (paragraphs) or markdown headings
  const paragraphs = text.split(/\n\s*\n/);
  const chunks = [];
  let currentChunk = '';
  let currentSection = 'General Campus Guidelines';

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    // Detect section headers (e.g. "Section 1:", "## Header", "Policy:")
    if (/^(#+|\b(Section|Rule|Policy|Chapter|Timings|Guidelines|Protocol|Article)\b[\s\d:.-])/i.test(trimmed) && trimmed.length < 100) {
      currentSection = trimmed.replace(/^#+\s*/, '');
    }

    if ((currentChunk + '\n\n' + trimmed).length <= maxChunkSize) {
      currentChunk = currentChunk ? currentChunk + '\n\n' + trimmed : trimmed;
    } else {
      if (currentChunk) {
        chunks.push({
          content: currentChunk,
          sectionTitle: currentSection,
          tokenCount: Math.ceil(currentChunk.length / 4)
        });

        // Compute overlap from end of current chunk
        const words = currentChunk.split(/\s+/);
        const overlapWords = words.slice(-Math.max(10, Math.floor(chunkOverlap / 6))).join(' ');
        currentChunk = overlapWords + '\n\n' + trimmed;
      } else {
        // Single paragraph larger than maxChunkSize
        chunks.push({
          content: trimmed,
          sectionTitle: currentSection,
          tokenCount: Math.ceil(trimmed.length / 4)
        });
        currentChunk = '';
      }
    }
  }

  if (currentChunk.trim()) {
    chunks.push({
      content: currentChunk.trim(),
      sectionTitle: currentSection,
      tokenCount: Math.ceil(currentChunk.length / 4)
    });
  }

  return chunks;
}

module.exports = {
  cleanText,
  chunkDocument
};
