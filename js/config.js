const BOT_API_URL = 'https://sszip--ioqvhes.replit.app';
const DISCORD_CLIENT_ID = '1435231049033584722';
const DISCORD_REDIRECT_URI = 'https://wowkurd.netlify.app/auth/callback';
const DISCORD_LOGIN_URL = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(DISCORD_REDIRECT_URI)}&response_type=code&scope=identify`;

function getAuthToken() {
  return localStorage.getItem('wow_auth_token') || null;
}

function authFetch(url, options = {}) {
  const token = getAuthToken();
  const headers = { ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(url, { ...options, headers });
}
