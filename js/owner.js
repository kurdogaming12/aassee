let moneyLookupId = null;
let adminLookupId = null;
let banLookupId   = null;
let catMembers    = [];
let catEditId     = null;
let catAllData    = [];
let catMemberSearchTimer = null;

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function showToast(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function fmtDate(ts) {
  if (!ts) return '—';
  return new Date(Number(ts)).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtPerms(p) {
  if (!p) return 'None';
  const list = [];
  if (p.full)       list.push('🔓 Full');
  if (p.economy)    list.push('💰 Economy');
  if (p.moderation) list.push('🔨 Moderation');
  if (p.giveaway)   list.push('🎉 Giveaway');
  return list.length ? list.join(' · ') : 'None';
}

document.addEventListener('navReady', async (e) => {
  if (!e.detail.loggedIn) { showDenied('You must be logged in to access this page.'); return; }
  let isOwner = false;
  try {
    const d = await fetch(`${BOT_API_URL}/api/owner/check`, { credentials: 'include' }).then(r => r.json());
    isOwner = d.isOwner;
  } catch {}
  if (!isOwner) { showDenied('This page is restricted to bot owners only.'); return; }
  document.getElementById('op-loading').style.display = 'none';
  document.getElementById('op-panel').style.display   = 'block';
  initTabs();
  initAdminSearch();
  initBanSearch();
  initMoneySearch();
  initCatMemberSearch();
  fillHourSelect();
  loadAdmins();
});

function showDenied(msg) {
  document.getElementById('op-loading').style.display = 'none';
  document.getElementById('op-denied').style.display  = 'flex';
  document.getElementById('op-denied-msg').textContent = msg;
}

function initTabs() {
  document.querySelectorAll('.op-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll('.op-tab').forEach(t => t.classList.toggle('active', t === btn));
      document.querySelectorAll('.op-section').forEach(s => s.classList.toggle('active', s.id === `sec-${tab}`));
      if      (tab === 'admins')      loadAdmins();
      else if (tab === 'banned')      loadBanned();
      else if (tab === 'servers')     loadServers();
      else if (tab === 'settings')    loadSettings();
      else if (tab === 'categories')  loadCategories();
    });
  });
}

function userPreviewHtml(u) {
  const fallback = 'https://cdn.discordapp.com/embed/avatars/0.png';
  return `
    <div class="op-preview-card">
      <img src="${esc(u.avatar)}" class="op-preview-avatar" alt="" onerror="this.src='${fallback}'" />
      <div class="op-preview-info">
        <div class="op-preview-name">${esc(u.username)}</div>
        <div class="op-preview-id">ID: ${esc(u.id)}</div>
        ${u.balance !== undefined ? `<div class="op-preview-stats">💰 ${(u.balance||0).toLocaleString()} &nbsp;·&nbsp; ⬆️ ${(u.xp||0).toLocaleString()} XP &nbsp;·&nbsp; ⌨️ ${(u.commandCount||0).toLocaleString()}</div>` : ''}
      </div>
    </div>`;
}

let adminSearchTimer = null;

function initAdminSearch() {
  const input = document.getElementById('add-admin-search');
  const drop  = document.getElementById('admin-search-dropdown');
  if (!input) return;
  input.addEventListener('input', () => {
    clearTimeout(adminSearchTimer);
    const q = input.value.trim();
    if (!q) { drop.style.display = 'none'; drop.innerHTML = ''; return; }
    adminSearchTimer = setTimeout(() => fetchAutocomplete(q, drop, (id, name) => selectAdminUser(id, name)), 200);
  });
  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !drop.contains(e.target)) drop.style.display = 'none';
  });
}

