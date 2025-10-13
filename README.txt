Aplikasi Resep - Final (v2.2)
============================

Fitur utama:
- Menampilkan kategori dari https://gampil.github.io/resep/kategori.json
- Menampilkan resep dari https://gampil.github.io/resep/data.json
- Gambar resep menggunakan field `image`
- Bahan tampil sebagai bullet list (tanpa checkbox)
- Langkah tampil sebagai list bernomor (ordered list)
- Loader spinner saat data dimuat
- Offline fallback via service worker + localStorage cache
- Mobile-first design dengan bottom navigation (desain final sama seperti versi sebelumnya)

Cara tes lokal:
1. Ekstrak semua file ke folder.
2. Jalankan server statis (service worker memerlukan localhost atau HTTPS), contohnya:
   python -m http.server 8000
3. Buka http://localhost:8000 di browser.

Catatan CORS:
- data.json dan kategori.json harus mengizinkan CORS (Access-Control-Allow-Origin: *) agar fetch berjalan langsung di browser.
- Jika CORS diblokir, aplikasi akan memakai cache lokal jika tersedia (kunjungan sebelumnya).
