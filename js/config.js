const BOT_API_URL = '';
const DISCORD_CLIENT_ID = '1435231049033584722';
const DISCORD_REDIRECT_URI = 'https://wowkurd.netlify.app/auth/callback';
const DISCORD_LOGIN_URL = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(DISCORD_REDIRECT_URI)}&response_type=code&scope=identify`;
