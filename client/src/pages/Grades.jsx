// client/src/pages/Grades.jsx
import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import Navbar from "../components/Navbar";
import GradesManager from "../components/GradesManager";

export default function Grades() {
  const [currentTeacherId, setCurrentTeacherId] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function loadUserId() {
      try {
        const getUser = supabase.auth && supabase.auth.getUser;
        if (typeof getUser === "function") {
          const { data, error } = await supabase.auth.getUser();
          if (!error && data && data.user && mounted) {
            setCurrentTeacherId(data.user.id);
            return;
          }
        }

        if (supabase.auth && typeof supabase.auth.user === "function") {
          const user = supabase.auth.user();
          if (user && mounted) {
            setCurrentTeacherId(user.id);
            return;
          }
        }

        if (supabase.auth && typeof supabase.auth.getSession === "function") {
          const { data: sessionData } = await supabase.auth.getSession();
          const user = sessionData?.session?.user ?? null;
          if (user && mounted) setCurrentTeacherId(user.id);
        }
      } catch (err) {
        console.warn("Could not load supabase user id:", err);
      }
    }
    loadUserId();
    return () => { mounted = false; };
  }, []);

  return (
    <>
      <Navbar />    
      <GradesManager teacherId={currentTeacherId} />
    </>
  );
}