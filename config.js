window.API_BASE = ['localhost','127.0.0.1'].includes(location.hostname)
  ? 'http://localhost:4000'
  : 'https://mentorsedgepro-backend.onrender.com';
window.WS_URL = API_BASE.replace(/^http/, 'ws') + '/ws';