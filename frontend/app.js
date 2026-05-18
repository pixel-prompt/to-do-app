/* ═══════════════════════════════════════════════════
   TaskFlow — app.js
   Features: Auth, CRUD, Search, Sort, Filter,
             Due Dates, Categories, User Profile
═══════════════════════════════════════════════════ */

const API_BASE = "http://localhost:3000/api";

let allTodos        = [];
let currentFilter   = "all";
let currentPriority = "";
let currentCategory = "";
let currentSort     = "newest";
let currentSearch   = "";
let currentUser     = null;
let authToken       = null;
let pendingAvatarUrl = null;

/* ─────────────────── Helpers ─────────────────── */
function escHtml(str = "") {
  return String(str)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function showToast(msg, type = "success") {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = `toast ${type} show`;
  setTimeout(() => { t.className = "toast"; }, 3000);
}

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getDueInfo(dueDateStr) {
  if (!dueDateStr) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const due   = new Date(dueDateStr); due.setHours(0,0,0,0);
  const diff  = Math.round((due - today) / 86400000);
  if (diff < 0)  return { label: `Overdue by ${Math.abs(diff)}d`, cls: "due-overdue" };
  if (diff === 0) return { label: "Due Today",  cls: "due-soon" };
  if (diff <= 3)  return { label: `Due in ${diff}d`, cls: "due-soon" };
  return { label: `Due ${formatDate(dueDateStr)}`, cls: "due-ok" };
}

const CATEGORY_LABELS = {
  work:"💼 Work", personal:"🏠 Personal", health:"❤️ Health",
  learning:"📚 Learning", finance:"💰 Finance"
};

/* ─────────────────── Auth Storage ────────────────── */
function getSession()       { return JSON.parse(localStorage.getItem("tf_session") || "null"); }
function saveSession(user, token) { localStorage.setItem("tf_session", JSON.stringify({ user, token })); }
function clearSession()     { localStorage.removeItem("tf_session"); }

// API wrapper to attach JWT token
async function apiFetch(endpoint, options = {}) {
  const headers = { "Content-Type": "application/json" };
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
  
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: { ...headers, ...options.headers }
  });
  return res;
}

/* ─────────────────── Auth UI ─────────────────────── */
function switchAuthTab(tab) {
  document.getElementById("login-form").style.display    = tab === "login"    ? "flex" : "none";
  document.getElementById("register-form").style.display = tab === "register" ? "flex" : "none";
  document.getElementById("tab-login").classList.toggle("active",    tab === "login");
  document.getElementById("tab-register").classList.toggle("active", tab === "register");
  clearAuthErrors();
}

function clearAuthErrors() {
  ["login-error","register-error"].forEach(id => {
    const el = document.getElementById(id);
    el.textContent = ""; el.className = "auth-error";
  });
}

function showAuthError(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.className = "auth-error show";
}

function togglePass(inputId, btn) {
  const inp = document.getElementById(inputId);
  if (inp.type === "password") { inp.type = "text"; btn.textContent = "🙈"; }
  else                          { inp.type = "password"; btn.textContent = "👁"; }
}

async function handleLogin(e) {
  e.preventDefault();
  clearAuthErrors();
  const username = document.getElementById("login-username").value.trim();
  const password = document.getElementById("login-password").value;
  const btn = e.target.querySelector("button");
  if(btn) btn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    const json = await res.json();
    if (json.success) {
      saveSession(json.user, json.token);
      launchApp(json.user, json.token);
    } else {
      showAuthError("login-error", json.message || "Invalid credentials.");
    }
  } catch (err) {
    showAuthError("login-error", "Cannot reach server.");
  } finally {
    if(btn) btn.disabled = false;
  }
}