async function selectAdminUser(id, name) {
  document.getElementById('add-admin-search').value = name;
  document.getElementById('admin-search-dropdown').style.display = 'none';
  adminLookupId = id;
  const preview = document.getElementById('add-admin-preview');
  preview.innerHTML = '<div class="op-empty">Loading...</div>';
  preview.style.display = 'block';
  try {
    const u = await fetch(`${BOT_API_URL}/api/owner/user/${encodeURIComponent(id)}`, { credentials: 'include' }).then(r => r.json());
    adminLookupId = u.id;
    preview.innerHTML = userPreviewHtml(u);
  } catch { preview.innerHTML = '<div class="op-empty">User not found.</div>'; }
}

let banSearchTimer = null;

function initBanSearch() {
  const input = document.getElementById('ban-user-search');
  const drop  = document.getElementById('ban-search-dropdown');
  if (!input) return;
  input.addEventListener('input', () => {
    clearTimeout(banSearchTimer);
    const q = input.value.trim();
    if (!q) { drop.style.display = 'none'; drop.innerHTML = ''; return; }
    banSearchTimer = setTimeout(() => fetchAutocomplete(q, drop, (id, name) => selectBanUser(id, name)), 200);
  });
  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !drop.contains(e.target)) drop.style.display = 'none';
  });
}

async function selectBanUser(id, name) {
  document.getElementById('ban-user-search').value = name;
  document.getElementById('ban-search-dropdown').style.display = 'none';
  banLookupId = id;
  const preview = document.getElementById('ban-user-preview');
  preview.innerHTML = '<div class="op-empty">Loading...</div>';
  preview.style.display = 'block';
  try {
    const u = await fetch(`${BOT_API_URL}/api/owner/user/${encodeURIComponent(id)}`, { credentials: 'include' }).then(r => r.json());
    banLookupId = u.id;
    preview.innerHTML = userPreviewHtml(u);
  } catch { preview.innerHTML = '<div class="op-empty">User not found.</div>'; }
}

async function fetchAutocomplete(q, drop, onSelect) {
  try {
    const results = await fetch(`${BOT_API_URL}/api/owner/search-users?q=${encodeURIComponent(q)}`, { credentials: 'include' }).then(r => r.json());
    if (!results.length) { drop.style.display = 'none'; return; }
    const fallback = 'https://cdn.discordapp.com/embed/avatars/0.png';
    drop.innerHTML = results.map(u => `
      <li class="op-autocomplete-item" data-id="${esc(u.id)}" data-name="${esc(u.username)}" data-avatar="${esc(u.avatar)}">
        <img src="${esc(u.avatar)}" onerror="this.src='${fallback}'" />
        <span class="op-ac-name">${esc(u.username)}</span>
        <span class="op-ac-id">${esc(u.id)}</span>
      </li>`).join('');
    drop.style.display = 'block';
    drop.querySelectorAll('.op-autocomplete-item').forEach(li => {
      li.addEventListener('click', () => onSelect(li.dataset.id, li.dataset.name, li.dataset.avatar));
    });
  } catch { drop.style.display = 'none'; }
}

async function loadAdmins() {
  const list = document.getElementById('admins-list');
  list.innerHTML = '<div class="op-empty">Loading...</div>';
  try {
    const data = await fetch(`${BOT_API_URL}/api/owner/admins`, { credentials: 'include' }).then(r => r.json());
    if (!data.length) { list.innerHTML = '<div class="op-empty">No admins configured yet.</div>'; return; }
    const fallback = 'https://cdn.discordapp.com/embed/avatars/0.png';
    list.innerHTML = data.map(u => `
      <div class="op-user-row">
        <img src="${esc(u.avatar)}" class="op-user-avatar" onerror="this.src='${fallback}'" />
        <div class="op-user-info">
          <div class="op-user-name">${esc(u.username)}</div>
          <div class="op-user-sub">${esc(u.id)} &nbsp;·&nbsp; ${fmtPerms(u.permissions)}</div>
        </div>
        <button onclick="removeAdmin('${esc(u.id)}')" class="op-btn op-btn-danger op-btn-sm">Remove</button>
      </div>`).join('');
  } catch { list.innerHTML = '<div class="op-empty">Failed to load admins.</div>'; }
}

