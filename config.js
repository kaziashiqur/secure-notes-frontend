// local backend when running on my pc, render when live
const API_URL =
  location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.protocol === 'file:'
    ? 'http://localhost:5000'
    : 'https://secure-notes-backend-wf0p.onrender.com';