async function handleRegister(e) {
  e.preventDefault();
  clearAuthErrors();
  const firstname = document.getElementById("reg-firstname").value.trim();
  const lastname  = document.getElementById("reg-lastname").value.trim();
  const username  = document.getElementById("reg-username").value.trim();
  const email     = document.getElementById("reg-email").value.trim();
  const password  = document.getElementById("reg-password").value;
  const confirm   = document.getElementById("reg-confirm").value;

  if (username.length < 3)  { showAuthError("register-error", "Username must be at least 3 characters."); return; }
  if (password.length < 6)  { showAuthError("register-error", "Password must be at least 6 characters."); return; }
  if (password !== confirm) { showAuthError("register-error", "Passwords do not match."); return; }

  const btn = e.target.querySelector("button");
  if(btn) btn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstname, lastname, username, email, password })
    });
    const json = await res.json();
    if (json.success) {
      saveSession(json.user, json.token);
      launchApp(json.user, json.token);
    } else {
      showAuthError("register-error", json.message || "Registration failed.");
    }
  } catch (err) {
    showAuthError("register-error", "Cannot reach server.");
  } finally {
    if(btn) btn.disabled = false;
  }
}

function launchApp(user, token) {
  currentUser = user;
  authToken = token;
  document.getElementById("auth-screen").style.display = "none";
  document.getElementById("app-screen").style.display  = "block";
  applyUserUI(user);
  loadTodos();
}

function applyUserUI(user) {
  const initial  = (user.firstname || user.username || "U")[0].toUpperCase();
  const fullname = [user.firstname, user.lastname].filter(Boolean).join(" ") || user.username;
  
  const avatars = ["user-avatar", "user-avatar-lg", "avatar-preview"];
  avatars.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (user.avatar) {
      el.style.backgroundImage = `url(${user.avatar})`;
      el.textContent = "";
    } else {
      el.style.backgroundImage = "none";
      el.textContent = initial;
    }
  });

  document.getElementById("user-fullname").textContent  = fullname;
  document.getElementById("user-email-sm").textContent  = user.email || "";
  document.getElementById("greeting-name").textContent  = user.firstname || user.username;
}

function toggleUserDropdown() {
  const d = document.getElementById("user-dropdown");
  d.style.display = d.style.display === "none" ? "block" : "none";
}

document.addEventListener("click", e => {
  const menu = document.getElementById("user-menu");
  if (menu && !menu.contains(e.target)) {
    document.getElementById("user-dropdown").style.display = "none";
  }
});

function logout() {
  clearSession();
  currentUser = null;
  authToken   = null;
  allTodos    = [];
  document.getElementById("app-screen").style.display  = "none";
  document.getElementById("auth-screen").style.display = "flex";
  document.getElementById("user-dropdown").style.display = "none";
  switchAuthTab("login");
}

/* ─────────────────── Profile Modal ──────────────── */
function openProfileModal() {
  document.getElementById("user-dropdown").style.display = "none";
  document.getElementById("p-firstname").value = currentUser.firstname || "";
  document.getElementById("p-lastname").value  = currentUser.lastname  || "";
  document.getElementById("p-email").value     = currentUser.email     || "";
  document.getElementById("p-newpass").value   = "";
  pendingAvatarUrl = null; // Reset pending avatar
  
  // Reset avatar preview to current user's avatar if they have one
  const previewEl = document.getElementById("avatar-preview");
  if (currentUser.avatar) {
    previewEl.style.backgroundImage = `url(${currentUser.avatar})`;
    previewEl.textContent = "";
  } else {
    previewEl.style.backgroundImage = "none";
    previewEl.textContent = (currentUser.firstname || currentUser.username || "U")[0].toUpperCase();
  }

  document.getElementById("profile-modal").style.display = "flex";
}

function closeProfileModal(e) {
  if (!e || e.target.id === "profile-modal")
    document.getElementById("profile-modal").style.display = "none";
}

function previewAvatar(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    pendingAvatarUrl = evt.target.result;
    const previewEl = document.getElementById("avatar-preview");
    previewEl.style.backgroundImage = `url(${pendingAvatarUrl})`;
    previewEl.textContent = "";
  };
  reader.readAsDataURL(file);
}

