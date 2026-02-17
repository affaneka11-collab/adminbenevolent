// scriptdsh.js
const supabaseUrl = 'https://piaycptnvkyahallyysx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpYXljcHRudmt5YWhhbGx5eXN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMTIyMzcsImV4cCI6MjA4NjU4ODIzN30.ADYwz_gLL7GzsZXOvWTSLNWyaYQurR3fGQdzl7qnEWU';
const supabaselokal = supabase.createClient(supabaseUrl, supabaseAnonKey);

const user = JSON.parse(localStorage.getItem('adminLoggedIn') ? JSON.stringify({ username: localStorage.getItem('adminUsername'), role: localStorage.getItem('adminRole'), name: localStorage.getItem('adminName') }) : null);
if (!user) {
    window.location.href = "login.html";
}
// Hapus baris ini karena tidak ada .nav-text di HTML baru
// document.querySelector('.nav-text').innerText = user.role === "Admin" ? "Admin - Kelas 8 Benevolent" : "Moderator - Kelas 8 Benevolent";
document.getElementById('userName').innerText = user.name;
if (user.role === "Admin") {
    document.getElementById('moderatorMenu').style.display = 'block';
}

let editingPrestasiId = null;
let editingKaryaId = null;
let editingModUsername = null;

function logout() {
    localStorage.removeItem('adminLoggedIn');
    localStorage.removeItem('adminName');
     localStorage.removeItem('adminUsername');
    localStorage.removeItem('adminRole');
    window.location.href = "login.html";
}

function showTab(tabName) {
    document.querySelectorAll('.section').forEach(section => section.classList.remove('active'));
    document.querySelectorAll('.sidebar-link').forEach(link => link.classList.remove('active'));
    document.getElementById(tabName + '-section').classList.add('active');
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    const titles = { prestasi: 'Kelola Prestasi', karya: 'Kelola Karya Siswa', moderator: 'Kelola Moderator' };
    document.getElementById('pageTitle').innerText = titles[tabName];
    if (tabName === 'prestasi') loadPrestasi();
    else if (tabName === 'karya') loadKarya();
    else if (tabName === 'moderator' && user.role === "Admin") {
        loadModerators();
        loadAdmins();
    }
}

async function loadPrestasi() {
    try {
        console.log('Loading prestasi...');
        const { data: prestasi, error } = await supabaselokal.from('prestasi').select('*');
        if (error) throw error;
        console.log('Prestasi data:', prestasi);
        const list = document.getElementById('prestasiList');
        const noPrestasi = document.getElementById('noPrestasi');
        list.innerHTML = '';
        if (prestasi.length === 0) {
            noPrestasi.style.display = 'block';
        } else {
            noPrestasi.style.display = 'none';
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
                list.appendChild(li);
            });
        }
    } catch (error) {
        console.error('Error loading prestasi:', error);
    }
}

async function loadKarya() {
    try {
        console.log('Loading karya...');
        const { data: karya, error } = await supabaselokal.from('karya').select('*');
        if (error) throw error;
        console.log('Karya data:', karya);
        const list = document.getElementById('karyaList');
        const noKarya = document.getElementById('noKarya');
        list.innerHTML = '';
        if (karya.length === 0) {
            noKarya.style.display = 'block';
        } else {
            noKarya.style.display = 'none';
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
                list.appendChild(li);
            });
        }
    } catch (error) {
        console.error('Error loading karya:', error);
    }
}

async function loadModerators() {
    if (user.role !== "Admin") return;
    try {
        console.log('Loading moderators...');
        const { data: accounts, error } = await supabaselokal.from('administrator').select('*');
        if (error) throw error;
        console.log('Accounts data:', accounts);
        const mods = accounts.filter(acc => acc.peran === "Moderator");
        const list = document.getElementById('moderatorList');
        list.innerHTML = '';
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
            list.appendChild(li);
        });
    } catch (error) {
        console.error('Error loading moderators:', error);
    }
}

async function loadAdmins() {
    if (user.role !== "Admin") return;
    try {
        console.log('Loading admins...');
        const { data: accounts, error } = await supabaselokal.from('administrator').select('*');
        if (error) throw error;
        console.log('Accounts data:', accounts);
        const admins = accounts.filter(acc => acc.peran === "Admin");
        const list = document.getElementById('adminList');
        list.innerHTML = '';
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
            list.appendChild(li);
        });
    } catch (error) {
        console.error('Error loading admins:', error);
    }
}

