# 📊 Rekap Laporan UDD PMI — PWA

Dashboard rekap laporan bulanan Unit Donor Darah PMI Kota Banda Aceh.  
Dibangun sebagai **Progressive Web App (PWA)** — dapat diinstal di Android/iOS seperti aplikasi native.

---

## ✨ Fitur

- 📋 Rekap otomatis dari 5 jenis laporan Google Sheets (Jan–Des)
- ⚙️ **Menu Pengaturan** — input Sheet ID langsung dari browser, tersimpan di perangkat
- 📱 **PWA** — bisa diinstal sebagai aplikasi di HP Android/iOS
- 📥 **Unduh Excel, PDF, CSV** langsung dari dashboard
- 🌙 Dark mode otomatis
- 🔍 Pencarian & filter baris kosong
- 🗂️ Multi-tahun — tambah tahun baru tanpa deploy ulang

---

## 🗂️ Jenis Laporan yang Didukung

| Jenis | Nama |
|---|---|
| `pelayanan` | Distribusi Darah |
| `imuno` | Imunohematologi |
| `ujisaring` | Uji Saring IMLTD |
| `pemusnahan` | Pemusnahan Darah |
| `komponen` | Pengolahan Komponen |

---

## 🚀 Deploy ke Vercel (via GitHub)

### 1. Persiapan Repository

```bash
# Di folder project
cd "d:/file zul/Projek zul/rekap-udd-pwa"

# Install dependencies
npm install

# Test lokal dulu
npm run dev
# Buka http://localhost:3000
```

### 2. Upload ke GitHub

```bash
git init
git add .
git commit -m "Initial commit — Rekap UDD PMI PWA"

# Buat repo baru di github.com (nama: rekap-udd-pmi)
# Lalu:
git remote add origin https://github.com/USERNAME/rekap-udd-pmi.git
git branch -M main
git push -u origin main
```

### 3. Deploy ke Vercel

1. Buka [vercel.com](https://vercel.com) → **New Project**
2. Import dari GitHub → pilih repo `rekap-udd-pmi`
3. Framework: **Next.js** (auto-detected)
4. Klik **Deploy**

✅ Done! URL Vercel otomatis tersedia.

---

## ⚙️ Konfigurasi Sheet ID (di Browser)

Setelah deploy, **tidak perlu edit kode** untuk mengganti Sheet ID:

1. Buka Web App di browser/HP
2. Klik **⚙ Pengaturan** di pojok kanan atas
3. Masukkan URL atau ID spreadsheet untuk setiap jenis laporan dan tahun
4. Klik **💾 Simpan & Terapkan**

> **Penting:** Konfigurasi disimpan di perangkat masing-masing (localStorage). Setiap pengguna perlu mengatur Sheet ID di perangkatnya sendiri.

---

## 📋 Syarat Google Sheets

### 1. Izin Akses (Wajib)
Sheet **harus dibagikan** dengan akses publik:
- Buka spreadsheet → klik **Share**
- Ubah ke **"Anyone with the link"** → **Viewer**

### 2. Nama Tab Bulan
Tab bulan harus dinamai salah satu format:
- Angka: `1`, `2`, ..., `12`
- Angka berlapis: `01`, `02`, ..., `12`
- Nama Indonesia: `Januari`, `Februari`, ...
- Nama Inggris: `January`, `February`, ...
- Singkatan: `Jan`, `Feb`, `Mar`, ...

### 3. Format Data
Sesuaikan dengan jenis laporan (sama seperti format yang sudah ada di Apps Script).

---

## 📱 Instalasi sebagai APK / PWA

### Android (Chrome)
1. Buka URL Vercel di Chrome
2. Ketuk menu (⋮) → **"Add to Home Screen"** / **"Install App"**
3. Aplikasi muncul di layar utama seperti APK

### iOS (Safari)
1. Buka URL di Safari
2. Ketuk tombol Share (kotak dengan panah atas)
3. Pilih **"Add to Home Screen"**

### APK Sungguhan (opsional)
Gunakan [PWABuilder.com](https://www.pwabuilder.com/):
1. Masukkan URL Vercel
2. Klik **"Build My PWA"** → Android → Download APK

---

## 🔧 Development Lokal

```bash
npm install
npm run dev
# Buka http://localhost:3000
```

---

## 📁 Struktur Project

```
rekap-udd-pwa/
├── src/
│   ├── app/
│   │   ├── layout.js          # HTML layout + PWA meta
│   │   ├── page.js            # Halaman utama
│   │   ├── globals.css        # Tema warm-ivory
│   │   └── api/sheet/route.js # Proxy Google Sheets API
│   ├── components/
│   │   ├── Dashboard.jsx      # Dashboard utama
│   │   ├── RekapTable.jsx     # Tabel rekap Jan-Des
│   │   └── SettingsModal.jsx  # Modal input Sheet ID
│   └── lib/
│       ├── parsers.js         # Parser semua jenis laporan
│       ├── fetchSheet.js      # Fetch data dari gviz API
│       └── store.js           # localStorage config
├── public/
│   ├── manifest.json          # PWA manifest
│   ├── sw.js                  # Service worker
│   └── icons/                 # Icon PWA (192 & 512px)
├── package.json
└── next.config.mjs
```

---

## 🎨 Desain

Desain by **Zulfikri** — tema warm-ivory elegan dengan dukungan dark mode.

---

## ❓ Troubleshooting

| Masalah | Solusi |
|---|---|
| Data tidak muncul | Pastikan sheet sudah dibagikan "Anyone with the link can view" |
| Tab bulan tidak terbaca | Cek nama tab: harus angka 1-12 atau nama bulan |
| "Uji Saring" / "Imunohematologi" kosong | Parser mencoba baca format otomatis — lihat "catatan data" di dashboard |
| Error CORS | Sudah ditangani oleh API route Next.js |
| Data lama / tidak update | Klik tombol **"Muat Ulang"** |