async function saveProfile() {
  const firstname = document.getElementById("p-firstname").value.trim();
  const lastname  = document.getElementById("p-lastname").value.trim();
  const email     = document.getElementById("p-email").value.trim();
  const newpass   = document.getElementById("p-newpass").value;

  if (newpass && newpass.length < 6) { alert("New password must be at least 6 characters."); return; }

  try {
    const payload = { firstname, lastname, email, password: newpass };
    if (pendingAvatarUrl) payload.avatar = pendingAvatarUrl;

    const res = await apiFetch("/auth/profile", {
      method: "PUT",
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (json.success) {
      saveSession(json.user, authToken);
      currentUser = json.user;
      applyUserUI(currentUser);
      document.getElementById("profile-modal").style.display = "none";
      showToast("✅ Profile updated!");
    } else {
      alert(json.message || "Failed to update profile");
    }
  } catch (err) {
    alert("Could not update profile. Server error.");
  }
}

/* ─────────────────── Stats ─────────────────────── */
function updateStats() {
  const total   = allTodos.length;
  const done    = allTodos.filter(t => t.completed).length;
  const pending = total - done;
  const pct     = total > 0 ? Math.round((done / total) * 100) : 0;
  const overdue = allTodos.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < new Date().setHours(0,0,0,0)).length;

  document.getElementById("count-total").textContent   = total;
  document.getElementById("count-done").textContent    = done;
  document.getElementById("count-pending").textContent = pending;
  document.getElementById("count-overdue").textContent = overdue;
  document.getElementById("progress-fill").style.width = pct + "%";
  document.getElementById("progress-label").textContent = pct + "% complete";

  const overdueEl = document.getElementById("stat-overdue");
  overdueEl.style.display = overdue > 0 ? "flex" : "none";

  // Tab counts
  const counts = {
    all:       allTodos.length,
    pending:   allTodos.filter(t => !t.completed).length,
    completed: allTodos.filter(t => t.completed).length,
    overdue:   overdue
  };
  ["all","pending","completed","overdue"].forEach(k => {
    const el = document.getElementById(`tc-${k}`);
    if (el) el.textContent = counts[k];
  });
}

/* ─────────────────── Render ─────────────────────── */
function renderTodos() {
  const today = new Date(); today.setHours(0,0,0,0);
  let filtered = [...allTodos];

  // Status filter
  if (currentFilter === "pending")   filtered = filtered.filter(t => !t.completed);
  if (currentFilter === "completed") filtered = filtered.filter(t => t.completed);
  if (currentFilter === "overdue")   filtered = filtered.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < today);

  // Priority & category
  if (currentPriority) filtered = filtered.filter(t => t.priority === currentPriority);
  if (currentCategory) filtered = filtered.filter(t => t.category === currentCategory);

  // Search
  if (currentSearch) {
    const q = currentSearch.toLowerCase();
    filtered = filtered.filter(t => t.title.toLowerCase().includes(q) || (t.description || "").toLowerCase().includes(q));
  }

  // Sort
  const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };
  if (currentSort === "oldest")   filtered.sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));
  else if (currentSort === "priority") filtered.sort((a,b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  else if (currentSort === "title")    filtered.sort((a,b) => a.title.localeCompare(b.title));
  else if (currentSort === "due")      filtered.sort((a,b) => {
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate) - new Date(b.dueDate);
  });
  else filtered.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

  const list  = document.getElementById("task-list");
  const empty = document.getElementById("empty-state");
  list.querySelectorAll(".task-card").forEach(c => c.remove());
  document.getElementById("loader").style.display = "none";

  if (filtered.length === 0) { empty.style.display = "block"; return; }
  empty.style.display = "none";

  filtered.forEach(todo => {
    const card = document.createElement("div");
    card.className = `task-card ${todo.completed ? "done" : ""}`;
    card.setAttribute("data-priority", todo.priority);

    const dueInfo  = getDueInfo(todo.dueDate);
    const dueBadge = dueInfo && !todo.completed
      ? `<span class="due-badge ${dueInfo.cls}">📅 ${escHtml(dueInfo.label)}</span>` : "";
    const catBadge = todo.category
      ? `<span class="cat-badge">${escHtml(CATEGORY_LABELS[todo.category] || todo.category)}</span>` : "";

    card.innerHTML = `
      <div class="task-check ${todo.completed ? "checked" : ""}"
           onclick="toggleTodo('${todo.id}')" title="Toggle complete">
        ${todo.completed ? "✓" : ""}
      </div>
      <div class="task-content">
        <div class="task-title">${escHtml(todo.title)}</div>
        ${todo.description ? `<div class="task-desc">${escHtml(todo.description)}</div>` : ""}
        <div class="task-meta">
          <span class="task-badge badge-${todo.priority}">${todo.priority}</span>
          ${catBadge}
          ${dueBadge}
          <span class="task-date">Added ${formatDate(todo.createdAt)}</span>
        </div>
      </div>
      <div class="task-actions">
        <button class="action-btn" onclick="openEdit('${todo.id}')" title="Edit">✎</button>
        <button class="action-btn delete" onclick="deleteTodo('${todo.id}')" title="Delete">✕</button>
      </div>
    `;
    list.appendChild(card);
  });
}

