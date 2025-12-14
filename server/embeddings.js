const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const multer = require("multer");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
const { OpenAIEmbeddings } = require("@langchain/openai");
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");

// Use pdf-parse (which includes pdfjs-dist 5.4.296)
// pdf-parse exports an object with default property in v2.4.5
const pdfParseModule = require("pdf-parse");
const pdfParse = pdfParseModule.default || pdfParseModule;
const mammoth = require("mammoth");

// OCR utilities
const { extractTextWithOCR, hasEnoughText } = require("./utils/ocrUtils");

// Environment variable checks
const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error("Missing required env vars:", missing.join(", "));
  process.exit(1);
}

const USE_MOCK = process.env.MOCK_EMBEDDINGS === "true";
if (!USE_MOCK && !process.env.OPENAI_API_KEY) {
  console.warn("OPENAI_API_KEY not set and MOCK_EMBEDDINGS!='true'");
}

const app = express();
app.use(cors({ origin: ["http://localhost:5173", "http://127.0.0.1:5173"] }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 200 * 1024 * 1024 } });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// mount analytics router (statistics endpoints)
const analyticsRouter = require("./analytics")(supabase);
app.use("/api", analyticsRouter);

// mount grades router (grades management endpoints)
const gradesRouter = require("./grades")(supabase);
app.use("/api/grades", gradesRouter);

// Initialize embeddings
let embeddings = null;
if (!USE_MOCK && process.env.OPENAI_API_KEY) {
  embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY,
    model: "text-embedding-3-small",
  });
}

// LangChain text splitter
const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
  separators: ["\n\n", "\n", " ", ""],
});

// mount student assistant router
try {
  const studentRouter = require("./student")(supabase, embeddings, { useMock: USE_MOCK });
  app.use("/api", studentRouter);
} catch (e) {
  console.warn("Could not mount student router:", e);
}

// 🔔 SSE Status tracking (in-memory; use Redis for multi-instance)
const statusClients = {}; // { [materialId]: [res, ...] }
const statusMap = {};     // { [materialId]: { current, total, error } }

function sendStatus(materialId) {
  const s = statusMap[materialId] || { current: 0, total: 0, error: null };
  const clients = statusClients[materialId] || [];
  const payload = JSON.stringify(s);
  for (const res of clients.slice()) {
    try {
      res.write(`event: status\n`);
      res.write(`data: ${payload}\n\n`);
    } catch (err) {
      const idx = clients.indexOf(res);
      if (idx !== -1) clients.splice(idx, 1);
    }
  }
}

// cleanup helper: remove status and close SSE clients after delay
function cleanupStatusEntry(materialId, delay = 5000) {
  setTimeout(() => {
    const clients = statusClients[materialId] || [];
    for (const r of clients.slice()) {
      try {
        r.end();
      } catch (e) {}
    }
    delete statusClients[materialId];
    delete statusMap[materialId];
  }, delay);
}

// Health check endpoint for deployment platforms
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
    mockEmbeddings: USE_MOCK
  });
});

// SSE endpoint: stream progress for a material
app.get("/api/process-status/:materialId", (req, res) => {
  const { materialId } = req.params;
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  statusClients[materialId] = statusClients[materialId] || [];
  statusClients[materialId].push(res);

  // send immediate snapshot if exists
  if (statusMap[materialId]) {
    res.write(`event: status\n`);
    res.write(`data: ${JSON.stringify(statusMap[materialId])}\n\n`);
  }

  req.on("close", () => {
    const clients = statusClients[materialId] || [];
    const idx = clients.indexOf(res);
    if (idx !== -1) clients.splice(idx, 1);
  });
});

// Extract text from file
async function extractText(file) {
  const ext = (file.originalname || "").split(".").pop().toLowerCase();

  if (ext === "txt") {
    return file.buffer.toString("utf-8");
  }

  if (ext === "pdf") {
    try {
      // First try: standard text extraction
      const data = await pdfParse(file.buffer);
      const text = data.text || "";
      
      // Check if we got enough text (at least 100 chars per page on average)
      const avgCharsPerPage = text.length / (data.numpages || 1);
      
      if (hasEnoughText(text) && avgCharsPerPage >= 100) {
        console.log(`✓ Extracted ${text.length} chars from PDF (text-based)`);
        return text;
      }

      // Fallback to OCR if insufficient text
      console.log(`⚠️ PDF has minimal text (${text.length} chars), using OCR...`);
      const ocrText = await extractTextWithOCR(file.buffer, file.originalname);
      
      if (!ocrText || ocrText.trim().length < 50) {
        throw new Error("OCR failed to extract meaningful text");
      }
      
      return ocrText;
    } catch (err) {
      console.error("PDF extraction failed:", err && err.message ? err.message : err);
      throw err;
    }
  }

  if (ext === "docx") {
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    return result.value || "";
  }

  throw new Error("Unsupported file format");
}