async function editPrestasi(id) {
    try {
        const { data: item, error } = await supabaselokal.from('prestasi').select('*').eq('id', id).single();
        if (error) throw error;
        document.getElementById('ImageUrl').value = item.image_url;
        document.getElementById('title').value = item.title;
        document.getElementById('description').value = item.description;
        document.getElementById('prestasiSubmitBtn').textContent = 'Update Prestasi';
        document.getElementById('prestasiFormTitle').textContent = 'Edit Prestasi';
        document.getElementById('cancelPrestasiBtn').style.display = 'inline-block';
        editingPrestasiId = id;
    } catch (error) {
        console.error('Error fetching prestasi:', error);
    }
}

async function editKarya(id) {
    try {
        const { data: item, error } = await supabaselokal.from('karya').select('*').eq('id', id).single();
        if (error) throw error;
        document.getElementById('karyaImageUrl').value = item.image_url;
        document.getElementById('karyaTitle').value = item.title;
        document.getElementById('karyaDescription').value = item.description;
        document.getElementById('karyaSubmitBtn').textContent = 'Update Karya';
        document.getElementById('karyaFormTitle').textContent = 'Edit Karya Siswa';
        document.getElementById('cancelKaryaBtn').style.display = 'inline-block';
        editingKaryaId = id;
    } catch (error) {
        console.error('Error fetching karya:', error);
    }
}

async function editModerator(username) {
    if (user.role !== "Admin") {
        alert("Akses ditolak!");
        return;
    }
    try {
        const { data: account, error } = await supabaselokal.from('administrator').select('*').eq('username', username).single();
        if (error) throw error;
        document.getElementById('modUsername').value = account.username;
        document.getElementById('modPassword').value = account.password;
        document.getElementById('modActive').checked = account.status_akun === 'Aktif';
        document.getElementById('modSubmitBtn').textContent = 'Update Moderator';
        document.getElementById('addAdminBtn').className = 'notallowed';
        document.getElementById('modFormTitle').textContent = 'Edit Moderator';
        document.getElementById('cancelModBtn').style.display = 'inline-block';
        editingModUsername = username;
    } catch (error) {
        console.error('Error fetching moderator:', error);
    }
}

async function editAdmin(username) {
    if (user.role !== "Admin" || username === user.username) {
        alert("Akses ditolak!");
        return;
    }
    try {
        const { data: account, error } = await supabaselokal.from('administrator').select('*').eq('username', username).single();
        if (error) throw error;
        document.getElementById('modUsername').value = account.username;
        document.getElementById('modPassword').value = account.password;
        document.getElementById('modActive').checked = account.status_akun === 'Aktif';
        document.getElementById('modSubmitBtn').textContent = 'Update Admin';
        document.getElementById('addAdminBtn').className = 'notallowed';
        document.getElementById('modFormTitle').textContent = 'Edit Admin';
        document.getElementById('cancelModBtn').style.display = 'inline-block';
        editingModUsername = username;
    } catch (error) {
        console.error('Error fetching admin:', error);
    }
}