/* ─────────────────── Load ───────────────────────── */
async function loadTodos() {
  document.getElementById("loader").style.display = "flex";
  document.getElementById("empty-state").style.display = "none";
  try {
    const res  = await apiFetch("/todos");
    if(res.status === 401) {
      logout();
      showToast("Session expired. Please log in again.", "error");
      return;
    }
    const json = await res.json();
    allTodos = json.data || [];
    updateStats(); renderTodos();
  } catch {
    document.getElementById("loader").style.display = "none";
    showToast("⚠ Cannot reach API — is the server running?", "error");
  }
}

/* ─────────────────── Add ────────────────────────── */
async function addTodo() {
  const title    = document.getElementById("input-title").value.trim();
  const desc     = document.getElementById("input-desc").value.trim();
  const priority = document.getElementById("input-priority").value;
  const category = document.getElementById("input-category").value;
  const dueDate  = document.getElementById("input-due").value;

  if (!title) { showToast("Please enter a task title.", "error"); return; }

  const btn = document.getElementById("btn-add");
  btn.disabled = true; btn.textContent = "Adding...";
  try {
    const res  = await apiFetch("/todos", {
      method: "POST",
      body: JSON.stringify({ title, description: desc, priority, category, dueDate }),
    });
    const json = await res.json();
    if (json.success) {
      allTodos.push(json.data);
      document.getElementById("input-title").value    = "";
      document.getElementById("input-desc").value     = "";
      document.getElementById("input-priority").value = "medium";
      document.getElementById("input-category").value = "";
      document.getElementById("input-due").value      = "";
      updateStats(); renderTodos();
      showToast("✅ Task added successfully!");
    } else { showToast(json.message || "Failed to add task", "error"); }
  } catch { showToast("⚠ Server error — check if API is running.", "error"); }
  finally  { btn.disabled = false; btn.innerHTML = '<span class="btn-icon">+</span> Add Task'; }
}

/* ─────────────────── Toggle ─────────────────────── */
async function toggleTodo(id) {
  try {
    const res  = await apiFetch(`/todos/${id}/toggle`, { method: "PATCH" });
    const json = await res.json();
    if (json.success) {
      const idx = allTodos.findIndex(t => t.id === id);
      if (idx !== -1) allTodos[idx] = json.data;
      updateStats(); renderTodos();
    }
  } catch { showToast("⚠ Could not toggle task.", "error"); }
}

