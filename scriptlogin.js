// Inisialisasi Supabase
const supabaseUrl = 'https://piaycptnvkyahallyysx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpYXljcHRudmt5YWhhbGx5eXN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMTIyMzcsImV4cCI6MjA4NjU4ODIzN30.ADYwz_gLL7GzsZXOvWTSLNWyaYQurR3fGQdzl7qnEWU';
const supabaselokal = supabase.createClient(supabaseUrl, supabaseAnonKey);

// Konfigurasi Session
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 menit

// Fungsi untuk generate session token
function generateSessionToken() {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Fungsi untuk menampilkan error
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

// Fungsi untuk menyembunyikan error
function hideError() {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) errorDiv.style.display = 'none';
}

// Event listener untuk form submit
document.getElementById('loginForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    
    // Pengekaan CAPTCHA
    const recaptchaResponse = grecaptcha.getResponse();
    if (!recaptchaResponse) {
        showError('Harap lengkapi CAPTCHA!');
        return;
    }

    try {
        // Query ke tabel administrator
        const { data, error } = await supabaselokal
            .from('administrator')
            .select('*')
            .eq('username', username)
            .eq('status_akun', 'Aktif')
            .single();

        if (error || !data) {
            showError('Username tidak ditemukan atau akun tidak aktif');
            grecaptcha.reset();
            return;
        }

        // Verifikasi password
        if (data.password === password) {
            // Generate session token
            const sessionToken = generateSessionToken();
            const sessionExpiresAt = new Date(Date.now() + SESSION_TIMEOUT).toISOString();
            
            // Update session di database
            const { error: updateError } = await supabaselokal
                .from('administrator')
                .update({
                    session_token: sessionToken,
                    last_active: new Date().toISOString(),
                    session_expires_at: sessionExpiresAt
                })
                .eq('username', username);
            
            if (updateError) {
                console.error('Error updating session:', updateError);
                // Tetap lanjutkan login meskipun update session gagal
            }

            // Simpan data ke localStorage
            localStorage.setItem('adminLoggedIn', 'true');
            localStorage.setItem('adminName', data.nama_administrator);
            localStorage.setItem('adminUsername', data.username);
            localStorage.setItem('adminRole', data.peran);
            localStorage.setItem('adminSessionToken', sessionToken);
            localStorage.setItem('adminLastActivity', Date.now().toString());

            // Redirect ke dashboard
            window.location.href = 'dashboard.html';
        } else {
            showError('Password salah');
            grecaptcha.reset();
        }
    } catch (err) {
        console.error('Error:', err);
        showError('Terjadi kesalahan. Coba lagi.');
        grecaptcha.reset();
    }
});

// Sembunyikan error saat user mulai mengetik
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');

if (usernameInput) usernameInput.addEventListener('input', hideError);
if (passwordInput) passwordInput.addEventListener('input', hideError);