// Process single material (helper)
async function processMaterial(file, materialId) {
  console.log(`Processing: ${file.originalname} for ${materialId}`);

  const text = await extractText(file);
  if (!text || text.trim().length < 30) {
    // report error to clients and schedule cleanup
    statusMap[materialId] = { current: 0, total: 0, error: "No useful text extracted" };
    sendStatus(materialId);
    cleanupStatusEntry(materialId, 5000);
    throw new Error("No useful text extracted");
  }

  const chunks = await textSplitter.splitText(text);
  console.log(`✓ Split into ${chunks.length} chunks`);

  // Initialize status
  statusMap[materialId] = { current: 0, total: chunks.length, error: null };
  sendStatus(materialId);

  let inserted = 0;
  const updateInterval = chunks.length > 1000 ? 50 : 10;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    let embedding;
    if (USE_MOCK) {
      embedding = new Array(1536).fill(0);
    } else {
      if (!embeddings) {
        // report error and cleanup
        statusMap[materialId].error = "Embeddings not initialized";
        sendStatus(materialId);
        cleanupStatusEntry(materialId, 5000);
        throw new Error("Embeddings not initialized");
      }
      embedding = await embeddings.embedQuery(chunk);
    }

    const { error } = await supabase.from("material_embeddings").insert({
      material_id: materialId,
      content: chunk,
      embedding,
    });

    if (error) {
      statusMap[materialId].error = error.message || "Supabase insert error";
      sendStatus(materialId);
      cleanupStatusEntry(materialId, 5000);
      throw error;
    }

    inserted++;

    // Update progress every N chunks AND on last chunk (N depends on file size)
    if ((i + 1) % updateInterval === 0 || i === chunks.length - 1) {
      if (statusMap[materialId]) {
        statusMap[materialId].error = null;
        statusMap[materialId].current = inserted;
        statusMap[materialId].total = chunks.length;
        sendStatus(materialId);
      }
      // Only log every 100 chunks for large files to avoid console spam
      if ((i + 1) % 100 === 0 || i === chunks.length - 1 || chunks.length < 100) {
        console.log(`✓ Inserted ${i + 1}/${chunks.length}`);
      }
    }
  }

  return inserted;
}

// Single file upload
app.post("/api/process-material", upload.single("file"), async (req, res) => {
  try {
    const { materialId, subject, grade } = req.body;
    if (!req.file || !materialId) return res.status(400).send("Missing file or materialId");

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(materialId)) return res.status(400).send("Invalid materialId");

    const inserted = await processMaterial(req.file, materialId);

    // Update material status to "processed" with subject and grade
    await supabase
      .from("materials")
      .update({ 
        status: "processed",
        subject: subject || null,
        grade: grade ? parseInt(grade) : null
      })
      .eq("id", materialId);

    // Send final done event to SSE clients
    const clients = statusClients[materialId] || [];
    for (const r of clients.slice()) {
      try {
        r.write(`event: done\ndata: ${JSON.stringify({ ok: true, inserted })}\n\n`);
        r.end();
      } catch (e) {}
    }
    cleanupStatusEntry(materialId, 5000);

    res.json({ ok: true, inserted });
  } catch (err) {
    console.error("Error:", err && err.message ? err.message : err);
    const materialId = req.body && req.body.materialId;
    
    // Update material status to "failed" on error
    if (materialId) {
      await supabase
        .from("materials")
        .update({ status: "failed" })
        .eq("id", materialId);
    }

    if (materialId && statusMap[materialId]) {
      statusMap[materialId].error = err && err.message ? err.message : String(err);
      sendStatus(materialId);
      cleanupStatusEntry(materialId, 5000);
    }
    res.status(500).send(err && err.message ? err.message : "Server error");
  }
});