/* ─────────────────── Delete ─────────────────────── */
async function deleteTodo(id) {
  if (!confirm("Delete this task?")) return;
  try {
    const res  = await apiFetch(`/todos/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) {
      allTodos = allTodos.filter(t => t.id !== id);
      updateStats(); renderTodos(); showToast("🗑 Task deleted.");
    }
  } catch { showToast("⚠ Could not delete task.", "error"); }
}

/* ─────────────────── Clear Completed ───────────────  */
async function clearCompleted() {
  const done = allTodos.filter(t => t.completed).length;
  if (done === 0) { showToast("No completed tasks to clear.", "error"); return; }
  if (!confirm(`Delete ${done} completed task(s)?`)) return;
  try {
    const res  = await apiFetch(`/todos/clear`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) {
      allTodos = allTodos.filter(t => !t.completed);
      updateStats(); renderTodos();
      showToast(`🗑 Cleared ${done} completed task(s).`);
    }
  } catch { showToast("⚠ Could not clear tasks.", "error"); }
}

/* ─────────────────── Edit Modal ─────────────────── */
function openEdit(id) {
  const todo = allTodos.find(t => t.id === id);
  if (!todo) return;
  document.getElementById("edit-id").value       = todo.id;
  document.getElementById("edit-title").value    = todo.title;
  document.getElementById("edit-desc").value     = todo.description || "";
  document.getElementById("edit-priority").value = todo.priority;
  document.getElementById("edit-category").value = todo.category  || "";
  document.getElementById("edit-due").value      = todo.dueDate   || "";
  document.getElementById("modal").style.display = "flex";
}

function closeModal(e) {
  if (!e || e.target.id === "modal")
    document.getElementById("modal").style.display = "none";
}

async function saveEdit() {
  const id       = document.getElementById("edit-id").value;
  const title    = document.getElementById("edit-title").value.trim();
  const desc     = document.getElementById("edit-desc").value.trim();
  const priority = document.getElementById("edit-priority").value;
  const category = document.getElementById("edit-category").value;
  const dueDate  = document.getElementById("edit-due").value;

  if (!title) { alert("Title cannot be empty."); return; }
  try {
    const todo = allTodos.find(t => t.id === id);
    const res  = await apiFetch(`/todos/${id}`, {
      method: "PUT",
      body: JSON.stringify({ title, description: desc, priority, category, dueDate, completed: todo?.completed }),
    });
    const json = await res.json();
    if (json.success) {
      const idx = allTodos.findIndex(t => t.id === id);
      if (idx !== -1) allTodos[idx] = json.data;
      closeModal(); renderTodos(); showToast("✏ Task updated!");
    }
  } catch { showToast("⚠ Could not update task.", "error"); }
}

/* ─────────────────── Search ─────────────────────── */
function clearSearch() {
  document.getElementById("search-input").value = "";
  document.getElementById("search-clear").style.display = "none";
  currentSearch = "";
  applyFilters();
}

/* ─────────────────── Filters & Sort ────────────────  */
function setFilter(filter, btn) {
  currentFilter = filter;
  document.querySelectorAll(".filter-tab").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  renderTodos();
}

function applyFilters() {
  currentPriority = document.getElementById("priority-filter").value;
  currentCategory = document.getElementById("category-filter").value;
  currentSort     = document.getElementById("sort-select").value;
  const q = document.getElementById("search-input").value.trim();
  currentSearch = q;
  document.getElementById("search-clear").style.display = q ? "block" : "none";
  renderTodos();
}

/* ─────────────────── Keyboard Shortcuts ────────────  */
document.addEventListener("keydown", e => {
  if (e.key === "Enter" && document.activeElement.id === "input-title") addTodo();
  if (e.key === "Escape") {
    closeModal();
    closeProfileModal();
    document.getElementById("user-dropdown").style.display = "none";
  }
});

/* ─────────────────── Init ───────────────────────── */
(function init() {
  // Initialize modern date picker
  if (typeof flatpickr !== "undefined") {
    flatpickr("#input-due", {
      dateFormat: "Y-m-d",
      minDate: "today",
      placeholder: "Select a due date..."
    });
    flatpickr("#edit-due", {
      dateFormat: "Y-m-d",
      placeholder: "Select a due date..."
    });
  }

  const session = getSession();
  if (session && session.token) { 
    launchApp(session.user, session.token); 
  }
  else {
    document.getElementById("auth-screen").style.display = "flex";
    document.getElementById("app-screen").style.display  = "none";
  }
})();
