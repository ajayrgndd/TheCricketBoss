import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = createClient("https://iukofcmatlfhfwcechdq.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTczODQsImV4cCI6MjA2OTAzMzM4NH0.XMiE0OuLOQTlYnQoPSxwxjT3qYKzINnG6xq8f8Tb_IE");

// 🔐 Handle Login
document.getElementById("loginForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return alert(error.message);
  window.location.href = "confirm.html";
});

// 🆕 Handle Signup
document.getElementById("signupForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("signupEmail").value;
  const password = document.getElementById("signupPassword").value;

  const { error } = await supabase.auth.signUp({ email, password });
  if (error) return alert(error.message);
  alert("Check your email to confirm!");
});

// 🔑 Forgot Password
document.getElementById("forgotForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("forgotEmail").value;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: "https://your-site.netlify.app/reset.html", // optional
  });
  if (error) return alert(error.message);
  alert("Check your inbox to reset password.");
});
