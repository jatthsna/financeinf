# KAS INFORMATIKA

Sistem Manajemen Keuangan Program Studi Informatika

## Daftar Isi

1. [Tentang Aplikasi](#tentang-aplikasi)
2. [Fitur Utama](#fitur-utama)
3. [Struktur Proyek](#struktur-proyek)
4. [Prasyarat](#prasyarat)
5. [Instalasi](#instalasi)
6. [Konfigurasi Environment](#konfigurasi-environment)
7. [Setup Supabase](#setup-supabase)
8. [Migrasi Database](#migrasi-database)
9. [Konfigurasi Storage & RLS](#konfigurasi-storage--rls)
10. [Provisioning Admin Pertama](#provisioning-admin-pertama)
11. [Menjalankan Aplikasi](#menjalankan-aplikasi)
12. [Undang Pengguna](#undang-pengguna)
13. [Upload Gambar QRIS](#upload-gambar-qris)
14. [Build & Deploy](#build--deploy)
15. [Backup & Restore](#backup--restore)
16. [Troubleshooting](#troubleshooting)
17. [Teknologi](#teknologi)

---

## Tentang Aplikasi

**KAS INFORMATIKA** adalah aplikasi web Progressive Web App (PWA) untuk mengelola keuangan Program Studi Informatika. Aplikasi ini dirancang untuk:

- Mengelola berbagai jenis iuran mahasiswa (rutin, kegiatan, seminar, dll.)
- Mencatat dan memverifikasi pembayaran via Tunai dan QRIS
- Mengelola pendapatan lain dan pengeluaran
- Mengelola anggaran kegiatan
- Menghasilkan laporan keuangan
- Mendukung multi tahun akademik
- Menjaga audit trail semua transaksi keuangan

### Peran Pengguna

| Peran | Deskripsi |
|-------|-----------|
| **ADMIN** | Akses penuh: kelola pengguna, tahun akademik, iuran, pembayaran, laporan, pengaturan |
| **BENDAHARA** | Kelola keuangan: catat pembayaran, verifikasi QRIS, kelola pendapatan/pengeluaran, laporan |
| **MAHASISWA** | Lihat tagihan sendiri, ajukan pembayaran QRIS, lihat riwayat pembayaran |

---

## Fitur Utama

- ✅ Autentikasi & otorisasi berbasis peran
- ✅ Multi jenis iuran (rutin, kegiatan, seminar, workshop, kepanitiaan)
- ✅ Penagihan mingguan, bulanan, sekali bayar, berbasis kegiatan
- ✅ Alur pembayaran tunai dan QRIS
- ✅ Verifikasi pembayaran QRIS manual oleh staf
- ✅ Pembayaran parsial & alokasi multi tagihan
- ✅ Pendapatan lain (donasi, sponsor, pendapatan kegiatan)
- ✅ Manajemen pengeluaran dengan persetujuan
- ✅ Manajemen kegiatan & anggaran
- ✅ Rekening kas & rekonsiliasi
- ✅ Multi tahun akademik
- ✅ Laporan keuangan & ekspor CSV/PDF
- ✅ Audit log
- ✅ PWA (Progressive Web App)
- ✅ Responsive mobile-first
- ✅ Row Level Security (RLS) pada database
- ✅ Antarmuka Bahasa Indonesia

---

## Struktur Proyek

```
kas-informatika/
├── public/                      # Aset statis
│   ├── manifest.json           # PWA manifest
│   ├── offline.html            # Halaman offline
│   └── icons/                  # Ikon aplikasi
├── supabase/
│   └── migrations/             # Migrasi database SQL
│       ├── 00001_initial_schema.sql    # Schema awal (tabel, fungsi, trigger)
│       └── 00002_rls_policies.sql      # Kebijakan Row Level Security
├── src/
│   ├── components/
│   │   ├── ui/                 # Komponen UI dasar (button, input, card, dll.)
│   │   ├── layout/             # Layout (sidebar, header, mobile nav)
│   │   ├── auth/               # Komponen autentikasi
│   │   ├── dashboard/          # Widget dashboard
│   │   ├── contributions/      # Komponen jenis iuran
│   │   ├── billing/            # Komponen penagihan
│   │   ├── payments/           # Komponen pembayaran
│   │   ├── income/             # Komponen pendapatan
│   │   ├── expenses/           # Komponen pengeluaran
│   │   ├── activities/         # Komponen kegiatan
│   │   ├── reports/            # Komponen laporan
│   │   └── settings/           # Komponen pengaturan
│   ├── contexts/               # React context (Auth, AcademicYear)
│   ├── hooks/                  # Custom hooks (data fetching, mutations)
│   ├── lib/                    # Library (supabase client, utils, constants)
│   ├── pages/                  # Halaman-halaman aplikasi
│   ├── types/                  # TypeScript type definitions
│   ├── utils/                  # Utilitas (export CSV/PDF)
│   ├── App.tsx                 # Routing utama
│   ├── main.tsx                # Entry point
│   └── index.css               # Stylesheet utama
├── .env.example                # Contoh environment variables
├── index.html                  # HTML template
├── package.json                # Dependencies
├── tailwind.config.ts          # Konfigurasi Tailwind CSS
├── tsconfig.json               # Konfigurasi TypeScript
├── vite.config.ts              # Konfigurasi Vite
└── README.md                   # Dokumentasi ini
```

---

## Prasyarat

Pastikan Anda sudah menginstal:

1. **Node.js** versi 18 atau lebih baru
   - Download: https://nodejs.org/
   - Verifikasi: buka Command Prompt, ketik `node --version`

2. **npm** (sudah termasuk dalam Node.js)
   - Verifikasi: `npm --version`

3. **Git** (opsional, untuk version control)
   - Download: https://git-scm.com/

4. **Akun Supabase** (gratis)
   - Daftar: https://supabase.com/

---

## Instalasi

### Langkah 1: Download atau Clone Proyek

Jika menggunakan Git:
```bash
git clone <url-repository>
cd kas-informatika
```

Jika download ZIP, ekstrak ke folder pilihan Anda.

### Langkah 2: Install Dependencies

Buka terminal/Command Prompt di folder proyek:

```bash
cd kas-informatika
npm install
```

Tunggu sampai semua dependencies terinstall.

---

## Konfigurasi Environment

### Langkah 1: Salin file environment

```bash
copy .env.example .env
```

### Langkah 2: Isi dengan kredensial Supabase Anda

Buka file `.env` dengan text editor (Notepad, VS Code, dll.):

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> ⚠️ **PENTING**: Jangan pernah commit file `.env` ke repository. File ini sudah ada di `.gitignore`.

### Cara Mendapatkan Kredensial Supabase

1. Buka https://supabase.com/dashboard
2. Pilih proyek Anda (atau buat baru)
3. Buka **Settings** → **API**
4. Salin **Project URL** → paste ke `VITE_SUPABASE_URL`
5. Salin **anon public** key → paste ke `VITE_SUPABASE_ANON_KEY`

> ⚠️ **JANGAN** gunakan `service_role` key di frontend. Key tersebut hanya untuk backend/server.

---

## Setup Supabase

### Langkah 1: Buat Proyek Supabase

1. Buka https://supabase.com/dashboard
2. Klik **New Project**
3. Isi:
   - **Name**: KAS INFORMATIKA
   - **Database Password**: buat password kuat (simpan baik-baik!)
   - **Region**: Southeast Asia (Singapore)
4. Klik **Create new project**
5. Tunggu sampai proyek siap

### Langkah 2: Konfigurasi Authentication

1. Buka **Authentication** → **Providers**
2. Pastikan **Email** provider aktif
3. Buka **Authentication** → **Settings**:
   - **Site URL**: `http://localhost:5173` (development) atau URL produksi
   - **Redirect URLs**: tambahkan `http://localhost:5173/*`
   - Matikan **Enable email confirmations** untuk development (opsional)

---

## Migrasi Database

### Cara Manual (via Supabase Dashboard)

1. Buka **SQL Editor** di Supabase Dashboard
2. Salin isi file `supabase/migrations/00001_initial_schema.sql`
3. Paste ke SQL Editor
4. Klik **Run**
5. Ulangi untuk `supabase/migrations/00002_rls_policies.sql`

### Cara dengan Supabase CLI (Opsional)

Jika Anda menginstal Supabase CLI:

```bash
npx supabase init
npx supabase link --project-ref <project-id>
npx supabase db push
```

---

## Konfigurasi Storage & RLS

### Buat Storage Buckets

Di Supabase Dashboard, buka **Storage**:

1. **Buat bucket `payment-evidence`**
   - Klik **New bucket**
   - Name: `payment-evidence`
   - Public: **OFF** (private)
   - File size limit: 10MB
   - Allowed MIME types: `image/jpeg, image/png, image/webp, application/pdf`

2. **Buat bucket `qris-images`**
   - Name: `qris-images`
   - Public: **OFF** (private)
   - File size limit: 5MB
   - Allowed MIME types: `image/jpeg, image/png, image/webp`

3. **Buat bucket `receipts`**
   - Name: `receipts`
   - Public: **OFF** (private)

4. **Buat bucket `documents`**
   - Name: `documents`
   - Public: **OFF** (private)
   - File size limit: 10MB

### Konfigurasi Storage Policies

Untuk setiap bucket, buka tab **Policies** dan buat kebijakan sesuai kebutuhan:

**Bucket `payment-evidence`:**
- SELECT: Authenticated users can read files they uploaded OR staff can read all
- INSERT: Authenticated users can upload to their own folder
- DELETE: Only staff can delete

**Bucket `qris-images`:**
- SELECT: All authenticated users can read
- INSERT: Only admin can upload
- DELETE: Only admin can delete

---

## Provisioning Admin Pertama

> ⚠️ **PENTING**: Tidak ada admin default. Anda harus membuat admin pertama secara manual.

### Langkah 1: Daftar Akun

1. Jalankan aplikasi (`npm run dev`)
2. Buka halaman login
3. Daftar dengan email dan password admin

### Langkah 2: Ubah Role ke ADMIN

Karena semua pendaftaran baru otomatis mendapat role `MAHASISWA`, Anda perlu mengubah role secara manual:

1. Buka **SQL Editor** di Supabase Dashboard
2. Jalankan query berikut (ganti email):

```sql
UPDATE profiles 
SET role = 'ADMIN' 
WHERE email = 'admin@email.com';
```

3. Refresh halaman aplikasi atau login ulang

### Langkah 3: Buat Tahun Akademik Pertama

Setelah login sebagai ADMIN:

1. Buka menu **Tahun Akademik**
2. Klik **Tambah Tahun Akademik**
3. Isi:
   - Kode: `2026`
   - Nama: `Tahun Akademik 2026/2027`
   - Tanggal mulai: sesuai kebutuhan
   - Tanggal selesai: sesuai kebutuhan
4. Aktifkan tahun akademik tersebut

---

## Menjalankan Aplikasi

### Development Mode

```bash
npm run dev
```

Aplikasi akan berjalan di `http://localhost:5173`

### Build untuk Produksi

```bash
npm run build
```

Hasil build ada di folder `dist/`.

### Preview Build Produksi

```bash
npm run preview
```

---

## Undang Pengguna

### Undang Mahasiswa

1. Login sebagai ADMIN
2. Buka menu **Pengguna**
3. Klik **Undang Pengguna**
4. Isi email, nama lengkap, NIM, dan role (MAHASISWA)
5. Kirim undangan

### Undang Bendahara

1. Sama seperti undang mahasiswa
2. Pilih role **BENDAHARA**

### Bulk Import (Manual)

Untuk menambahkan banyak mahasiswa sekaligus, gunakan SQL:

```sql
-- Contoh: Tambahkan mahasiswa ke tahun akademik
INSERT INTO student_memberships (student_id, academic_year_id)
SELECT p.id, 'YEAR_ID_HERE'
FROM profiles p
WHERE p.role = 'MAHASISWA' AND p.is_active = true;
```

---

## Upload Gambar QRIS

1. Login sebagai ADMIN
2. Buka menu **Pengaturan**
3. Di bagian **QRIS**, klik **Upload Gambar QRIS**
4. Pilih file gambar QRIS resmi dari bank/e-wallet organisasi
5. Gambar akan tersimpan di Supabase Storage

> ⚠️ Gunakan gambar QRIS asli dari bank/e-wallet. Jangan gunakan gambar QRIS yang dibuat sendiri.

---

## Build & Deploy

### Build Aplikasi

```bash
npm run build
```

### Deploy ke Hosting

Aplikasi ini bisa di-deploy ke:

1. **Vercel** (direkomendasikan):
   ```bash
   npx vercel
   ```

2. **Netlify**:
   - Upload folder `dist/` ke Netlify
   - Atau hubungkan repository Git

3. **Self-hosted**:
   - Copy folder `dist/` ke web server (Nginx, Apache)
   - Konfigurasi HTTPS (wajib untuk PWA)
   - Konfigurasi SPA routing (semua path → index.html)

### Konfigurasi HTTPS

PWA membutuhkan HTTPS. Untuk development, `localhost` sudah dianggap secure.

Untuk produksi, gunakan:
- Let's Encrypt (gratis)
- Cloudflare SSL
- Sertifikat SSL dari hosting provider

### Environment Variables di Hosting

Atur environment variables di platform hosting:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

---

## Backup & Restore

### Backup Database

1. Buka Supabase Dashboard → **Database** → **Backups**
2. Supabase menyediakan backup otomatis harian (Pro plan)
3. Untuk backup manual:

```sql
-- Export via pg_dump (membutuhkan akses database)
pg_dump -h db.xxxxx.supabase.co -U postgres -d postgres > backup.sql
```

### Backup Storage

1. Download file dari Storage buckets secara manual
2. Atau gunakan Supabase CLI:
```bash
npx supabase storage cp -r supabase://payment-evidence ./backup/evidence/
```

### Restore Database

```sql
-- Import backup
psql -h db.xxxxx.supabase.co -U postgres -d postgres < backup.sql
```

---

## Troubleshooting

### Masalah Umum

#### "Supabase URL atau Key tidak valid"
- Periksa file `.env`
- Pastikan URL diawali `https://` dan diakhiri `.supabase.co`
- Pastikan menggunakan `anon` key, bukan `service_role` key

#### "Tidak bisa login"
- Pastikan email sudah terdaftar
- Jika menggunakan email confirmation, periksa inbox
- Cek di Supabase Dashboard → Authentication → Users

#### "Data tidak muncul"
- Periksa RLS policies di database
- Pastikan user memiliki role yang benar
- Cek console browser untuk error

#### "Halaman kosong setelah build"
- Pastikan semua environment variables sudah diatur
- Periksa console browser untuk error
- Pastikan routing SPA dikonfigurasi di web server

#### "PWA tidak bisa diinstall"
- PWA membutuhkan HTTPS (kecuali localhost)
- Periksa manifest.json
- Pastikan service worker terdaftar

#### "QRIS image tidak muncul"
- Pastikan gambar sudah diupload via Pengaturan
- Periksa storage policies di Supabase
- Pastikan bucket `qris-images` memiliki policy SELECT untuk authenticated users

---

## Teknologi

| Teknologi | Versi | Kegunaan |
|-----------|-------|----------|
| React | 19 | UI framework |
| TypeScript | 5.x | Type safety |
| Vite | 6.x | Build tool |
| Tailwind CSS | 4.x | Styling |
| Supabase | - | Backend (Auth, DB, Storage) |
| React Router | 7.x | Routing |
| TanStack Query | 5.x | Data fetching |
| React Hook Form | 7.x | Form management |
| Zod | 3.x | Validation |
| jsPDF | 3.x | PDF export |
| Recharts | 2.x | Charts |
| Lucide | - | Icons |
| Sonner | - | Toast notifications |
| Vitest | - | Unit testing |

---

## Lisensi

Hak cipta © 2026 Program Studi Informatika. Semua hak dilindungi.

---

## Kontak

Untuk pertanyaan teknis atau bantuan, hubungi administrator sistem Program Studi Informatika.
