import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabaseUrl = "https://iukofcmatlfhfwcechdq.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTczODQsImV4cCI6MjA2OTAzMzM4NH0.XMiE0OuLOQTlYnQoPSxwxjT3qYKzINnG6xq8f8Tb_IE";

const supabase = createClient(supabaseUrl, supabaseKey);

const form = document.getElementById("loginForm");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const remember = document.getElementById("remember").checked;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    alert("❌ Login failed: " + error.message);
    return;
  }

  const user = data.user;

  // ✅ Store session
  if (remember) {
    localStorage.setItem("supabaseSession", JSON.stringify(data.session));
  } else {
    sessionStorage.setItem("supabaseSession", JSON.stringify(data.session));
  }

  // ✅ Check profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (profile && !profileError) {
    window.location.href = "home.html";
  } else {
    window.location.href = "profile-setup.html";
  }
});
