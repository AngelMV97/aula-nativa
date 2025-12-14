import OpenAI from "openai";
import { supabase } from "../supabaseClient";

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY
});

// 🔹 Split text into smaller chunks for embedding
function chunkText(text, size = 800) {
  const chunks = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
}

// 🔹 Create embeddings and store them in Supabase
export async function embedAndStoreText(materialId, text) {
  const chunks = chunkText(text);

  for (const chunk of chunks) {
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: chunk
    });

    const [{ embedding }] = embeddingResponse.data;

    const { error } = await supabase.from("material_embeddings").insert({
      material_id: materialId,
      chunk_text: chunk,
      embedding
    });

    if (error) {
      console.error("❌ Error storing embedding:", error);
    }
  }

  console.log("✅ Embeddings stored for material:", materialId);
}
