import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = createClient(
  "https://iukofcmatlfhfwcechdq.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTczODQsImV4cCI6MjA2OTAzMzM4NH0.XMiE0OuLOQTlYnQoPSxwxjT3qYKzINnG6xq8f8Tb_IE"
);

document.getElementById("resetForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const newPassword = document.getElementById("newPassword").value;
  const messageDiv = document.getElementById("message");

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    messageDiv.textContent = "❌ Session invalid or expired.";
    return;
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword
  });

  if (error) {
    messageDiv.textContent = `❌ ${error.message}`;
  } else {
    messageDiv.textContent = "✅ Password updated successfully!";
    setTimeout(() => window.location.href = "login.html", 2000);
  }
});