// Multi-file upload endpoint
app.post("/api/process-materials", upload.array("files"), async (req, res) => {
  try {
    const files = req.files;

    // Debug
    console.log("req.body keys:", Object.keys(req.body));
    console.log("req.files count:", files ? files.length : 0);

    // Robust materialIds parsing
    let materialIds = [];

    // 1) If client sent materialIds as a JSON string (e.g. "materialIds": "[\"id1\",\"id2\"]")
    if (req.body && typeof req.body.materialIds === "string") {
      try {
        const parsed = JSON.parse(req.body.materialIds);
        if (Array.isArray(parsed)) materialIds = parsed.slice();
        else if (typeof parsed === "string") materialIds = [parsed];
      } catch (e) {
        // not JSON: maybe comma separated
        materialIds = req.body.materialIds.split(",").map((s) => s.trim()).filter(Boolean);
      }
    }

    // 2) If client sent repeated fields materialIds[]=id (some clients produce array)
    if ((req.body && Array.isArray(req.body.materialIds)) && materialIds.length === 0) {
      materialIds = req.body.materialIds.slice();
    }

    // 3) If client sent materialIds[0], materialIds[1], ...
    if ((!materialIds || materialIds.length === 0) && req.body && typeof req.body === "object") {
      let idx = 0;
      while (req.body[`materialIds[${idx}]`]) {
        materialIds.push(req.body[`materialIds[${idx}]`]);
        idx++;
      }
    }

    // 4) As a last resort, if there's a plain single field named materialId
    if ((materialIds.length === 0) && req.body && req.body.materialId) {
      materialIds = [req.body.materialId];
    }

    console.log(`Received ${files ? files.length : 0} files and ${materialIds.length} materialIds`);

    if (!files || !files.length) {
      return res.status(400).send("Missing files");
    }

    if (!materialIds || !materialIds.length) {
      return res.status(400).send("Missing materialIds");
    }

    if (files.length !== materialIds.length) {
      console.error(`Files: ${files.length}, materialIds: ${materialIds.length}`);
      return res.status(400).send("Files and materialIds count mismatch");
    }

    const results = [];
    for (let i = 0; i < files.length; i++) {
      try {
        const file = files[i];
        const materialId = materialIds[i];

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(materialId)) {
          results.push({ materialId, ok: false, error: "Invalid materialId" });
          continue;
        }

        const inserted = await processMaterial(file, materialId);

        // Update material status to "processed" AND subject
        await supabase
          .from("materials")
          .update({ 
            status: "processed",
            subject: req.body.subject || null,
            grade: req.body.grade ? parseInt(req.body.grade) : null
          })
          .eq("id", materialId);

        // Send final done event
        const clients = statusClients[materialId] || [];
        for (const r of clients.slice()) {
          try {
            r.write(`event: done\ndata: ${JSON.stringify({ ok: true, inserted })}\n\n`);
            r.end();
          } catch (e) {}
        }
        cleanupStatusEntry(materialId, 5000);

        results.push({ materialId, ok: true, inserted });
      } catch (err) {
        const materialId = (req.body && Array.isArray(req.body.materialIds) && req.body.materialIds[i]) || null;
        console.error(`Error processing material ${materialId}:`, err && err.message ? err.message : err);
        
        // Update material status to "failed" on error
        if (materialId) {
          await supabase
            .from("materials")
            .update({ status: "failed" })
            .eq("id", materialId);
        }

        if (materialId && statusMap[materialId]) {
          statusMap[materialId].error = err && err.message ? err.message : String(err);
          sendStatus(materialId);
          cleanupStatusEntry(materialId, 5000);
        }
        results.push({ materialId, ok: false, error: err && err.message ? err.message : String(err) });
      }
    }

    res.json({ ok: true, results });
  } catch (err) {
    console.error("Error:", err && err.message ? err.message : err);
    res.status(500).send(err && err.message ? err.message : "Server error");
  }
});

// Get all materials for current teacher
app.get("/api/materials", async (req, res) => {
  try {
    // TODO: Add authentication and filter by teacher_id
    const { data, error } = await supabase
      .from("materials")
      .select("id, file_name, uploaded_at, status")
      .order("uploaded_at", { ascending: false });

    if (error) throw error;

    // Get fragment counts for each material
    const materialsWithCounts = await Promise.all(
      (data || []).map(async (material) => {
        const { count } = await supabase
          .from("material_embeddings")
          .select("*", { count: "exact", head: true })
          .eq("material_id", material.id);

        return {
          ...material,
          fragment_count: count || 0,
        };
      })
    );

    res.json({ ok: true, materials: materialsWithCounts });
  } catch (err) {
    console.error("Error fetching materials:", err);
    res.status(500).send(err.message || "Server error");
  }
});

