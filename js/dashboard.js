function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function showLoginPrompt() {
  document.getElementById('dash-profile').innerHTML = `
    <div class="dash-login-prompt">
      <div class="dash-login-icon">👤</div>
      <h2>Your Dashboard</h2>
      <p>Login with Discord to see your stats, XP, coins, inventory and daily streak.</p>
      <div class="dash-login-features">
        <div class="dash-login-feat"><span>📊</span> XP &amp; Level</div>
        <div class="dash-login-feat"><span>💰</span> Coins &amp; Balance</div>
        <div class="dash-login-feat"><span>🎒</span> Inventory</div>
        <div class="dash-login-feat"><span>🔥</span> Daily Streak</div>
      </div>
      <a id="dash-login-btn" href="#" class="btn discord" style="margin-top:8px;display:inline-flex;align-items:center;gap:10px;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
        Login with Discord
      </a>
    </div>`;
  const btn = document.getElementById('dash-login-btn');
  if (btn) btn.href = `${BOT_API_URL}/auth/discord`;
}

document.addEventListener('navReady', async (e) => {
  if (!e.detail.loggedIn) { showLoginPrompt(); return; }
  const user = e.detail.user;
  await renderDash(user);
});

async function renderDash(user) {
  const profileRes = await fetch(`${BOT_API_URL}/api/profile/${user.id}`, { credentials: 'include' }).catch(() => null);
  const profile = profileRes ? await profileRes.json() : null;

  const xp = profile?.xp ?? 0;
  const balance = profile?.balance ?? 0;
  const commandCount = profile?.commandCount ?? 0;
  const dailyStreak = profile?.dailyStreak ?? 0;

  let level = 1, xpIntoLevel = xp, xpForNext = 250, accumulated = 0;
  while (true) {
    const needed = Math.floor(250 * Math.pow(level, 1.5));
    if (accumulated + needed > xp) { xpIntoLevel = xp - accumulated; xpForNext = needed; break; }
    accumulated += needed; level++;
    if (level > 9999) break;
  }
  const pct = Math.min(100, Math.floor((xpIntoLevel / xpForNext) * 100));

  const inventory = profile?.inventory || {};
  const invKeys = Object.keys(inventory).filter(k => inventory[k] > 0);
  const invHtml = invKeys.length
    ? invKeys.map(k => `<div class="inv-item"><span class="inv-name">${esc(k)}</span><span class="inv-qty">×${inventory[k]}</span></div>`).join('')
    : '<div class="inv-empty">No items in inventory</div>';

  document.getElementById('dash-profile').innerHTML = `
    <div class="dash-hero">
      <img src="${esc(user.avatar)}" class="dash-avatar" alt="${esc(user.username)}" />
      <div class="dash-info">
        <h1 class="dash-name">${esc(user.username)}</h1>
        <div class="dash-level-badge">Level ${level}</div>
        <div class="xp-bar-wrap"><div class="xp-bar-fill" style="width:${pct}%"></div></div>
        <div class="xp-label">${xpIntoLevel.toLocaleString()} / ${xpForNext.toLocaleString()} XP <span class="xp-pct">${pct}%</span></div>
      </div>
    </div>
    <div class="dash-stats">
      <div class="dash-stat"><div class="dash-stat-icon">⬆️</div><div class="dash-stat-num">${xp.toLocaleString()}</div><div class="dash-stat-label">Total XP</div></div>
      <div class="dash-stat"><div class="dash-stat-icon">💰</div><div class="dash-stat-num">${balance.toLocaleString()}</div><div class="dash-stat-label">Coins</div></div>
      <div class="dash-stat"><div class="dash-stat-icon">⌨️</div><div class="dash-stat-num">${commandCount.toLocaleString()}</div><div class="dash-stat-label">Commands Used</div></div>
      <div class="dash-stat"><div class="dash-stat-icon">🔥</div><div class="dash-stat-num">${dailyStreak}</div><div class="dash-stat-label">Daily Streak</div></div>
    </div>
    <div class="dash-section"><h2>🎒 Inventory</h2><div class="inv-grid">${invHtml}</div></div>`;
}