async function addAdmin() {
  const id = adminLookupId;
  if (!id) { showToast('Please select a user first', 'error'); return; }
  const permissions = {
    full:       document.getElementById('perm-full').checked,
    economy:    document.getElementById('perm-economy').checked,
    moderation: document.getElementById('perm-moderation').checked,
    giveaway:   document.getElementById('perm-giveaway').checked
  };
  const r = await fetch(`${BOT_API_URL}/api/owner/add-admin`, {
    method: 'POST', credentials: 'include', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ userId: id, permissions })
  });
  const d = await r.json();
  if (d.ok) {
    showToast('Admin added successfully!');
    loadAdmins();
    document.getElementById('add-admin-search').value = '';
    document.getElementById('add-admin-preview').style.display = 'none';
    ['perm-full','perm-economy','perm-moderation','perm-giveaway'].forEach(id => document.getElementById(id).checked = false);
    adminLookupId = null;
  } else showToast(d.error || 'Failed', 'error');
}

async function removeAdmin(userId) {
  if (!confirm(`Remove admin privileges from user ${userId}?`)) return;
  const r = await fetch(`${BOT_API_URL}/api/owner/remove-admin`, {
    method: 'POST', credentials: 'include', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ userId })
  });
  const d = await r.json();
  if (d.ok) { showToast('Admin removed!'); loadAdmins(); }
  else showToast(d.error || 'Failed', 'error');
}

async function loadBanned() {
  const list = document.getElementById('banned-list');
  list.innerHTML = '<div class="op-empty">Loading...</div>';
  try {
    const data = await fetch(`${BOT_API_URL}/api/owner/banned`, { credentials: 'include' }).then(r => r.json());
    if (!data.length) { list.innerHTML = '<div class="op-empty">No banned users.</div>'; return; }
    const fallback = 'https://cdn.discordapp.com/embed/avatars/0.png';
    list.innerHTML = data.map(u => `
      <div class="op-user-row">
        <img src="${esc(u.avatar)}" class="op-user-avatar" onerror="this.src='${fallback}'" />
        <div class="op-user-info">
          <div class="op-user-name">${esc(u.username)}</div>
          <div class="op-user-sub">${esc(u.id)} &nbsp;·&nbsp; ${esc(u.reason||'No reason')} &nbsp;·&nbsp; ${fmtDate(u.bannedAt)}</div>
        </div>
        <button onclick="unbanUser('${esc(u.id)}')" class="op-btn op-btn-success op-btn-sm">Unban</button>
      </div>`).join('');
  } catch { list.innerHTML = '<div class="op-empty">Failed to load.</div>'; }
}

async function banUser() {
  const id = banLookupId;
  if (!id) { showToast('Please select a user first', 'error'); return; }
  const reason = document.getElementById('ban-reason').value.trim();
  const r = await fetch(`${BOT_API_URL}/api/owner/ban`, {
    method: 'POST', credentials: 'include', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ userId: id, reason })
  });
  const d = await r.json();
  if (d.ok) {
    showToast('User banned!');
    loadBanned();
    document.getElementById('ban-user-search').value = '';
    document.getElementById('ban-reason').value = '';
    document.getElementById('ban-user-preview').style.display = 'none';
    banLookupId = null;
  } else showToast(d.error || 'Failed', 'error');
}

async function unbanUser(userId) {
  const r = await fetch(`${BOT_API_URL}/api/owner/unban`, {
    method: 'POST', credentials: 'include', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ userId })
  });
  const d = await r.json();
  if (d.ok) { showToast('User unbanned!'); loadBanned(); }
  else showToast(d.error || 'Failed', 'error');
}

let moneySearchTimer = null;

