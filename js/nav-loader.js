import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = 'https://iukofcmatlfhfwcechdq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTczODQsImV4cCI6MjA2OTAzMzM4NH0.XMiE0OuLOQTlYnQoPSxwxjT3qYKzINnG6xq8f8Tb_IE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function loadNav() {
  document.body.insertAdjacentHTML('afterbegin', await (await fetch('/components/top-nav.html')).text());
  document.body.insertAdjacentHTML('beforeend', await (await fetch('/components/bottom-nav.html')).text());

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = 'signin.html';
    return;
  }

  const userId = session.user.id;

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, xp, coins, cash')
    .eq('id', userId)
    .single();

  if (profile) {
    document.getElementById('nav-username').textContent = profile.username || 'Manager';
    document.getElementById('nav-xp').textContent = `XP: ${profile.xp || 0}`;
    document.getElementById('nav-coins').textContent = `Coins: ${profile.coins || 0}`;
    document.getElementById('nav-cash').textContent = `Cash: ${profile.cash || 0}`;
  }
}

loadNav();
