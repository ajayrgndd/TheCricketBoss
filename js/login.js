import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// ✅ Replace with your actual Supabase project URL and anon key
const supabaseUrl = "https://iukofcmatlfhfwcechdq.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTczODQsImV4cCI6MjA2OTAzMzM4NH0.XMiE0OuLOQTlYnQoPSxwxjT3qYKzINnG6xq8f8Tb_IE";

const supabase = createClient(supabaseUrl, supabaseKey);

const form = document.getElementById("loginForm");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const remember = document.getElementById("remember").checked;

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      alert("❌ Login failed: " + error.message);
      return;
    }

    // ✅ Store session persistently based on "Remember Me"
    if (remember) {
      localStorage.setItem("supabaseSession", JSON.stringify(data.session));
    } else {
      sessionStorage.setItem("supabaseSession", JSON.stringify(data.session));
    }

    // ✅ Redirect to home page after login
    window.location.href = "home.html";
  } catch (err) {
    console.error("Login error:", err);
    alert("Something went wrong during login.");
  }
});