function initMoneySearch() {
  const input = document.getElementById('money-user-search');
  const drop  = document.getElementById('money-search-dropdown');
  if (!input) return;
  input.addEventListener('input', () => {
    clearTimeout(moneySearchTimer);
    const q = input.value.trim();
    if (!q) { drop.style.display = 'none'; drop.innerHTML = ''; return; }
    moneySearchTimer = setTimeout(() => fetchAutocomplete(q, drop, (id, name) => selectMoneyUser(id, name)), 200);
  });
  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !drop.contains(e.target)) drop.style.display = 'none';
  });
}

async function selectMoneyUser(id, name) {
  const input = document.getElementById('money-user-search');
  const drop  = document.getElementById('money-search-dropdown');
  input.value = name;
  drop.style.display = 'none';
  moneyLookupId = id;
  const preview = document.getElementById('money-user-preview');
  preview.innerHTML = '<div class="op-empty">Loading...</div>';
  preview.style.display = 'block';
  try {
    const u = await fetch(`${BOT_API_URL}/api/owner/user/${encodeURIComponent(id)}`, { credentials: 'include' }).then(r => r.json());
    moneyLookupId = u.id;
    preview.innerHTML = userPreviewHtml(u);
  } catch { preview.innerHTML = '<div class="op-empty">User not found.</div>'; }
}

async function giveMoney() {
  const id     = moneyLookupId;
  const amount = document.getElementById('money-amount').value;
  if (!id || !amount) { showToast('Lookup a user and enter an amount', 'error'); return; }
  const r = await fetch(`${BOT_API_URL}/api/owner/give`, {
    method: 'POST', credentials: 'include', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ userId: id, amount: Number(amount) })
  });
  const d = await r.json();
  if (d.ok) { showToast(`💰 Given! New balance: ${d.newBalance.toLocaleString()}`); if (moneyLookupId) selectMoneyUser(moneyLookupId, document.getElementById('money-user-search').value); }
  else showToast(d.error || 'Failed', 'error');
}

async function takeMoney() {
  const id     = moneyLookupId;
  const amount = document.getElementById('money-amount').value;
  if (!id || !amount) { showToast('Lookup a user and enter an amount', 'error'); return; }
  const r = await fetch(`${BOT_API_URL}/api/owner/take`, {
    method: 'POST', credentials: 'include', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ userId: id, amount: Number(amount) })
  });
  const d = await r.json();
  if (d.ok) { showToast(`💰 Taken! New balance: ${d.newBalance.toLocaleString()}`); if (moneyLookupId) selectMoneyUser(moneyLookupId, document.getElementById('money-user-search').value); }
  else showToast(d.error || 'Failed', 'error');
}

async function loadServers() {
  const list = document.getElementById('servers-list');
  list.innerHTML = '<div class="op-empty">Loading...</div>';
  try {
    const data = await fetch(`${BOT_API_URL}/api/owner/servers`, { credentials: 'include' }).then(r => r.json());
    if (!data.length) { list.innerHTML = '<div class="op-empty">No servers found.</div>'; return; }
    const fallback = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='0 0 44 44'%3E%3Crect width='44' height='44' rx='22' fill='%230f2212'/%3E%3Ctext x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' font-size='20' fill='%234ade80'%3E🌐%3C/text%3E%3C/svg%3E`;
    list.innerHTML = `<div class="op-servers-count">${data.length} total servers</div>` +
      data.map(g => `
        <div class="op-user-row">
          <img src="${g.icon ? esc(g.icon) : fallback}" class="op-user-avatar" onerror="this.src='${fallback}'" />
          <div class="op-user-info">
            <div class="op-user-name">${esc(g.name)}</div>
            <div class="op-user-sub">${esc(g.id)} &nbsp;·&nbsp; ${(g.memberCount||0).toLocaleString()} members</div>
          </div>
        </div>`).join('');
  } catch { list.innerHTML = '<div class="op-empty">Failed to load servers.</div>'; }
}