function cancelEdit(type) {
    if (type === 'prestasi') {
        document.getElementById('ImageUrl').value = '';
        document.getElementById('title').value = '';
        document.getElementById('description').value = '';
        document.getElementById('prestasiSubmitBtn').textContent = 'Tambah Prestasi';
        document.getElementById('prestasiFormTitle').textContent = 'Tambah Prestasi Baru';
        document.getElementById('cancelPrestasiBtn').style.display = 'none';
        editingPrestasiId = null;
    } else if (type === 'karya') {
        document.getElementById('karyaImageUrl').value = '';
        document.getElementById('karyaTitle').value = '';
        document.getElementById('karyaDescription').value = '';
        document.getElementById('karyaSubmitBtn').textContent = 'Tambah Karya';
        document.getElementById('karyaFormTitle').textContent = 'Tambah Karya Siswa Baru';
        document.getElementById('cancelKaryaBtn').style.display = 'none';
        editingKaryaId = null;
    } else if (type === 'moderator') {
        document.getElementById('modUsername').value = '';
        document.getElementById('modPassword').value = '';
        document.getElementById('modActive').checked = true;
        document.getElementById('modSubmitBtn').textContent = 'Tambahkan sebagai Moderator';
        document.getElementById('modFormTitle').textContent = 'Kelola Moderator';
        document.getElementById('cancelModBtn').style.display = 'none';
        editingModUsername = null;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Event listener untuk sidebar links
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const tab = this.getAttribute('data-tab');
            showTab(tab);
        });
    });

    // Form event listeners
    document.getElementById('addForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const imeg = document.getElementById('ImageUrl').value;
        const title = document.getElementById('title').value;
        const description = document.getElementById('description').value;
        try {
            if (editingPrestasiId) {
                const { error } = await supabaselokal.from('prestasi').update({ title, description, image_url: imeg }).eq('id', editingPrestasiId);
                if (error) throw error;
            } else {
                const { error } = await supabaselokal.from('prestasi').insert([{ title, description, image_url: imeg }]);
                if (error) throw error;
            }
            cancelEdit('prestasi');
            loadPrestasi();
        } catch (error) {
            console.error('Error saving prestasi:', error);
        }
    });

    document.getElementById('addKaryaForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const imeg = document.getElementById('karyaImageUrl').value;
        const title = document.getElementById('karyaTitle').value;
        const description = document.getElementById('karyaDescription').value;
        try {
            if (editingKaryaId) {
                const { error } = await supabaselokal.from('karya').update({ title, description, image_url: imeg }).eq('id', editingKaryaId);
                if (error) throw error;
            } else {
                const { error } = await supabaselokal.from('karya').insert([{ title, description, image_url: imeg }]);
                if (error) throw error;
            }
            cancelEdit('karya');
            loadKarya();
        } catch (error) {
            console.error('Error saving karya:', error);
        }
    });

    document.getElementById('addModForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        if (user.role !== "Admin") {
            alert("Akses ditolak!");
            return;
        }
        const username = document.getElementById('modUsername').value;
        const password = document.getElementById('modPassword').value;
        const active = document.getElementById('modActive').checked ? 'Aktif' : 'Tidak Aktif';
        try {
            if (editingModUsername) {
                const { error } = await supabaselokal.from('administrator').update({ password, peran: 'Moderator', status_akun: active }).eq('username', editingModUsername);
                if (error) throw error;
            } else {
                const { error } = await supabaselokal.from('administrator').insert([{ nama_administrator: username, username, password, peran: 'Moderator', status_akun: active, editable: true }]);
                if (error) throw error;
            }
            cancelEdit('moderator');
            loadModerators();
            loadAdmins();
        } catch (error) {
            console.error('Error saving moderator:', error);
        }
    });

    document.getElementById('addAdminBtn').addEventListener('click', async function(e) {
        e.preventDefault();
        if (user.role !== "Admin") {
            alert("Akses ditolak!");
            return;
        }
        const username = document.getElementById('modUsername').value;
        const password = document.getElementById('modPassword').value;
        try {
            const { error } = await supabaselokal.from('administrator').insert([{ nama_administrator: username, username, password, peran: 'Admin', status_akun: 'Aktif', editable: true }]);
            if (error) throw error;
            document.getElementById('modUsername').value = '';
            document.getElementById('modPassword').value = '';
            document.getElementById('modActive').checked = true;
            loadAdmins();
        } catch (error) {
            console.error('Error adding admin:', error);
        }
    });

        // Event listener untuk form update password
    document.getElementById('updatePasswordForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        await ubahPassword(user.username);
    });

    // Load initial data
    loadPrestasi();
    loadKarya();
    if (user.role === "Admin") {
        loadModerators();
        loadAdmins();
    }
});

async function deletePrestasi(id) {
    if (!confirm("Apakah Anda yakin ingin menghapus prestasi ini?")) return;
    try {
        const { error } = await supabaselokal.from('prestasi').delete().eq('id', id);
        if (error) throw error;
        loadPrestasi();
    } catch (error) {
        console.error('Error deleting prestasi:', error);
    }
}

