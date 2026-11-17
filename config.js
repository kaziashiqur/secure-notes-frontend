// change the render url after deploying the backend
const API_URL =
  location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.protocol === 'file:'
    ? 'http://localhost:5000'
    : 'https://YOUR-BACKEND.onrender.com';
