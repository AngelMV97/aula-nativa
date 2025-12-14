const fs = require("fs").promises;
const path = require("path");
const Tesseract = require("tesseract.js");
const sharp = require("sharp");
const pdfPoppler = require("pdf-poppler");
const os = require("os");

/**
 * Extract text from PDF using OCR (for scanned/image-based PDFs)
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @param {string} fileName - Original file name (for temp files)
 * @returns {Promise<string>} Extracted text
 */
async function extractTextWithOCR(pdfBuffer, fileName = "document.pdf") {
  const tempDir = path.join(os.tmpdir(), `ocr-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await fs.mkdir(tempDir, { recursive: true });

  const tempPdfPath = path.join(tempDir, fileName.replace(/[^a-zA-Z0-9._-]/g, "_"));
  
  try {
    // 1. Save PDF to temp file (pdf-poppler needs file path)
    await fs.writeFile(tempPdfPath, pdfBuffer);

    // 2. Convert PDF pages to images
    const opts = {
      format: "png",
      out_dir: tempDir,
      out_prefix: "page",
      page: null, // convert all pages
    };

    await pdfPoppler.convert(tempPdfPath, opts);

    // 3. Get all generated image files
    const files = await fs.readdir(tempDir);
    const imageFiles = files
      .filter((f) => f.startsWith("page") && f.endsWith(".png"))
      .sort((a, b) => {
        // Sort by page number (page-1.png, page-2.png, etc.)
        const numA = parseInt(a.match(/\d+/)?.[0] || "0");
        const numB = parseInt(b.match(/\d+/)?.[0] || "0");
        return numA - numB;
      });

    if (imageFiles.length === 0) {
      throw new Error("No images generated from PDF");
    }

    console.log(`✓ Converted PDF to ${imageFiles.length} images`);

    // 4. Process each page with OCR (tesseract.js v4 API)
    let allText = "";
    for (let i = 0; i < imageFiles.length; i++) {
      const imagePath = path.join(tempDir, imageFiles[i]);
      
      // Optimize image for OCR (resize if too large, enhance contrast)
      const optimizedBuffer = await sharp(imagePath)
        .resize(2000, 2000, { fit: "inside", withoutEnlargement: true })
        .greyscale()
        .normalize()
        .png()
        .toBuffer();

      // Use tesseract.js v4 recognize API (simpler, more stable)
      const result = await Tesseract.recognize(
        optimizedBuffer,
        'eng',
        {
          logger: (m) => {
            // Only log progress for first and last page to avoid spam
            if ((i === 0 || i === imageFiles.length - 1) && m.status === 'recognizing text') {
              console.log(`  OCR page ${i + 1}/${imageFiles.length}: ${Math.round(m.progress * 100)}%`);
            }
          }
        }
      );

      allText += result.data.text + "\n\n";

      // Log progress every 5 pages
      if ((i + 1) % 5 === 0 || i === imageFiles.length - 1) {
        console.log(`✓ OCR processed ${i + 1}/${imageFiles.length} pages`);
      }
    }

    console.log(`✓ OCR extracted ${allText.length} chars from ${imageFiles.length} pages`);
    return allText;
  } catch (err) {
    console.error("OCR failed:", err.message || err);
    throw err;
  } finally {
    // Cleanup: delete temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (e) {
      console.warn("Failed to cleanup temp OCR files:", e.message);
    }
  }
}

/**
 * Check if PDF has enough extractable text (not scanned/image-based)
 * @param {string} text - Extracted text from pdf-parse
 * @param {number} minCharsPerPage - Minimum chars per page to consider "text-based"
 * @returns {boolean}
 */
function hasEnoughText(text, minCharsPerPage = 100) {
  return text && text.trim().length >= minCharsPerPage;
}

module.exports = {
  extractTextWithOCR,
  hasEnoughText,
};