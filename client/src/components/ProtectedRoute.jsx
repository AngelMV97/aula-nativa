import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

function ProtectedRoute({ children, allowedRole }) {
    const [loading, setLoading] = useState(true);
    const [authorized, setAuthorized] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        async function checkAuth() {
            try {
                const { data: { user }, error: userError } = await supabase.auth.getUser();

                if (userError || !user) {
                    console.error("Auth check failed:", userError);
                    navigate("/");
                    return;
                }

                // If no allowedRole specified, allow any authenticated user
                if (!allowedRole) {
                    setAuthorized(true);
                    setLoading(false);
                    return;
                }

                // Check role from profiles table (more reliable than metadata)
                const { data: profile, error: profileError } = await supabase
                    .from("profiles")
                    .select("role")
                    .eq("id", user.id)
                    .single();

                // ✅ If profile doesn't exist, try to create it
                if (profileError?.code === 'PGRST116') { // No rows returned
                    console.warn("Profile not found, attempting to create...");
                    
                    const role = user.user_metadata?.role || 'student';
                    const grade = user.user_metadata?.grade || null;
                    
                    const { error: insertError } = await supabase
                        .from("profiles")
                        .insert({
                            id: user.id,
                            email: user.email,
                            role: role,
                            grade: grade
                        });
                    
                    if (insertError) {
                        console.error("Failed to create profile:", insertError);
                        navigate("/");
                        return;
                    }
                    
                    // Profile created, check if role matches
                    // ✅ Handle both string and array of roles
                    const isAllowed = Array.isArray(allowedRole) 
                        ? allowedRole.includes(role)
                        : (role === allowedRole || !allowedRole);
                    
                    if (isAllowed) {
                        setAuthorized(true);
                    } else {
                        navigate("/");
                    }
                } else if (profileError) {
                    console.error("Profile fetch error:", profileError);
                    navigate("/");
                    return;
                } else {
                    // Profile exists, check role
                    const userRole = profile?.role || user?.user_metadata?.role;

                    // ✅ Handle both string and array of roles
                    let isAllowed = false;
                    if (Array.isArray(allowedRole)) {
                        isAllowed = allowedRole.includes(userRole);
                    } else {
                        isAllowed = userRole === allowedRole;
                    }

                    if (isAllowed) {
                        setAuthorized(true);
                    } else {
                        console.warn();
                        navigate("/");
                    }
                }

                setLoading(false);
            } catch (err) {
                console.error("ProtectedRoute error:", err);
                navigate("/");
            }
        }

        checkAuth();
    }, [allowedRole, navigate]);

    if (loading) return <p style={{ padding: "2rem" }}>Cargando...</p>;

    return authorized ? children : null;
}

export default ProtectedRoute;