// scriptdsh.js
const supabaseUrl = 'https://piaycptnvkyahallyysx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpYXljcHRudmt5YWhhbGx5eXN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMTIyMzcsImV4cCI6MjA4NjU4ODIzN30.ADYwz_gLL7GzsZXOvWTSLNWyaYQurR3fGQdzl7qnEWU';
const supabaselokal = supabase.createClient(supabaseUrl, supabaseAnonKey);

// ==================== KONFIGURASI SESSION ====================
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 menit dalam milidetik
const WARNING_BEFORE_TIMEOUT = 2 * 60 * 1000; // Tampilkan warning 2 menit sebelum timeout
const SESSION_CHECK_INTERVAL = 60000; // Cek session setiap 1 menit

// Inisialisasi user dari localStorage
let user = null;
let sessionToken = localStorage.getItem('adminSessionToken');
let sessionTimer = null;
let warningTimer = null;
let countdownInterval = null;
let lastActivityTime = Date.now();

// ==================== FUNGSI SESSION MANAGEMENT ====================

// Generate unique session token
function generateSessionToken() {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Update aktivitas user
function updateActivity() {
  lastActivityTime = Date.now();
  resetTimers();
}

// Reset semua timer
function resetTimers() {
  // Hapus timer lama
  if (sessionTimer) clearTimeout(sessionTimer);
  if (warningTimer) clearTimeout(warningTimer);
  if (countdownInterval) clearInterval(countdownInterval);
  
  // Reset UI warning
  const warningModal = document.getElementById('sessionWarningModal');
  if (warningModal) warningModal.style.display = 'none';
  
  // Set timer untuk logout otomatis
  sessionTimer = setTimeout(() => {
    handleSessionTimeout();
  }, SESSION_TIMEOUT);
  
  // Set timer untuk menampilkan warning
  if (WARNING_BEFORE_TIMEOUT < SESSION_TIMEOUT) {
    warningTimer = setTimeout(() => {
      showSessionWarning();
    }, SESSION_TIMEOUT - WARNING_BEFORE_TIMEOUT);
  }
}

// Tampilkan modal warning session akan habis
function showSessionWarning() {
  const warningModal = document.getElementById('sessionWarningModal');
  if (!warningModal) {
    createWarningModal();
  }
  
  const modal = document.getElementById('sessionWarningModal');
  const countdownEl = document.getElementById('sessionCountdown');
  
  modal.style.display = 'flex';
  
  let remainingTime = WARNING_BEFORE_TIMEOUT / 1000;
  if (countdownEl) {
    countdownEl.textContent = formatTime(remainingTime);
  }
  
  // Update countdown setiap detik
  countdownInterval = setInterval(() => {
    remainingTime--;
    if (countdownEl) {
      countdownEl.textContent = formatTime(remainingTime);
    }
    if (remainingTime <= 0) {
      clearInterval(countdownInterval);
    }
  }, 1000);
}

// Format waktu ke mm:ss
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Buat modal warning jika belum ada
function createWarningModal() {
  const modalHTML = `
    <div id="sessionWarningModal" style="
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.7);
      z-index: 10000;
      justify-content: center;
      align-items: center;
    ">
      <div style="
        background: white;
        padding: 30px;
        border-radius: 10px;
        text-align: center;
        max-width: 400px;
      ">
        <h2 style="color: #e74c3c; margin-bottom: 15px;">⚠️ Sesi Akan Berakhir</h2>
        <p>Session Anda akan berakhir dalam:</p>
        <h1 id="sessionCountdown" style="font-size: 48px; color: #e74c3c; margin: 20px 0;">02:00</h1>
        <p>Apakah Anda ingin melanjutkan session?</p>
        <div style="margin-top: 20px;">
          <button id="extendSessionBtn" style="
            background: #27ae60;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            margin-right: 10px;
          ">Ya, Lanjutkan</button>
          <button id="logoutNowBtn" style="
            background: #e74c3c;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
          ">Logout Sekarang</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  
  // Event listeners untuk tombol
  document.getElementById('extendSessionBtn').addEventListener('click', extendSession);
  document.getElementById('logoutNowBtn').addEventListener('click', logout);
}

// Perpanjang session
async function extendSession() {
  try {
    // Update last_active dan session_expires_at di database
    const { error } = await supabaselokal
      .from('administrator')
      .update({
        last_active: new Date().toISOString(),
        session_expires_at: new Date(Date.now() + SESSION_TIMEOUT).toISOString()
      })
      .eq('username', user.username);
    
    if (error) throw error;
    
    // Reset timer
    resetTimers();
    
    // Update localStorage
    localStorage.setItem('adminLastActivity', Date.now());
    
  } catch (error) {
    console.error('Error extending session:', error);
    logout();
  }
}

// Handle session timeout
async function handleSessionTimeout() {
  try {
    // Update status di database
    await supabaselokal
      .from('administrator')
      .update({
        session_token: null,
        last_active: null,
        session_expires_at: null
      })
      .eq('username', user.username);
    
    // Hapus localStorage
    localStorage.removeItem('adminSessionToken');
    localStorage.removeItem('adminLastActivity');
    
    // Tampilkan pesan
    alert('Session Anda telah berakhir karena tidak ada aktivitas selama ' + (SESSION_TIMEOUT / 60000) + ' menit. Silakan login kembali.');
    
    // Redirect ke login
    window.location.href = 'login.html';
    
  } catch (error) {
    console.error('Error handling session timeout:', error);
    logout();
  }
}

// Periodic session check
async function checkSessionValidity() {
  try {
    if (!sessionToken || !user) return;
    
    // Validasi session di database
    const { data, error } = await supabaselokal
      .from('administrator')
      .select('session_token, session_expires_at, status_akun')
      .eq('username', user.username)
      .single();
    
    if (error) throw error;
    
    // Cek apakah session masih valid
    if (!data.session_token || 
        data.session_token !== sessionToken ||
        data.status_akun !== 'Aktif' ||
        !data.session_expires_at ||
        new Date(data.session_expires_at) < new Date()) {
      
      // Session tidak valid, logout
      logout();
    }
    
  } catch (error) {
    console.error('Error checking session:', error);
    // Jika error, tetap logout untuk keamanan
    logout();
  }
}

// ==================== AUTENTIKASI ====================

async function initializeSession() {
  if (!sessionToken) {
    window.location.href = 'login.html';
    return false;
  }
  
  try {
    // Validasi session di database
    const { data, error } = await supabaselokal
      .from('administrator')
      .select('*')
      .eq('username', user.username)
      .single();
    
    if (error) throw error;
    
    // Cek apakah session token cocok
    if (data.session_token !== sessionToken) {
      localStorage.removeItem('adminSessionToken');
      window.location.href = 'login.html';
      return false;
    }
    
    // Cek status akun
    if (data.status_akun !== 'Aktif') {
      alert('Akun Anda telah dinonaktifkan. Silakan hubungi Admin.');
      logout();
      return false;
    }
    
    // Update last_active
    const { error: updateError } = await supabaselokal
      .from('administrator')
      .update({
        last_active: new Date().toISOString(),
        session_expires_at: new Date(Date.now() + SESSION_TIMEOUT).toISOString()
      })
      .eq('username', user.username);
    
    if (updateError) throw updateError;
    
    return true;
    
  } catch (error) {
    console.error('Error initializing session:', error);
    return false;
  }
}

// Setup activity listeners
function setupActivityListeners() {
  const events = ['mousemove', 'keypress', 'click', 'scroll', 'touchstart'];
  
  events.forEach(event => {
    document.addEventListener(event, updateActivity, { passive: true });
  });
  
  // Periodic session check
  setInterval(checkSessionValidity, SESSION_CHECK_INTERVAL);
  
  // Periodic activity update (setiap 5 menit)
  setInterval(async () => {
    try {
      await supabaselokal
        .from('administrator')
        .update({
          last_active: new Date().toISOString(),
          session_expires_at: new Date(Date.now() + SESSION_TIMEOUT).toISOString()
        })
        .eq('username', user.username);
      
      localStorage.setItem('adminLastActivity', Date.now());
      
    } catch (error) {
      console.error('Error updating activity:', error);
    }
  }, 5 * 60 * 1000);
}

// ==================== INISIALISASI ====================

if (localStorage.getItem('adminLoggedIn')) {
  user = {
    username: localStorage.getItem('adminUsername'),
    role: localStorage.getItem('adminRole'),
    name: localStorage.getItem('adminName')
  };
  
  sessionToken = localStorage.getItem('adminSessionToken');
}

if (!user || !sessionToken) {
  window.location.href = 'login.html';
}

// Validasi session saat load
initializeSession().then(isValid => {
  if (!isValid) return;
  
  // Setup activity listeners
  setupActivityListeners();
  
  // Reset timer
  resetTimers();
  
  // Set nama user di UI
  if (document.getElementById('userName')) {
    document.getElementById('userName').innerText = user.name;
  }
  
  // Tampilkan menu moderator jika admin
  if (user.role === 'Admin' && document.getElementById('moderatorMenu')) {
    document.getElementById('moderatorMenu').style.display = 'block';
  }
});

// Tampilkan info session di UI
function updateSessionStatus() {
  const lastActivity = localStorage.getItem('adminLastActivity');
  if (lastActivity) {
    const diff = Date.now() - parseInt(lastActivity);
    const minutesLeft = Math.round((SESSION_TIMEOUT - diff) / 60000);
    
    const statusEl = document.getElementById('sessionStatus');
    if (statusEl) {
      statusEl.textContent = `Session aktif: ${Math.max(0, minutesLeft)} menit tersisa`;
      statusEl.style.color = minutesLeft < 5 ? 'red' : 'green';
    }
  }
}

// Update status setiap menit
setInterval(updateSessionStatus, 60000);
// ==================== FUNGSI LAINNYA (SAMA SEPERTI SEMULA) ====================

let editingPrestasiId = null;
let editingKaryaId = null;
let editingModUsername = null;
let editingSiswaId = null;

function logout() {
  // Cleanup timers
  if (sessionTimer) clearTimeout(sessionTimer);
  if (warningTimer) clearTimeout(warningTimer);
  if (countdownInterval) clearInterval(countdownInterval);
  
  // Hapus session di database
  if (user && user.username) {
    supabaselokal
      .from('administrator')
      .update({
        session_token: null,
        last_active: null,
        session_expires_at: null
      })
      .eq('username', user.username)
      .then();
  }
  
  // Hapus localStorage
  localStorage.removeItem('adminLoggedIn');
  localStorage.removeItem('adminName');
  localStorage.removeItem('adminUsername');
  localStorage.removeItem('adminRole');
  localStorage.removeItem('adminSessionToken');
  localStorage.removeItem('adminLastActivity');
  
  // Redirect
  window.location.href = 'login.html';
}

function showTab(tabName) {
  document.querySelectorAll('.section').forEach(section => section.classList.remove('active'));
  document.querySelectorAll('.sidebar-link').forEach(link => link.classList.remove('active'));
  document.getElementById(tabName + '-section').classList.add('active');
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
  
  const titles = {
    prestasi: 'Kelola Prestasi',
    karya: 'Kelola Karya Siswa',
    moderator: 'Kelola Moderator',
    settings: 'Pengaturan Akun',
    siswamng: 'Kelola Siswa'
  };
  
  if (document.getElementById('pageTitle')) {
    document.getElementById('pageTitle').innerText = titles[tabName];
  }
  
  if (tabName === 'prestasi') loadPrestasi();
  else if (tabName === 'karya') loadKarya();
  else if (tabName === 'moderator' && user.role === 'Admin') {
    loadModerators();
    loadAdmins();
  }
  else if (tabName === 'siswamng') loadSiswa();
}

// ==================== PRESTASI FUNCTIONS ====================
async function loadPrestasi() {
  try {
    const { data: prestasi, error } = await supabaselokal
      .from('prestasi')
      .select('*');
    
    if (error) throw error;
    
    const list = document.getElementById('prestasiList');
    const noPrestasi = document.getElementById('noPrestasi');
    
    if (list) list.innerHTML = '';
    
    if (prestasi.length === 0) {
      if (noPrestasi) noPrestasi.style.display = 'block';
    } else {
      if (noPrestasi) noPrestasi.style.display = 'none';
      prestasi.forEach((item) => {
        const li = document.createElement('li');
        li.className = 'prestasi-item';
        li.innerHTML = `
          <div>
            <img src="${item.image_url}" style="width: 50px; height: auto; border-radius: 5px; margin-right: 10px;">
            <h3>${item.title}</h3>
            <p>${item.description}</p>
          </div>
          <div>
            <button class="edit-btn" onclick="editPrestasi(${item.id})">Edit</button>
            <button class="delete-btn" onclick="deletePrestasi(${item.id})">Hapus</button>
          </div>
        `;
        if (list) list.appendChild(li);
      });
    }
  } catch (error) {
    console.error('Error loading prestasi:', error);
  }
}

// ... (fungsi editPrestasi, deletePrestasi, loadKarya, dll - sama seperti sebelumnya) ...

// ==================== KARYA FUNCTIONS (Lanjutan) ====================

async function loadKarya() {
  try {
    const { data: karya, error } = await supabaselokal.from('karya').select('*');
    if (error) throw error;
    
    const list = document.getElementById('karyaList');
    const noKarya = document.getElementById('noKarya');
    
    if (list) list.innerHTML = '';
    
    if (karya.length === 0) {
      if (noKarya) noKarya.style.display = 'block';
    } else {
      if (noKarya) noKarya.style.display = 'none';
      karya.forEach((item) => {
        const li = document.createElement('li');
        li.className = 'karya-item';
        li.innerHTML = `
          <div>
            <img src="${item.image_url}" style="width: 50px; height: auto; border-radius: 5px; margin-right: 10px;">
            <h3>${item.title}</h3>
            <p>${item.description}</p>
          </div>
          <div>
            <button class="edit-btn" onclick="editKarya(${item.id})">Edit</button>
            <button class="delete-btn" onclick="deleteKarya(${item.id})">Hapus</button>
          </div>
        `;
        if (list) list.appendChild(li);
      });
    }
  } catch (error) {
    console.error('Error loading karya:', error);
  }
}

async function editPrestasi(id) {
  try {
    const { data: item, error } = await supabaselokal.from('prestasi').select('*').eq('id', id).single();
    if (error) throw error;
    if (document.getElementById('ImageUrl')) document.getElementById('ImageUrl').value = item.image_url || '';
    if (document.getElementById('title')) document.getElementById('title').value = item.title || '';
    if (document.getElementById('description')) document.getElementById('description').value = item.description || '';
    if (document.getElementById('prestasiSubmitBtn')) document.getElementById('prestasiSubmitBtn').textContent = 'Update Prestasi';
    if (document.getElementById('prestasiFormTitle')) document.getElementById('prestasiFormTitle').textContent = 'Edit Prestasi';
    if (document.getElementById('cancelPrestasiBtn')) document.getElementById('cancelPrestasiBtn').style.display = 'inline-block';
    editingPrestasiId = id;
  } catch (error) {
    console.error('Error fetching prestasi:', error);
  }
}

async function editKarya(id) {
  try {
    const { data: item, error } = await supabaselokal.from('karya').select('*').eq('id', id).single();
    if (error) throw error;
    if (document.getElementById('karyaImageUrl')) document.getElementById('karyaImageUrl').value = item.image_url || '';
    if (document.getElementById('karyaTitle')) document.getElementById('karyaTitle').value = item.title || '';
    if (document.getElementById('karyaDescription')) document.getElementById('karyaDescription').value = item.description || '';
    if (document.getElementById('karyaSubmitBtn')) document.getElementById('karyaSubmitBtn').textContent = 'Update Karya';
    if (document.getElementById('karyaFormTitle')) document.getElementById('karyaFormTitle').textContent = 'Edit Karya Siswa';
    if (document.getElementById('cancelKaryaBtn')) document.getElementById('cancelKaryaBtn').style.display = 'inline-block';
    editingKaryaId = id;
  } catch (error) {
    console.error('Error fetching karya:', error);
  }
}

async function deletePrestasi(id) {
  if (!confirm('Apakah Anda yakin ingin menghapus prestasi ini?')) return;
  try {
    const { error } = await supabaselokal.from('prestasi').delete().eq('id', id);
    if (error) throw error;
    loadPrestasi();
  } catch (error) {
    console.error('Error deleting prestasi:', error);
  }
}

async function deleteKarya(id) {
  if (!confirm('Apakah Anda yakin ingin menghapus karya siswa ini?')) return;
  try {
    const { error } = await supabaselokal.from('karya').delete().eq('id', id);
    if (error) throw error;
    loadKarya();
  } catch (error) {
    console.error('Error deleting karya:', error);
  }
}

// ==================== MODERATOR & ADMIN FUNCTIONS ====================

async function loadModerators() {
  if (user.role !== 'Admin') return;
  try {
    const { data: accounts, error } = await supabaselokal.from('administrator').select('*');
    if (error) throw error;
    
    const mods = accounts.filter(acc => acc.peran === 'Moderator');
    const list = document.getElementById('moderatorList');
    if (list) list.innerHTML = '';
    
    mods.forEach((mod) => {
      const li = document.createElement('li');
      li.className = 'moderator-item';
      li.innerHTML = `
        <div>
          <h3>${mod.username}</h3>
          <p>Role: Moderator | Status: ${mod.status_akun === 'Aktif' ? 'Aktif' : 'Nonaktif'}</p>
        </div>
        <div>
          <button class="toggle-btn ${mod.status_akun === 'Aktif' ? '' : 'inactive'}" onclick="toggleActive('${mod.username}')">${mod.status_akun === 'Aktif' ? 'Nonaktifkan' : 'Aktifkan'}</button>
          ${mod.editable ? `<button class="edit-btn" onclick="editModerator('${mod.username}')">Edit</button>` : ''}
          ${mod.editable ? `<button class="delete-btn" onclick="deleteModerator('${mod.username}')">Hapus</button>` : ''}
        </div>
      `;
      if (list) list.appendChild(li);
    });
  } catch (error) {
    console.error('Error loading moderators:', error);
  }
}

async function loadAdmins() {
  if (user.role !== 'Admin') return;
  try {
    const { data: accounts, error } = await supabaselokal.from('administrator').select('*');
    if (error) throw error;
    
    const admins = accounts.filter(acc => acc.peran === 'Admin');
    const list = document.getElementById('adminList');
    if (list) list.innerHTML = '';
    
    admins.forEach((adm) => {
      const li = document.createElement('li');
      li.className = 'admin-item';
      li.innerHTML = `
        <div>
          <h3>${adm.username}</h3>
          <p>Role: Admin | Status: ${adm.status_akun === 'Aktif' ? 'Aktif' : 'Nonaktif'}</p>
        </div>
        <div>
          ${adm.username !== user.username && adm.editable ? `<button class="toggle-btn ${adm.status_akun === 'Aktif' ? '' : 'inactive'}" onclick="toggleActive('${adm.username}')">${adm.status_akun === 'Aktif' ? 'Nonaktifkan' : 'Aktifkan'}</button>` : ''}
          ${adm.username !== user.username && adm.editable ? `<button class="edit-btn" onclick="editAdmin('${adm.username}')">Edit</button>` : ''}
          ${adm.username !== user.username && adm.editable ? `<button class="delete-btn" onclick="deleteAdmin('${adm.username}')">Hapus</button>` : '<span>(not allowed)</span>'}
        </div>
      `;
      if (list) list.appendChild(li);
    });
  } catch (error) {
    console.error('Error loading admins:', error);
  }
}

async function editModerator(username) {
  if (user.role !== 'Admin') {
    alert('Akses ditolak!');
    return;
  }
  try {
    const { data: account, error } = await supabaselokal.from('administrator').select('*').eq('username', username).single();
    if (error) throw error;
    if (document.getElementById('modUsername')) document.getElementById('modUsername').value = account.username;
    if (document.getElementById('modPassword')) document.getElementById('modPassword').value = account.password;
    if (document.getElementById('modActive')) document.getElementById('modActive').checked = account.status_akun === 'Aktif';
    if (document.getElementById('modSubmitBtn')) document.getElementById('modSubmitBtn').textContent = 'Update Moderator';
    if (document.getElementById('modFormTitle')) document.getElementById('modFormTitle').textContent = 'Edit Moderator';
    if (document.getElementById('cancelModBtn')) document.getElementById('cancelModBtn').style.display = 'inline-block';
    editingModUsername = username;
  } catch (error) {
    console.error('Error fetching moderator:', error);
  }
}

async function editAdmin(username) {
  if (user.role !== 'Admin' || username === user.username) {
    alert('Akses ditolak!');
    return;
  }
  try {
    const { data: account, error } = await supabaselokal.from('administrator').select('*').eq('username', username).single();
    if (error) throw error;
    if (document.getElementById('modUsername')) document.getElementById('modUsername').value = account.username;
    if (document.getElementById('modPassword')) document.getElementById('modPassword').value = account.password;
    if (document.getElementById('modActive')) document.getElementById('modActive').checked = account.status_akun === 'Aktif';
    if (document.getElementById('modSubmitBtn')) document.getElementById('modSubmitBtn').textContent = 'Update Admin';
    if (document.getElementById('modFormTitle')) document.getElementById('modFormTitle').textContent = 'Edit Admin';
    if (document.getElementById('cancelModBtn')) document.getElementById('cancelModBtn').style.display = 'inline-block';
    editingModUsername = username;
  } catch (error) {
    console.error('Error fetching admin:', error);
  }
}

async function deleteModerator(username) {
  if (user.role !== 'Admin') {
    alert('Akses ditolak!');
    return;
  }
  const { data: account } = await supabaselokal.from('administrator').select('editable').eq('username', username).single();
  if (!account.editable) {
    alert('Akun ini tidak dapat dihapus!');
    return;
  }
  if (!confirm('Apakah Anda yakin ingin menghapus moderator ini?')) return;
  try {
    const { error } = await supabaselokal.from('administrator').delete().eq('username', username);
    if (error) throw error;
    loadModerators();
  } catch (error) {
    console.error('Error deleting moderator:', error);
  }
}

async function deleteAdmin(username) {
  if (user.role !== 'Admin' || username === user.username) {
    alert('Akses ditolak!');
    return;
  }
  const { data: account } = await supabaselokal.from('administrator').select('editable').eq('username', username).single();
  if (!account.editable) {
    alert('Akun ini tidak dapat dihapus!');
    return;
  }
  if (!confirm('Apakah Anda yakin ingin menghapus admin ini?')) return;
  try {
    const { error } = await supabaselokal.from('administrator').delete().eq('username', username);
    if (error) throw error;
    loadAdmins();
  } catch (error) {
    console.error('Error deleting admin:', error);
  }
}

async function toggleActive(username) {
  if (user.role !== 'Admin') {
    alert('Akses ditolak!');
    return;
  }
  try {
    const { data: account, error: fetchError } = await supabaselokal.from('administrator').select('*').eq('username', username).single();
    if (fetchError) throw fetchError;
    const newStatus = account.status_akun === 'Aktif' ? 'Tidak Aktif' : 'Aktif';
    const { error } = await supabaselokal.from('administrator').update({ status_akun: newStatus }).eq('username', username);
    if (error) throw error;
    loadModerators();
    loadAdmins();
  } catch (error) {
    console.error('Error toggling active:', error);
  }
}

// ==================== SISWA FUNCTIONS ====================

async function loadSiswa() {
  if (user.role !== 'Admin') {
    const tomboladdsiswa = document.getElementById('addSiswaBtn');
    if (tomboladdsiswa) tomboladdsiswa.style.display = 'none';
  }
  try {
    const { data: siswa, error } = await supabaselokal.from('siswa').select('*').order('id', { ascending: true });
    if (error) throw error;
    
    const list = document.getElementById('siswaList');
    const noSiswa = document.getElementById('noSiswa');
    
    if (list) list.innerHTML = '';
    
    if (siswa.length === 0) {
      if (noSiswa) noSiswa.style.display = 'block';
    } else {
      if (noSiswa) noSiswa.style.display = 'none';
      siswa.forEach((item) => {
        const li = document.createElement('li');
        li.className = 'siswa-item';
        li.innerHTML = `
          <div>
            <h3>${item.nama_siswa} (Presensi: ${item.id})</h3>
            <p>IG: ${item['akun IG'] || 'N/A'} | TikTok: ${item['akun Tiktok'] || 'N/A'}</p>
          </div>
          <div class="aksi-container">
            <button class="aksi-btn" onclick="toggleAksiMenu(event, this)">Aksi</button>
            <div class="aksi-menu" style="display: none;">
              <button onclick="editSiswa(${item.id})" style="background-color: #007bff;" class="btn2">Edit</button>
              <button onclick="deleteSiswa(${item.id})" style="background-color: #dc3545;" class="btn2">Hapus</button>
              <button onclick="resetpasswordSiswa(${item.id})" style="background-color: #28a745;" class="btn2">Reset Password</button>
            </div>
          </div>
        `;
        if (list) list.appendChild(li);
      });
    }
  } catch (error) {
    console.error('Error loading siswa:', error);
  }
}

function toggleAksiMenu(event, btn) {
  event.stopPropagation();
  const menu = btn.nextElementSibling;
  menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
}

async function editSiswa(id) {
  try {
    const { data: item, error } = await supabaselokal.from('siswa').select('*').eq('id', id).single();
    if (error) throw error;
    if (document.getElementById('siswaNama')) document.getElementById('siswaNama').value = item.nama_siswa || '';
    if (document.getElementById('siswaIg')) document.getElementById('siswaIg').value = item['akun IG'] || '';
    if (document.getElementById('siswaTiktok')) document.getElementById('siswaTiktok').value = item['akun Tiktok'] || '';
    if (document.getElementById('siswaDob')) document.getElementById('siswaDob').value = item['tanggal lahir'] || '';
    if (document.getElementById('siswaPesan')) document.getElementById('siswaPesan').value = item.pesan || '';
    if (document.getElementById('siswaSubmitBtn')) document.getElementById('siswaSubmitBtn').textContent = 'Update Siswa';
    if (document.getElementById('siswaFormTitle')) document.getElementById('siswaFormTitle').textContent = 'Edit Siswa';
    if (document.getElementById('cancelSiswaBtn')) document.getElementById('cancelSiswaBtn').style.display = 'inline-block';
    if (document.getElementById('siswaFormContainer')) document.getElementById('siswaFormContainer').style.display = 'block';
    if (document.getElementById('addSiswaBtn')) document.getElementById('addSiswaBtn').textContent = 'Sembunyikan Form';
    editingSiswaId = id;
  } catch (error) {
    console.error('Error fetching siswa:', error);
    alert('Gagal memuat data siswa untuk edit.');
  }
}

function cancelEditSiswa() {
  if (document.getElementById('siswaNama')) document.getElementById('siswaNama').value = '';
  if (document.getElementById('siswaIg')) document.getElementById('siswaIg').value = '';
  if (document.getElementById('siswaTiktok')) document.getElementById('siswaTiktok').value = '';
  if (document.getElementById('siswaDob')) document.getElementById('siswaDob').value = '';
  if (document.getElementById('siswaPesan')) document.getElementById('siswaPesan').value = '';
  if (document.getElementById('siswaSubmitBtn')) document.getElementById('siswaSubmitBtn').textContent = 'Tambah Siswa';
  if (document.getElementById('siswaFormTitle')) document.getElementById('siswaFormTitle').textContent = 'Tambah Siswa Baru';
  if (document.getElementById('cancelSiswaBtn')) document.getElementById('cancelSiswaBtn').style.display = 'none';
  editingSiswaId = null;
}

function cancelAddSiswa() {
  const container = document.getElementById('siswaFormContainer');
  if (container) container.style.display = 'none';
  if (document.getElementById('addSiswaBtn')) document.getElementById('addSiswaBtn').textContent = 'Tambah Akun';
  cancelEditSiswa();
}

async function deleteSiswa(id) {
  if (!confirm('Apakah Anda yakin ingin menghapus siswa ini?')) return;
  try {
    const { error } = await supabaselokal.from('siswa').delete().eq('id', id);
    if (error) throw error;
    loadSiswa();
  } catch (error) {
    console.error('Error deleting siswa:', error);
  }
}

resetpasswordSiswa = async function(id) {
  if (!confirm("Apakah Anda yakin ingin mereset password siswa ini? Password akan direset menjadi '12345678' (default)")) return;
  try {
    const { error } = await supabaselokal.from('siswa').update({ password: '12345678' }).eq('id', id);
    if (error) throw error;
    alert('Password siswa berhasil direset menjadi "12345678".');
  } catch (error) {
    console.error('Error resetting password siswa:', error);
    alert('Gagal mereset password siswa.');
  }
}

// ==================== CANCEL EDIT (Prestasi, Karya, Moderator) ====================

function cancelEdit(type) {
  if (type === 'prestasi') {
    if (document.getElementById('ImageUrl')) document.getElementById('ImageUrl').value = '';
    if (document.getElementById('title')) document.getElementById('title').value = '';
    if (document.getElementById('description')) document.getElementById('description').value = '';
    if (document.getElementById('prestasiSubmitBtn')) document.getElementById('prestasiSubmitBtn').textContent = 'Tambah Prestasi';
    if (document.getElementById('prestasiFormTitle')) document.getElementById('prestasiFormTitle').textContent = 'Tambah Prestasi Baru';
    if (document.getElementById('cancelPrestasiBtn')) document.getElementById('cancelPrestasiBtn').style.display = 'none';
    editingPrestasiId = null;
  } else if (type === 'karya') {
    if (document.getElementById('karyaImageUrl')) document.getElementById('karyaImageUrl').value = '';
    if (document.getElementById('karyaTitle')) document.getElementById('karyaTitle').value = '';
    if (document.getElementById('karyaDescription')) document.getElementById('karyaDescription').value = '';
    if (document.getElementById('karyaSubmitBtn')) document.getElementById('karyaSubmitBtn').textContent = 'Tambah Karya';
    if (document.getElementById('karyaFormTitle')) document.getElementById('karyaFormTitle').textContent = 'Tambah Karya Siswa Baru';
    if (document.getElementById('cancelKaryaBtn')) document.getElementById('cancelKaryaBtn').style.display = 'none';
    editingKaryaId = null;
  } else if (type === 'moderator') {
    if (document.getElementById('modUsername')) document.getElementById('modUsername').value = '';
    if (document.getElementById('modPassword')) document.getElementById('modPassword').value = '';
    if (document.getElementById('modActive')) document.getElementById('modActive').checked = true;
    if (document.getElementById('modSubmitBtn')) document.getElementById('modSubmitBtn').textContent = 'Tambahkan sebagai Moderator';
    if (document.getElementById('modFormTitle')) document.getElementById('modFormTitle').textContent = 'Kelola Moderator';
    if (document.getElementById('cancelModBtn')) document.getElementById('cancelModBtn').style.display = 'none';
    editingModUsername = null;
  }
}

// ==================== GANTI PASSWORD ====================

async function ubahPassword(username) {
  if (user.username !== username) {
    alert('Akses ditolak!');
    return;
  }

  const passwordInput = document.getElementById('currentPassword');
  const newPasswordInput = document.getElementById('newPassword');

  if (!passwordInput.value || !newPasswordInput.value) {
    alert('Harap isi password saat ini dan password baru!');
    return;
  }

  if (newPasswordInput.value.length < 8) {
    alert('Password baru harus minimal 8 karakter!');
    return;
  }

  try {
    const { data: accounts, error } = await supabaselokal
      .from('administrator')
      .select('password')
      .eq('username', username);
    
    if (error) throw error;
    
    if (!accounts || accounts.length === 0) {
      alert('Akun tidak ditemukan. Silakan login ulang.');
      return;
    }
    
    const account = accounts[0];
    
    if (passwordInput.value !== account.password) {
      alert('Password salah!');
      return;
    }

    const { error: updateError } = await supabaselokal
      .from('administrator')
      .update({ password: newPasswordInput.value })
      .eq('username', username);
    
    if (updateError) throw updateError;
    
    alert('Password berhasil diubah! Silahkan Login ulang.');
    logout();

    passwordInput.value = '';
    newPasswordInput.value = '';

  } catch (error) {
    console.error('Error:', error);
    alert('Terjadi kesalahan saat mengubah password. Silakan coba lagi.');
  }
}

// ==================== EVENT LISTENERS ====================

document.addEventListener('DOMContentLoaded', function() {
  // Sidebar links
  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const tab = this.getAttribute('data-tab');
      showTab(tab);
    });
  });

  // Form Prestasi
  if (document.getElementById('addForm')) {
    document.getElementById('addForm').addEventListener('submit', async function(e) {
      e.preventDefault();
      const imageUrl = document.getElementById('ImageUrl').value;
      const title = document.getElementById('title').value;
      const description = document.getElementById('description').value;
      
      try {
        if (editingPrestasiId) {
          const { error } = await supabaselokal
            .from('prestasi')
            .update({ title, description, image_url: imageUrl })
            .eq('id', editingPrestasiId);
          if (error) throw error;
        } else {
          const { error } = await supabaselokal
            .from('prestasi')
            .insert([{ title, description, image_url: imageUrl }]);
          if (error) throw error;
        }
        cancelEdit('prestasi');
        loadPrestasi();
      } catch (error) {
        console.error('Error saving prestasi:', error);
      }
    });
  }

  // Form Karya
  if (document.getElementById('addKaryaForm')) {
    document.getElementById('addKaryaForm').addEventListener('submit', async function(e) {
      e.preventDefault();
      const imageUrl = document.getElementById('karyaImageUrl').value;
      const title = document.getElementById('karyaTitle').value;
      const description = document.getElementById('karyaDescription').value;
      
      try {
        if (editingKaryaId) {
          const { error } = await supabaselokal
            .from('karya')
            .update({ title, description, image_url: imageUrl })
            .eq('id', editingKaryaId);
          if (error) throw error;
        } else {
          const { error } = await supabaselokal
            .from('karya')
            .insert([{ title, description, image_url: imageUrl }]);
          if (error) throw error;
        }
        cancelEdit('karya');
        loadKarya();
      } catch (error) {
        console.error('Error saving karya:', error);
      }
    });
  }

  // Form Moderator
  if (document.getElementById('addModForm')) {
    document.getElementById('addModForm').addEventListener('submit', async function(e) {
      e.preventDefault();
      if (user.role !== 'Admin') {
        alert('Akses ditolak!');
        return;
      }
      
      const username = document.getElementById('modUsername').value;
      const password = document.getElementById('modPassword').value;
      const active = document.getElementById('modActive').checked ? 'Aktif' : 'Tidak Aktif';
      
      try {
        if (editingModUsername) {
          const { error } = await supabaselokal
            .from('administrator')
            .update({ password, peran: 'Moderator', status_akun: active })
            .eq('username', editingModUsername);
          if (error) throw error;
        } else {
          const { error } = await supabaselokal
            .from('administrator')
            .insert([{ 
              nama_administrator: username, 
              username, 
              password, 
              peran: 'Moderator', 
              status_akun: active, 
              editable: true 
            }]);
          if (error) throw error;
        }
        cancelEdit('moderator');
        loadModerators();
        loadAdmins();
      } catch (error) {
        console.error('Error saving moderator:', error);
      }
    });
  }

  // Tombol Tambah Admin
  if (document.getElementById('addAdminBtn')) {
    document.getElementById('addAdminBtn').addEventListener('click', async function(e) {
      e.preventDefault();
      if (user.role !== 'Admin') {
        alert('Akses ditolak!');
        return;
      }
      
      const username = document.getElementById('modUsername').value;
      const password = document.getElementById('modPassword').value;
      
      try {
        const { error } = await supabaselokal
          .from('administrator')
          .insert([{ 
            nama_administrator: username, 
            username, 
            password, 
            peran: 'Admin', 
            status_akun: 'Aktif', 
            editable: true 
          }]);
        
        if (error) throw error;
        
        if (document.getElementById('modUsername')) document.getElementById('modUsername').value = '';
        if (document.getElementById('modPassword')) document.getElementById('modPassword').value = '';
        if (document.getElementById('modActive')) document.getElementById('modActive').checked = true;
        
        loadAdmins();
      } catch (error) {
        console.error('Error adding admin:', error);
      }
    });
  }

  // Form Siswa
  if (document.getElementById('addSiswaForm')) {
    document.getElementById('addSiswaForm').addEventListener('submit', async function(e) {
      e.preventDefault();
      const nama = document.getElementById('siswaNama').value;
      const ig = document.getElementById('siswaIg').value;
      const tiktok = document.getElementById('siswaTiktok').value;
      const dob = document.getElementById('siswaDob').value;
      const pesan = document.getElementById('siswaPesan').value;
      
      try {
        if (editingSiswaId) {
          const { error } = await supabaselokal
            .from('siswa')
            .update({
              nama_siswa: nama,
              'akun IG': ig,
              'akun Tiktok': tiktok,
              'tanggal lahir': dob,
              pesan: pesan
            })
            .eq('id', editingSiswaId);
          if (error) throw error;
        } else {
          const { error } = await supabaselokal
            .from('siswa')
            .insert([{
              nama_siswa: nama,
              'akun IG': ig,
              'akun Tiktok': tiktok,
              'tanggal lahir': dob,
              pesan: pesan,
              password: '12345678'
            }]);
          if (error) throw error;
        }
        cancelEditSiswa();
        loadSiswa();
      } catch (error) {
        console.error('Error saving siswa:', error);
      }
    });
  }

  // Toggle Form Siswa
  if (document.getElementById('addSiswaBtn')) {
    document.getElementById('addSiswaBtn').addEventListener('click', function() {
      const container = document.getElementById('siswaFormContainer');
      container.style.display = container.style.display === 'none' ? 'block' : 'none';
      this.textContent = container.style.display === 'block' ? 'Sembunyikan Form' : 'Tambah Akun';
    });
  }

  // Form Update Password
  if (document.getElementById('updatePasswordForm')) {
    document.getElementById('updatePasswordForm').addEventListener('submit', async function(e) {
      e.preventDefault();
      await ubahPassword(user.username);
    });
  }

  // Global Click untuk Menu Aksi
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('aksi-btn')) {
      const menu = e.target.nextElementSibling;
      document.querySelectorAll('.aksi-menu').forEach(m => {
        if (m !== menu) m.style.display = 'none';
      });
      menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    } else if (!e.target.closest('.aksi-container')) {
      document.querySelectorAll('.aksi-menu').forEach(m => m.style.display = 'none');
    }
  });

  // Load Data Awal
  loadPrestasi();
  loadKarya();
  if (user.role === 'Admin') {
    loadModerators();
    loadAdmins();
  }
});