async function deleteKarya(id) {
    if (!confirm("Apakah Anda yakin ingin menghapus karya siswa ini?")) return;
    try {
        const { error } = await supabaselokal.from('karya').delete().eq('id', id);
        if (error) throw error;
        loadKarya();
    } catch (error) {
        console.error('Error deleting karya:', error);
    }
}

async function deleteModerator(username) {
    if (user.role !== "Admin") {
        alert("Akses ditolak!");
        return;
    }
    const { data: account } = await supabaselokal.from('administrator').select('editable').eq('username', username).single();
    if (!account.editable) {
        alert("Akun ini tidak dapat dihapus!");
        return;
    }
    if (!confirm("Apakah Anda yakin ingin menghapus moderator ini?")) return;
    try {
        const { error } = await supabaselokal.from('administrator').delete().eq('username', username);
        if (error) throw error;
        loadModerators();
    } catch (error) {
        console.error('Error deleting moderator:', error);
    }
}

async function deleteAdmin(username) {
    if (user.role !== "Admin" || username === user.username) {
        alert("Akses ditolak!");
        return;
    }
    const { data: account } = await supabaselokal.from('administrator').select('editable').eq('username', username).single();
    if (!account.editable) {
        alert("Akun ini tidak dapat dihapus!");
        return;
    }
    if (!confirm("Apakah Anda yakin ingin menghapus admin ini?")) return;
    try {
        const { error } = await supabaselokal.from('administrator').delete().eq('username', username);
        if (error) throw error;
        loadAdmins();
    } catch (error) {
        console.error('Error deleting admin:', error);
    }
}

async function toggleActive(username) {
    if (user.role !== "Admin") {
        alert("Akses ditolak!");
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

// Fungsi untuk mengganti password untuk semua user (password milik akun sendiri)
async function ubahPassword(username) {
    // Periksa apakah username yang dimasukkan cocok dengan username pengguna saat ini
    if (user.username !== username) {
        alert("Akses ditolak!");
        return;
    }

    const passwordInput = document.getElementById('currentPassword');
    const newPasswordInput = document.getElementById('newPassword');

    if (!passwordInput.value || !newPasswordInput.value) {
        alert("Harap isi password saat ini dan password baru!");
        return;
    }

    if (newPasswordInput.value.length < 8) {
        alert("Password baru harus minimal 8 karakter!");
        return;
    }

    // Pengecekan CAPTCHA (asumsi menggunakan Google reCAPTCHA v2)
    // Pastikan elemen dengan id 'recaptcha' ada di HTML, dan site key sudah dikonfigurasi
    const recaptchaResponse = grecaptcha.getResponse();
    if (!recaptchaResponse) {
        alert("Harap lengkapi CAPTCHA!");
        return;
    }

    try {
        // Gunakan query tanpa .maybeSingle() untuk menghindari potensi error, dan handle array secara manual
        const { data: accounts, error } = await supabaselokal.from('administrator').select('password').eq('username', username);
        if (error) throw error;
        
        // Periksa apakah akun ditemukan
        if (!accounts || accounts.length === 0) {
            alert("Akun tidak ditemukan. Silakan login ulang.");
            grecaptcha.reset();
            return;
        }
        
        // Ambil akun pertama (seharusnya hanya satu berdasarkan eq('username', username))
        const account = accounts[0];
        
        if (passwordInput.value !== account.password) {
            alert("Password salah!");
            grecaptcha.reset();
            return;
        }

        // Hapus logika editingModUsername jika tidak diperlukan (untuk keamanan)
        // Jika diperlukan, tambahkan pengecekan role admin
        const { error: updateError } = await supabaselokal.from('administrator').update({ 
            password: newPasswordInput.value 
        }).eq('username', username);
        if (updateError) throw updateError;
            alert("Password berhasil diubah! Silahkan Login ulang.");
            logout(); // Logout setelah ganti password untuk keamanan

        passwordInput.value = '';
        newPasswordInput.value = '';
        grecaptcha.reset(); // Reset CAPTCHA setelah sukses

    } catch (error) {
        console.error('Error:', error);
        alert('Terjadi kesalahan saat mengubah password. Silakan coba lagi.');
        grecaptcha.reset();
    }
}
