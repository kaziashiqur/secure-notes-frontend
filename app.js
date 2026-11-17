let token = localStorage.getItem('token');
let me = null;
let notesPage = 1;
let usersPage = 1;
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const list = (s) => s.split(',').map((x) => x.trim()).filter(Boolean);

// fetch wrapper: adds the token and shows errors
async function api(method, url, body) {
  $('msg').textContent = '';
  const res = await fetch(API_URL + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) {
    $('msg').textContent = `${res.status}: ${data.message}`;
    throw new Error(data.message);
  }
  return data;
}

async function login() {
  const d = await api('POST', '/api/auth/login', { email: $('loginEmail').value, password: $('loginPassword').value });
  setSession(d.token);
}
async function register() {
  const d = await api('POST', '/api/auth/register', {
    name: $('regName').value, email: $('regEmail').value, password: $('regPassword').value, interests: list($('regInterests').value),
  });
  setSession(d.token);
}
function setSession(t) { token = t; localStorage.setItem('token', t); init(); }
function logout() { token = null; localStorage.removeItem('token'); location.reload(); }

async function init() {
  if (!token) return;
  try { me = await api('GET', '/api/users/me'); } catch { return logout(); }
  $('authBox').classList.add('hidden');
  $('appBox').classList.remove('hidden');
  $('me').textContent = `${me.name} (${me.role})`;
  loadNotes(); loadPosts();
  if (me.role === 'admin') { $('adminBox').classList.remove('hidden'); loadUsers(); loadAllNotes(); }
}

async function loadNotes() {
  notesPage = Math.max(notesPage, 1);
  const d = await api('GET', `/api/notes?page=${notesPage}&limit=5`);
  $('notesInfo').textContent = `page ${d.page}/${d.totalPages || 1} (total ${d.total})`;
  $('notes').innerHTML = d.data.map((n) => `<div class="item"><b>${esc(n.title)}</b> - ${esc(n.content)}
    <button onclick='editNote(${JSON.stringify(n).replace(/'/g, '&#39;')})'>Edit</button>
    <button onclick="deleteNote('${n._id}')">Delete</button></div>`).join('');
}
function editNote(n) { $('noteId').value = n._id; $('noteTitle').value = n.title; $('noteContent').value = n.content; }
function clearNote() { $('noteId').value = ''; $('noteTitle').value = ''; $('noteContent').value = ''; }
async function saveNote() {
  const body = { title: $('noteTitle').value, content: $('noteContent').value };
  const id = $('noteId').value;
  await api(id ? 'PUT' : 'POST', id ? `/api/notes/${id}` : '/api/notes', body);
  clearNote(); loadNotes();
}
async function deleteNote(id) {
  if (!confirm('Are you sure you want to delete this note?')) return;
  await api('DELETE', `/api/notes/${id}`);
  loadNotes();
}

async function loadPosts() {
  const d = await api('GET', '/api/posts?limit=10');
  $('posts').innerHTML = d.data.map((p) => `<div class="item"><b>${esc(p.title)}</b> by
    <span class="author" onclick="loadUserPosts('${p.author?._id}')">${esc(p.author?.name)}</span> - ${esc(p.body)}</div>`).join('');
}
async function createPost() {
  await api('POST', '/api/posts', { title: $('postTitle').value, body: $('postBody').value });
  $('postTitle').value = ''; $('postBody').value = ''; loadPosts();
}
async function loadUserPosts(userId) {
  const d = await api('GET', `/api/posts/user/${userId}`);
  $('userPosts').innerHTML = `<p><b>${esc(d.user.name)}</b> (${esc(d.user.email)}) - ${d.posts.length} post(s)</p>` +
    d.posts.map((p) => `<div class="item"><b>${esc(p.title)}</b> - ${esc(p.body)}</div>`).join('');
}

// admin stuff
async function loadUsers() {
  usersPage = Math.max(usersPage, 1);
  const d = await api('GET', `/api/admin/users?page=${usersPage}&limit=5`);
  $('usersInfo').textContent = `page ${d.page}/${d.totalPages || 1} (total ${d.total})`;
  $('users').innerHTML = d.data.map((u) => `<div class="item">${esc(u.name)} - ${esc(u.email)} - ${u.role} - [${esc(u.interests.join(', '))}]
    <button onclick='editUser(${JSON.stringify(u).replace(/'/g, '&#39;')})'>Edit</button>
    <button onclick="deleteUser('${u._id}')">Delete</button></div>`).join('');
}
function editUser(u) {
  $('uId').value = u._id; $('uName').value = u.name; $('uEmail').value = u.email;
  $('uPassword').value = ''; $('uRole').value = u.role; $('uInterests').value = u.interests.join(', ');
}
function clearUser() { ['uId', 'uName', 'uEmail', 'uPassword', 'uInterests'].forEach((k) => ($(k).value = '')); $('uRole').value = 'user'; }
async function saveUser() {
  const id = $('uId').value;
  const body = { name: $('uName').value, email: $('uEmail').value, role: $('uRole').value, interests: list($('uInterests').value) };
  if ($('uPassword').value) body.password = $('uPassword').value;
  await api(id ? 'PUT' : 'POST', id ? `/api/admin/users/${id}` : '/api/admin/users', body);
  clearUser(); loadUsers();
}
async function deleteUser(id) {
  if (!confirm('Are you sure you want to delete this user? All their notes will be deleted too.')) return;
  await api('DELETE', `/api/admin/users/${id}`);
  loadUsers(); loadAllNotes();
}
async function loadAllNotes() {
  const d = await api('GET', '/api/admin/notes?limit=20');
  $('allNotes').innerHTML = d.data.map((n) => `<div class="item"><b>${esc(n.title)}</b> - ${esc(n.content)} (owner: ${esc(n.user?.name)})</div>`).join('');
}
async function loadInterests() {
  const f = $('interestFilter').value.trim();
  const d = await api('GET', `/api/admin/users/by-interest${f ? `?interests=${encodeURIComponent(f)}` : ''}`);
  $('interests').innerHTML = d.data.map((g) =>
    `<div class="item"><b>${esc(g.interest)}</b> (${g.count}) - ${g.users.map((u) => esc(u.name)).join(', ')}</div>`).join('');
}

init();
