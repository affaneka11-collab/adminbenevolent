// Inisialisasi Supabase (ganti dengan URL dan anon key dari project Supabase Anda)
const supabaseUrl = 'https://piaycptnvkyahallyysx.supabase.co'; // Ganti dengan URL project Supabase Anda
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpYXljcHRudmt5YWhhbGx5eXN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMTIyMzcsImV4cCI6MjA4NjU4ODIzN30.ADYwz_gLL7GzsZXOvWTSLNWyaYQurR3fGQdzl7qnEWU'; // Ganti dengan anon key dari Supabase dashboard
const supabaselokal = supabase.createClient(supabaseUrl, supabaseAnonKey);

// Fungsi untuk menampilkan error
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

// Fungsi untuk menyembunyikan error
function hideError() {
    document.getElementById('errorMessage').style.display = 'none';
}

// Event listener untuk form submit
document.getElementById('loginForm').addEventListener('submit', async function(event) {
    event.preventDefault(); // Mencegah reload halaman

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    // Pengecekan CAPTCHA (asumsi menggunakan Google reCAPTCHA v2)
    // Pastikan elemen dengan class 'g-recaptcha' ada di HTML, dan site key sudah dikonfigurasi
    const recaptchaResponse = grecaptcha.getResponse();
    if (!recaptchaResponse) {
        showError("Harap lengkapi CAPTCHA!");
        return;
    }

    try {
        // Query ke tabel administrator di Supabase
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

        // Verifikasi password (asumsikan plain text untuk demo; gunakan hashing di produksi)
        if (data.password === password) {
            // Login berhasil - Simpan data ke localStorage (simulasi session)
            localStorage.setItem('adminLoggedIn', 'true');
            localStorage.setItem('adminName', data.nama_administrator);
            localStorage.setItem('adminRole', data.peran);

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
document.getElementById('username').addEventListener('input', hideError);
document.getElementById('password').addEventListener('input', hideError);


