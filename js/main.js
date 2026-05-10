// ── Stats laden ────────────────────────────────────────────────

async function loadStats() {
  try {
    const res = await fetch(`${BOT_API_URL}/api/stats`, { signal: AbortSignal.timeout(5000) });
    const data = await res.json();

    document.getElementById('stat-servers').textContent = data.guilds ?? '—';
    document.getElementById('stat-users').textContent = data.users ?? '—';
    document.getElementById('stat-status').textContent = data.online ? '●' : '○';
    document.getElementById('stat-status').style.color = data.online ? '#22c55e' : '#ef4444';
  } catch {
    document.getElementById('stat-servers').textContent = '—';
    document.getElementById('stat-users').textContent = '—';
    document.getElementById('stat-status').textContent = '●';
    document.getElementById('stat-status').style.color = '#22c55e';
  }
}

loadStats();

// ── Leaderboard ────────────────────────────────────────────────
let lbData = [];
let lbType = 'xp';

async function loadLeaderboard() {
  try {
    const res = await fetch(`${BOT_API_URL}/api/leaderboard?type=${lbType}`, { signal: AbortSignal.timeout(5000) });
    lbData = await res.json();
    renderLeaderboard();
  } catch {
    document.getElementById('lb-list').innerHTML = '<div class="lb-loading">Could not load leaderboard.</div>';
  }
}

function renderLeaderboard() {
  const list = document.getElementById('lb-list');
  if (!lbData.length) {
    list.innerHTML = '<div class="lb-loading">No data available yet.</div>';
    return;
  }

  const medals = ['🥇', '🥈', '🥉'];
  list.innerHTML = lbData.map((user, i) => {
    const rank = medals[i] || `#${i + 1}`;
    const value = lbType === 'xp'
      ? `⬆️ ${user.xp.toLocaleString()} XP`
      : lbType === 'balance'
        ? `💰 ${user.balance.toLocaleString()} Coins`
        : `⌨️ ${user.commandCount.toLocaleString()} Commands`;
    return `
      <div class="lb-row">
        <span class="lb-rank">${rank}</span>
        <span class="lb-name">${escapeHtml(user.username)}</span>
        <span class="lb-value">${value}</span>
      </div>`;
  }).join('');
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

document.querySelectorAll('.lb-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.lb-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    lbType = tab.dataset.type;
    loadLeaderboard();
  });
});

loadLeaderboard();

// ── Command Tabs ───────────────────────────────────────────────
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.cmd-list').forEach(l => l.classList.remove('active'));

    tab.classList.add('active');
    const target = document.getElementById('tab-' + tab.dataset.tab);
    if (target) target.classList.add('active');
  });
});

// ── Auth State ─────────────────────────────────────────────────
async function checkAuth() {
  try {
    const res = await authFetch(`${BOT_API_URL}/auth/me`, { signal: AbortSignal.timeout(3000) });
    const data = await res.json();
    if (data.loggedIn) {
      document.getElementById('nav-user').style.display = 'flex';
      document.getElementById('nav-avatar').src = data.user.avatar;
      document.getElementById('nav-username').textContent = data.user.username;
      const loginBtn = document.getElementById('nav-login');
      if (loginBtn) loginBtn.style.display = 'none';
    }
  } catch {}
}
checkAuth();

// ── Smooth Scroll ──────────────────────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    const el = document.querySelector(a.getAttribute('href'));
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  });
});
