/**
 * store.js — Kelola konfigurasi Sheet IDs di localStorage
 */

const STORAGE_KEY = 'rekapUDD_config_v1';

export const JENIS_LIST = [
  { jenis: 'pelayanan',  nama: 'Distribusi Darah' },
  { jenis: 'imuno',      nama: 'Imunohematologi' },
  { jenis: 'ujisaring',  nama: 'Uji Saring IMLTD' },
  { jenis: 'pemusnahan', nama: 'Pemusnahan Darah' },
  { jenis: 'komponen',   nama: 'Pengolahan Komponen' },
];

/** Konfigurasi default (sudah terisi ID 2026 bawaan, dapat diubah sewaktu-waktu lewat menu Pengaturan) */
export const DEFAULT_CONFIG = {
  judul: 'Rekap Laporan UDD PMI Kota Banda Aceh',
  tahunAktif: '2026',
  tahun: {
    '2026': {
      pelayanan:  '1Mk2DnpJbF86Gq1VNDKDF6NmOe7cRnPNEPEcy2QffJK8',
      imuno:      '15BOwbSQ-2UYSNAIWgD-mnNPisY14nkiK4D1I_exnL5Y',
      ujisaring:  '1DEOEUKfpOq8hri1k9AxLToKKknSpVooY_o-lB3LO9R8',
      pemusnahan: '1D10Ep6dz-2cYbWaih9F75-pdrvJwoKbxgN9ybqH0n0I',
      komponen:   '1MJx23joOgWaDYkVnOXZnwNLPetTSZBIGVhM7-eC7nbs',
    },
  },
};

export function loadConfig() {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_CONFIG);
    return JSON.parse(raw);
  } catch {
    return structuredClone(DEFAULT_CONFIG);
  }
}

export function saveConfig(cfg) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

/** Ekstrak Sheet ID dari URL lengkap atau ID langsung */
export function extractId(linkOrId) {
  if (!linkOrId) return '';
  const m = /\/d\/([a-zA-Z0-9_-]+)/.exec(linkOrId);
  return m ? m[1] : linkOrId.trim();
}

/** Daftar tahun dari konfigurasi (descending) */
export function daftarTahun(cfg) {
  return Object.keys(cfg.tahun || {}).sort().reverse();
}
