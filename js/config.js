const BOT_API_URL = 'https://sszip--ioqvhes.replit.app';
const DISCORD_CLIENT_ID = '1435231049033584722';
const DISCORD_REDIRECT_URI = 'https://sszip--ioqvhes.replit.app/auth/callback';
const DISCORD_LOGIN_URL = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(DISCORD_REDIRECT_URI)}&response_type=code&scope=identify`;

function getAuthToken() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  if (token) {
    localStorage.setItem('wow_auth_token', token);
    history.replaceState({}, '', window.location.pathname);
    return token;
  }
  return localStorage.getItem('wow_auth_token');
}

function authFetch(url, options = {}) {
  const token = getAuthToken();
  const headers = { ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(url, { ...options, headers });
}