async function loadSettings() {
  try {
    const d = await fetch(`${BOT_API_URL}/api/owner/settings`, { credentials: 'include' }).then(r => r.json());
    document.getElementById('invite-link-input').value = d.inviteLink || '';
  } catch {}
}

async function saveInviteLink() {
  const inviteLink = document.getElementById('invite-link-input').value.trim();
  if (!inviteLink) { showToast('Please enter an invite link', 'error'); return; }
  const r = await fetch(`${BOT_API_URL}/api/owner/settings`, {
    method: 'POST', credentials: 'include', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ inviteLink })
  });
  const d = await r.json();
  if (d.ok) showToast('Invite link saved!');
  else showToast(d.error || 'Failed', 'error');
}

async function resetLeaderboard() {
  if (!confirm('Reset ALL leaderboard stats (XP, Coins, Commands) for ALL users?\n\nDaily streaks and inventory will be kept.')) return;
  const r = await fetch(`${BOT_API_URL}/api/owner/reset-leaderboard`, { method: 'POST', credentials: 'include' });
  const d = await r.json();
  if (d.ok) showToast('✅ Leaderboard reset successfully!');
  else showToast(d.error || 'Failed', 'error');
}

async function resetAll() {
  if (!confirm('⚠️ This will DELETE ALL USER DATA permanently!\nThis cannot be undone!\n\nAre you absolutely sure?')) return;
  if (!confirm('Last warning: ALL balances, XP, streaks, inventory will be gone forever. Continue?')) return;
  const r = await fetch(`${BOT_API_URL}/api/owner/reset-all`, { method: 'POST', credentials: 'include' });
  const d = await r.json();
  if (d.ok) showToast('✅ All user data deleted!');
  else showToast(d.error || 'Failed', 'error');
}

function fillHourSelect() {
  const sel = document.getElementById('cat-hour');
  if (!sel) return;
  for (let h = 0; h < 24; h++) {
    const opt = document.createElement('option');
    opt.value = h;
    opt.textContent = `${String(h).padStart(2,'0')}:00`;
    sel.appendChild(opt);
  }
}

function openCategoryModal(editCat) {
  catEditId = editCat ? editCat.id : null;
  catMembers = editCat ? [...editCat.members] : [];

  document.getElementById('cat-modal-title').textContent = editCat ? '✏️ Edit Category' : '➕ New Category';
  document.getElementById('cat-submit-btn').textContent  = editCat ? '💾 Save Changes' : '✅ Create Category';

  document.getElementById('cat-name').value           = editCat ? editCat.name : '';
  document.getElementById('cat-price').value          = editCat ? editCat.price : '';
  document.getElementById('cat-interval-value').value = editCat ? editCat.intervalValue : '1';
  document.getElementById('cat-interval-unit').value  = editCat ? editCat.intervalUnit  : 'w';
  document.getElementById('cat-hour').value           = editCat ? editCat.hour : '9';
  document.getElementById('cat-start-today').checked  = false;
  document.getElementById('cat-member-search').value  = '';
  document.getElementById('cat-member-dropdown').style.display = 'none';

  document.querySelectorAll('.cat-day-btn').forEach(b => b.classList.remove('active'));
  const targetDay = editCat ? editCat.dayOfWeek : 1;
  const dayBtn = document.querySelector(`.cat-day-btn[data-day="${targetDay}"]`);
  if (dayBtn) dayBtn.classList.add('active');

  renderCatMembers();
  updateDaySelector();
  document.getElementById('cat-modal').style.display = 'flex';
}

function closeCategoryModal() {
  document.getElementById('cat-modal').style.display = 'none';
}

function catModalBgClick(e) {
  if (e.target === document.getElementById('cat-modal')) closeCategoryModal();
}

function updateDaySelector() {
  const unit = document.getElementById('cat-interval-unit').value;
  document.getElementById('cat-day-section').style.display = unit === 'w' ? 'block' : 'none';
}