// GET /api/materials/public - accessible by authenticated teachers & students
// Returns materials with subject filtering; teachers get edit actions, students get view/download
app.get("/api/materials/public", async (req, res) => {
  try {
    // TODO: add requireAuth middleware once client auth fixed
    const { subject, teacherId, grade } = req.query;

    let query = supabase
      .from("materials")
      .select("id, file_name, uploaded_at, status, subject, teacher_id, storage_path, grade")
      .order("uploaded_at", { ascending: false });

    if (subject) query = query.eq("subject", subject);
    if (teacherId) query = query.eq("teacher_id", teacherId);

    if (grade) {
      const gradeInt = parseInt(grade);
      // Show materials for this grade OR materials available to all grades (grade = NULL)
      query = query.or(`grade.eq.${gradeInt},grade.is.null`);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Get fragment counts
    const materialsWithCounts = await Promise.all(
      (data || []).map(async (material) => {
        const { count } = await supabase
          .from("material_embeddings")
          .select("*", { count: "exact", head: true })
          .eq("material_id", material.id);

        return {
          ...material,
          fragment_count: count || 0,
        };
      })
    );

    res.json({ ok: true, materials: materialsWithCounts });
  } catch (err) {
    console.error("Error fetching public materials:", err);
    res.status(500).send(err.message || "Server error");
  }
});

// Delete material and its embeddings
app.delete("/api/materials/:materialId", async (req, res) => {
  try {
    const { materialId } = req.params;

    // Validate UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(materialId)) {
      return res.status(400).send("Invalid materialId");
    }

    // Delete embeddings first (foreign key constraint)
    const { error: embError } = await supabase
      .from("material_embeddings")
      .delete()
      .eq("material_id", materialId);

    if (embError) throw embError;

    // Delete material record
    const { error: matError } = await supabase
      .from("materials")
      .delete()
      .eq("id", materialId);

    if (matError) throw matError;

    res.json({ ok: true, message: "Material deleted successfully" });
  } catch (err) {
    console.error("Error deleting material:", err);
    res.status(500).send(err.message || "Server error");
  }
});

// Reprocess failed material
app.post("/api/materials/:materialId/reprocess", async (req, res) => {
  try {
    const { materialId } = req.params;

    // Validate UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(materialId)) {
      return res.status(400).send("Invalid materialId");
    }

    // Get material info including storage_path
    const { data: material, error: fetchError } = await supabase
      .from("materials")
      .select("*")
      .eq("id", materialId)
      .single();

    if (fetchError || !material) {
      return res.status(404).send("Material not found");
    }

    // Check if material has storage_path
    if (!material.storage_path) {
      return res.status(400).send("Material does not have original file stored (uploaded before storage_path feature)");
    }

    // Update status to processing
    await supabase
      .from("materials")
      .update({ status: "processing" })
      .eq("id", materialId);

    // Initialize status for SSE
    statusMap[materialId] = { current: 0, total: 0, error: null };
    sendStatus(materialId);

    // Download file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("materials")
      .download(material.storage_path);

    if (downloadError) {
      console.error("Error downloading file from storage:", downloadError);
      statusMap[materialId] = { current: 0, total: 0, error: "Failed to download file from storage" };
      sendStatus(materialId);
      await supabase
        .from("materials")
        .update({ status: "failed" })
        .eq("id", materialId);
      return res.status(500).send("Failed to download file from storage");
    }

    // Convert Blob to Buffer
    const buffer = Buffer.from(await fileData.arrayBuffer());

    // Create a file-like object for processMaterial
    const fileObject = {
      originalname: material.file_name,
      buffer: buffer,
    };

    // Delete existing embeddings
    const { error: deleteError } = await supabase
      .from("material_embeddings")
      .delete()
      .eq("material_id", materialId);

    if (deleteError) {
      console.error("Error deleting old embeddings:", deleteError);
      statusMap[materialId] = { current: 0, total: 0, error: "Failed to delete old embeddings" };
      sendStatus(materialId);
      await supabase
        .from("materials")
        .update({ status: "failed" })
        .eq("id", materialId);
      return res.status(500).send("Failed to delete old embeddings");
    }

    // Process the material (async - don't wait for completion)
    processMaterial(fileObject, materialId)
      .then(async (inserted) => {
        // Update status to processed
        await supabase
          .from("materials")
          .update({ status: "processed" })
          .eq("id", materialId);

        // Send final done event
        const clients = statusClients[materialId] || [];
        for (const r of clients.slice()) {
          try {
            r.write(`event: done\ndata: ${JSON.stringify({ ok: true, inserted })}\n\n`);
            r.end();
          } catch (e) {}
        }
        cleanupStatusEntry(materialId, 5000);
      })
      .catch(async (err) => {
        console.error("Reprocessing error:", err);
        await supabase
          .from("materials")
          .update({ status: "failed" })
          .eq("id", materialId);
        
        if (statusMap[materialId]) {
          statusMap[materialId].error = err.message || "Reprocessing failed";
          sendStatus(materialId);
          cleanupStatusEntry(materialId, 5000);
        }
      });

    // Return immediately (processing happens in background)
    res.json({ ok: true, message: "Reprocessing started" });
  } catch (err) {
    console.error("Error reprocessing material:", err);
    res.status(500).send(err.message || "Server error");
  }
});

// Serve static build
const clientDistPath = path.join(__dirname, "../client/dist");
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get("*", (req, res) => res.sendFile(path.join(clientDistPath, "index.html")));
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🚀 Server listening on ${PORT}`));