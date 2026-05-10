// Hamburger toggle
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('nav-links');
if (hamburger && navLinks) {
  hamburger.addEventListener('click', (e) => {
    e.stopPropagation();
    hamburger.classList.toggle('open');
    navLinks.classList.toggle('open');
  });
  document.addEventListener('click', (e) => {
    if (!navLinks.contains(e.target) && !hamburger.contains(e.target)) {
      hamburger.classList.remove('open');
      navLinks.classList.remove('open');
    }
  });
}

// Active nav link
const currentPath = window.location.pathname.replace(/\/$/, '') || '/';
document.querySelectorAll('.nav-links a[data-page]').forEach(a => {
  const href = a.getAttribute('href').replace(/\/$/, '') || '/';
  if (href === currentPath) a.classList.add('active');
});

function escHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// Auth check + populate nav-right
async function initNav() {
  try {
    const res = await fetch(`${BOT_API_URL}/auth/me`, { credentials: 'include', signal: AbortSignal.timeout(3000) });
    const data = await res.json();
    const rightEl = document.getElementById('nav-right');
    if (!rightEl) return;

    let isOwner = false;
    if (data.loggedIn) {
      try {
        const ownerRes = await fetch(`${BOT_API_URL}/api/owner/check`, { credentials: 'include', signal: AbortSignal.timeout(3000) });
        const ownerData = await ownerRes.json();
        isOwner = ownerData.isOwner;
      } catch {}
    }

    let html = '';

    if (data.loggedIn) {
      if (isOwner) {
        html += `<a href="/owner" class="nav-owner-btn">👑 Owner</a>`;
      }
      html += `
        <div class="nav-user-info">
          <img class="nav-user-avatar" src="${escHtml(data.user.avatar)}" alt="" />
          <a href="/dashboard" class="nav-username">${escHtml(data.user.username)}</a>
        </div>
        <a href="${escHtml(BOT_API_URL)}/auth/logout" class="btn-logout">Logout</a>`;
    } else {
      html += `<a href="${DISCORD_LOGIN_URL}" class="btn-login">Login</a>`;
    }

    html += `<a href="/premium" class="nav-premium-btn">✨ Premium</a>`;

    html += `
      <div class="nav-grid-wrap" id="nav-grid-wrap">
        <button class="nav-grid-btn" id="nav-grid-btn" title="More">
          <img src="/grid-icon.png" alt="menu" />
        </button>
        <div class="nav-grid-dropdown" id="nav-grid-dropdown">
          <a href="/commands">⌨️ Commands</a>
          <a href="/features">✨ Features</a>
          <a href="https://discord.gg/MYQGvfau4G" target="_blank" rel="noopener">💬 Support Server</a>
        </div>
      </div>`;

    rightEl.innerHTML = html;

    document.querySelectorAll('.nav-mobile-extra').forEach(el => el.remove());

    if (navLinks) {
      const divider = document.createElement('div');
      divider.className = 'nav-mobile-extra nav-mobile-divider';
      navLinks.appendChild(divider);

      const extras = [];
      extras.push({ href: '/commands', label: '⌨️ Commands' });
      extras.push({ href: '/features', label: '✨ Features' });
      extras.push({ href: '/premium',  label: '✨ Premium'  });

      if (data.loggedIn) {
        if (isOwner) extras.push({ href: '/owner', label: '👑 Owner Panel' });
        extras.push({ href: '/dashboard', label: '👤 Dashboard' });
        extras.push({ href: `/auth/logout`, label: '🚪 Logout' });
      } else {
        extras.push({ href: '/login', label: '🔑 Login with Discord' });
      }

      extras.push({ href: 'https://discord.gg/MYQGvfau4G', label: '💬 Support Server', external: true });

      extras.forEach(item => {
        const a = document.createElement('a');
        a.href = item.href;
        a.textContent = item.label;
        a.className = 'nav-mobile-extra';
        if (item.external) { a.target = '_blank'; a.rel = 'noopener'; }
        navLinks.appendChild(a);
      });
    }

    const gridBtn = document.getElementById('nav-grid-btn');
    const gridDrop = document.getElementById('nav-grid-dropdown');
    if (gridBtn && gridDrop) {
      gridBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        gridDrop.classList.toggle('open');
      });
      document.addEventListener('click', (e) => {
        if (!gridDrop.contains(e.target) && !gridBtn.contains(e.target)) {
          gridDrop.classList.remove('open');
        }
      });
    }

    window.__navUser = data.loggedIn ? data.user : null;
    document.dispatchEvent(new CustomEvent('navReady', { detail: data }));
  } catch {
    document.dispatchEvent(new CustomEvent('navReady', { detail: { loggedIn: false } }));
  }
}

initNav();