function setCatDay(btn) {
  document.querySelectorAll('.cat-day-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  if (btn.dataset.day === '-1') {
    document.getElementById('cat-start-today').checked = true;
  }
}

function initCatMemberSearch() {
  const input = document.getElementById('cat-member-search');
  const drop  = document.getElementById('cat-member-dropdown');
  if (!input) return;
  input.addEventListener('input', () => {
    clearTimeout(catMemberSearchTimer);
    const q = input.value.trim();
    if (!q) { drop.style.display = 'none'; drop.innerHTML = ''; return; }
    catMemberSearchTimer = setTimeout(() => fetchAutocomplete(q, drop, (id, name, avatar) => addCatMember(id, name, avatar)), 200);
  });
  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !drop.contains(e.target)) drop.style.display = 'none';
  });
}

function addCatMember(id, name, avatar) {
  if (catMembers.find(m => m.id === id)) { showToast('Already added', 'error'); return; }
  catMembers.push({ id, username: name, avatar: avatar || 'https://cdn.discordapp.com/embed/avatars/0.png' });
  document.getElementById('cat-member-search').value = '';
  document.getElementById('cat-member-dropdown').style.display = 'none';
  renderCatMembers();
}

function removeCatMember(id) {
  catMembers = catMembers.filter(m => m.id !== id);
  renderCatMembers();
}

function renderCatMembers() {
  const list = document.getElementById('cat-members-list');
  const fallback = 'https://cdn.discordapp.com/embed/avatars/0.png';
  if (!catMembers.length) {
    list.innerHTML = '<div class="op-empty" style="padding:10px 0">No members added yet.</div>';
    return;
  }
  list.innerHTML = catMembers.map(m => `
    <div class="cat-member-row">
      <img src="${esc(m.avatar||fallback)}" class="op-user-avatar" style="width:32px;height:32px" onerror="this.src='${fallback}'" />
      <div class="op-user-info">
        <div class="op-user-name" style="font-size:0.88rem">${esc(m.username)}</div>
        <div class="op-user-sub">${esc(m.id)}</div>
      </div>
      <button onclick="removeCatMember('${esc(m.id)}')" class="op-btn op-btn-danger op-btn-sm">✕</button>
    </div>`).join('');
}

async function saveCategory() {
  const name          = document.getElementById('cat-name').value.trim();
  const price         = Number(document.getElementById('cat-price').value);
  const intervalValue = Number(document.getElementById('cat-interval-value').value) || 1;
  const intervalUnit  = document.getElementById('cat-interval-unit').value;
  const hour          = Number(document.getElementById('cat-hour').value) || 0;
  const activeDay     = document.querySelector('.cat-day-btn.active');
  const dayOfWeek     = activeDay ? Number(activeDay.dataset.day) : 1;
  const startToday    = document.getElementById('cat-start-today').checked;

  if (!name)                { showToast('Please enter a category name', 'error'); return; }
  if (!price || price <= 0) { showToast('Please enter a valid price', 'error'); return; }
  if (!catMembers.length)   { showToast('Please add at least one member', 'error'); return; }

  const isEdit = !!catEditId;
  const url    = isEdit ? `${BOT_API_URL}/api/owner/categories/${encodeURIComponent(catEditId)}` : `${BOT_API_URL}/api/owner/categories`;
  const method = isEdit ? 'PATCH' : 'POST';

  const r = await fetch(url, {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, price, intervalValue, intervalUnit, dayOfWeek, hour, startToday, members: catMembers })
  });
  const d = await r.json();
  if (d.ok) {
    showToast(isEdit ? '💾 Category updated!' : '✅ Category created!');
    closeCategoryModal();
    loadCategories();
  } else showToast(d.error || 'Failed', 'error');
}

