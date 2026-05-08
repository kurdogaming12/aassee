let lbData = [];
let lbType = 'balance';
let lbPage = 0;
const PER_PAGE = 10;
const avatarCache = {};

const TABS = {
  balance:      { unit: 'Coins',    color: '#fbbf24', icon: '💰', isServer: false },
  xp:           { unit: 'XP',       color: '#60a5fa', icon: '⬆️', isServer: false },
  commandCount: { unit: 'Commands', color: '#4ade80', icon: '⌨️', isServer: false },
  activity:     { unit: 'Commands', color: '#a78bfa', icon: '🎮', isServer: true }
};

async function getAvatar(id) {
  if (avatarCache[id]) return avatarCache[id];
  try {
    const r = await fetch(`${BOT_API_URL}/api/discord-user/${id}`, { signal: AbortSignal.timeout(4000) });
    const d = await r.json();
    avatarCache[id] = d.avatar || defaultAvatar(0);
  } catch {
    avatarCache[id] = defaultAvatar(0);
  }
  return avatarCache[id];
}

function defaultAvatar(n) {
  return `https://cdn.discordapp.com/embed/avatars/${n % 6}.png`;
}

function serverFallbackIcon() {
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='0 0 44 44'%3E%3Crect width='44' height='44' rx='22' fill='%230f2212'/%3E%3Ctext x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' font-size='20' fill='%234ade80'%3E🎮%3C/text%3E%3C/svg%3E`;
}

async function loadLeaderboard() {
  const list = document.getElementById('lb-list');
  list.innerHTML = '<div class="lb-loading">Loading...</div>';
  try {
    const tab = TABS[lbType];
    if (tab.isServer) {
      const res = await fetch(`${BOT_API_URL}/api/leaderboard/servers`, { signal: AbortSignal.timeout(6000) });
      lbData = await res.json();
      renderServerLeaderboard();
    } else {
      const res = await fetch(`${BOT_API_URL}/api/leaderboard?type=${lbType}`, { signal: AbortSignal.timeout(6000) });
      lbData = await res.json();
      lbPage = 0;
      renderUserLeaderboard();
      loadAvatarsForPage();
    }
  } catch {
    document.getElementById('lb-list').innerHTML = '<div class="lb-loading">Could not load leaderboard.</div>';
  }
}

function renderUserLeaderboard() {
  const list = document.getElementById('lb-list');
  if (!lbData.length) {
    list.innerHTML = '<div class="lb-loading">No data available yet.</div>';
    return;
  }
  const medals = ['🥇', '🥈', '🥉'];
  const tab = TABS[lbType];
  const totalPages = Math.ceil(lbData.length / PER_PAGE);
  const start = lbPage * PER_PAGE;
  const pageData = lbData.slice(start, start + PER_PAGE);

  const rows = pageData.map((user, i) => {
    const globalI = start + i;
    const rank = medals[globalI] || `#${globalI + 1}`;
    const val = (user[lbType] || 0).toLocaleString();
    return `<div class="lb-row">
      <span class="lb-rank">${rank}</span>
      <img class="lb-avatar" src="${defaultAvatar(globalI)}" alt="" id="lb-av-${globalI}" />
      <div class="lb-info">
        <div class="lb-name">${esc(user.username)}</div>
        <div class="lb-sub">Rank #${globalI + 1}</div>
      </div>
      <div class="lb-value" style="color:${tab.color}">${tab.icon} ${val}<br><span style="font-size:0.75rem;font-weight:600;opacity:0.7">${tab.unit}</span></div>
    </div>`;
  }).join('');

  const pagination = totalPages > 1 ? `
    <div class="lb-pagination">
      <button class="lb-page-btn" onclick="lbPrev()" ${lbPage === 0 ? 'disabled' : ''}>◀ Prev</button>
      <span class="lb-page-info">Page ${lbPage + 1} / ${totalPages} &nbsp;·&nbsp; ${lbData.length} users</span>
      <button class="lb-page-btn" onclick="lbNext()" ${lbPage >= totalPages - 1 ? 'disabled' : ''}>Next ▶</button>
    </div>` : '';

  list.innerHTML = rows + pagination;
}

function lbPrev() {
  if (lbPage > 0) { lbPage--; renderUserLeaderboard(); loadAvatarsForPage(); }
}

function lbNext() {
  const totalPages = Math.ceil(lbData.length / PER_PAGE);
  if (lbPage < totalPages - 1) { lbPage++; renderUserLeaderboard(); loadAvatarsForPage(); }
}

function renderServerLeaderboard() {
  const list = document.getElementById('lb-list');
  if (!lbData.length) {
    list.innerHTML = '<div class="lb-loading">No server data yet. Commands need to be used first.</div>';
    return;
  }
  const medals = ['🥇', '🥈', '🥉'];
  const tab = TABS.activity;
  list.innerHTML = lbData.map((server, i) => {
    const rank = medals[i] || `#${i + 1}`;
    const val = (server.commandCount || 0).toLocaleString();
    const iconSrc = server.icon || serverFallbackIcon();
    return `<div class="lb-row">
      <span class="lb-rank">${rank}</span>
      <img class="lb-avatar lb-server-icon" src="${esc(iconSrc)}" alt=""
           onerror="this.src='${serverFallbackIcon()}'" />
      <div class="lb-info">
        <div class="lb-name">${esc(server.name)}</div>
        <div class="lb-sub">${server.memberCount ? server.memberCount.toLocaleString() + ' members' : 'Server'}</div>
      </div>
      <div class="lb-value" style="color:${tab.color}">${tab.icon} ${val}<br><span style="font-size:0.75rem;font-weight:600;opacity:0.7">Total Commands</span></div>
    </div>`;
  }).join('');
}

function loadAvatarsForPage() {
  const start = lbPage * PER_PAGE;
  lbData.slice(start, start + PER_PAGE).forEach(async (user, i) => {
    const globalI = start + i;
    const avatar = await getAvatar(user.id);
    const img = document.getElementById(`lb-av-${globalI}`);
    if (img) img.src = avatar;
  });
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

document.querySelectorAll('.lb-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.lb-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    lbType = tab.dataset.type;
    lbPage = 0;
    loadLeaderboard();
  });
});

loadLeaderboard();
