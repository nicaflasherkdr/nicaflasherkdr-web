# Auto Commit Guideline

Setiap kali menyelesaikan permintaan pengguna (perbaikan bug, penambahan fitur, styling, atau refactoring), asisten WAJIB melakukan `git commit` secara otomatis dengan kriteria agar git log tetap bersih, rapi, dan profesional:

1. **Commit Tunggal per Tugas (Cohesive & Atomic)**:
   - Gabungkan seluruh perubahan terkait dalam 1 commit setelah tugas tuntas dan divalidasi.
   - Jangan membuat multi-commit kecil (*micro-commits*) untuk satu sesi perbaikan yang sama.

2. **Format Conventional Commits**:
   - Gunakan format standar: `<tipe>(<lingkup/scope>): <deskripsi singkat>`
   - Contoh tipe:
     - `feat`: penambahan fitur baru
     - `fix`: perbaikan bug atau peringatan validasi/linter
     - `style`: perubahan styling/CSS tanpa mengubah logika
     - `refactor`: penyederhanaan/restrukturisasi kode
     - `docs`: perubahan dokumentasi
     - `chore`: pemeliharaan rutin/konfigurasi

3. **Staging Selektif & Bersih**:
   - Hanya stage file yang relevan dengan tugas (`git add <file1> <file2>`).
   - Jangan pernah men-stage file temporary, file log, atau berkas rahasia (.env).

4. **Jangan Push Otomatis**:
   - Lakukan commit lokal saja secara otomatis. Push ke remote (`git push`) hanya dilakukan jika diminta eksplisit oleh pengguna demi keamanan branch/production.