async function testCategory(id) {
  if (!confirm('Send test payment to all members now?\n\nCoins will be added and DMs sent immediately.')) return;
  const btn = event.target;
  btn.disabled = true;
  btn.textContent = '⏳ Sending...';
  try {
    const r = await fetch(`${BOT_API_URL}/api/owner/categories/${encodeURIComponent(id)}/test`, { method: 'POST', credentials: 'include' });
    const d = await r.json();
    if (d.ok) showToast(`✅ Test sent! ${d.sent} member(s) received coins${d.failed ? `, ${d.failed} failed` : ''}`);
    else showToast(d.error || 'Failed', 'error');
  } catch { showToast('Network error', 'error'); }
  btn.disabled = false;
  btn.textContent = '🧪 Test';
}

async function loadCategories() {
  const list = document.getElementById('cat-list');
  list.innerHTML = '<div class="op-empty">Loading...</div>';
  try {
    const data = await fetch(`${BOT_API_URL}/api/owner/categories`, { credentials: 'include' }).then(r => r.json());
    catAllData = data;
    if (!data.length) {
      list.innerHTML = '<div class="op-empty">No categories yet. Click "New Category" to create one.</div>';
      return;
    }
    const unitLabels = { d:'day(s)', h:'hour(s)', m:'minute(s)', mo:'month(s)', w:'week(s)' };
    const dayNames   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const fallback   = 'https://cdn.discordapp.com/embed/avatars/0.png';

    list.innerHTML = data.map(cat => {
      const dayInfo  = cat.intervalUnit === 'w' ? ` on ${dayNames[cat.dayOfWeek] || ''}` : '';
      const schedule = `Every ${cat.intervalValue} ${unitLabels[cat.intervalUnit]||cat.intervalUnit}${dayInfo} at ${String(cat.hour).padStart(2,'0')}:00`;
      const nextDate = new Date(cat.nextPayment).toLocaleString('en-GB', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
      const memberChips = cat.members.map(m => `
        <div class="cat-member-chip">
          <img src="${esc(m.avatar||fallback)}" onerror="this.src='${fallback}'" />
          <span>${esc(m.username)}</span>
        </div>`).join('');
      return `
        <div class="op-cat-card">
          <div class="op-cat-header">
            <div class="op-cat-info">
              <div class="op-cat-name">📋 ${esc(cat.name)}</div>
              <div class="op-cat-meta">${schedule}</div>
              <div class="op-cat-meta">💰 <strong>${cat.price.toLocaleString()}</strong> coins per person &nbsp;·&nbsp; ${cat.members.length} member${cat.members.length!==1?'s':''}</div>
              <div class="op-cat-meta">⏰ Next payment: <strong>${nextDate}</strong></div>
            </div>
            <div class="op-cat-actions">
              <button onclick="editCategoryById('${esc(cat.id)}')" class="op-btn op-btn-secondary op-btn-sm">✏️ Edit</button>
              <button onclick="testCategory('${esc(cat.id)}')" class="op-btn op-btn-warning op-btn-sm">🧪 Test</button>
              <button onclick="deleteCategory('${esc(cat.id)}')" class="op-btn op-btn-danger op-btn-sm">🗑️ Delete</button>
            </div>
          </div>
          ${cat.members.length ? `<div class="op-cat-members">${memberChips}</div>` : ''}
        </div>`;
    }).join('');
  } catch { list.innerHTML = '<div class="op-empty">Failed to load categories.</div>'; }
}

function editCategoryById(id) {
  const cat = catAllData.find(c => c.id === id);
  if (!cat) { showToast('Category not found', 'error'); return; }
  openCategoryModal(cat);
}

async function deleteCategory(id) {
  if (!confirm('Delete this category? Recurring payments will stop immediately.')) return;
  const r = await fetch(`${BOT_API_URL}/api/owner/categories/${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'include' });
  const d = await r.json();
  if (d.ok) { showToast('Category deleted!'); loadCategories(); }
  else showToast(d.error || 'Failed', 'error');
}
