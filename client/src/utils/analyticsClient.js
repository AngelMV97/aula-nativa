// client/src/utils/analyticsClient.js
import { supabase } from "../supabaseClient";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

async function getAuthHeader() {
  try {
    if (supabase.auth && typeof supabase.auth.getSession === "function") {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.warn("getSession error:", error);
        return {};
      }
      const token = data?.session?.access_token;
      if (token && token.length > 20) {
        return { Authorization: `Bearer ${token}` };
      }
    }
  } catch (err) {
    console.warn("getAuthHeader error:", err);
  }
  return {};
}

export async function logEvent({ studentId, teacherId, materialId, actionType, metadata, success, score, durationSeconds }) {
  try {
    const authHeader = await getAuthHeader();
    if (!authHeader.Authorization) {
      console.warn("logEvent: no auth token available, skipping");
      return { ok: false, error: "No auth token" };
    }

    const resp = await fetch(`${API_BASE}/api/statistics/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader },
      body: JSON.stringify({
        studentId, teacherId, materialId, actionType, metadata, success, score, durationSeconds
      }),
    });
    if (!resp.ok) {
      const txt = await resp.text();
      console.warn("logEvent failed:", resp.status, txt);
      return { ok: false, error: txt };
    }
    return { ok: true };
  } catch (err) {
    console.warn("logEvent error:", err);
    return { ok: false, error: String(err) };
  }
}