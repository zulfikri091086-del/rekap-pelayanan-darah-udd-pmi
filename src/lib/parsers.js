/**
 * PARSERS — port dari Google Apps Script Code.gs
 * Menerima data 2D array (v[row][col]) dari Google Sheets dan mengembalikan
 * array tampilan: [{ id, judul, aditif, baris: [{label, nilai}] }]
 */

// ====================== UTIL ======================
export function teks(x) {
  return x === null || x === undefined ? '' : String(x).replace(/\s+/g, ' ').trim();
}
export function adaAngka(x) {
  if (typeof x === 'number') return isFinite(x);
  if (typeof x === 'string') return /^\s*-?\d+([.,]\d+)?\s*$/.test(x);
  return false;
}
export function angka(x) {
  if (typeof x === 'number') return isFinite(x) ? x : 0;
  if (typeof x === 'string' && adaAngka(x)) return Number(x.replace(',', '.'));
  return 0;
}

// Kelompokkan label "Grup | Item" per grup
export function kelompokkan(urutan) {
  const grup = [], isi = {};
  urutan.forEach((label) => {
    const i = label.indexOf(' | ');
    const g = i < 0 ? '\u0000' + label : label.slice(0, i);
    if (!isi[g]) { isi[g] = []; grup.push(g); }
    isi[g].push(label);
  });
  return grup.reduce((h, g) => h.concat(isi[g]), []);
}

// ====================== PARSER 1: DISTRIBUSI / PELAYANAN DARAH ======================
export function parsePelayanan(v, bulan, peringatan) {
  const T = {};
  function tambah(id, judul, label, nilai) {
    if (!T[id]) T[id] = { id, judul, aditif: true, baris: [] };
    T[id].baris.push({ label, nilai });
  }

  let grup = 'Bagian di RS';

  for (let i = 0; i < v.length; i++) {
    const r = v[i];
    const col0 = teks(r[0]);
    const col1 = teks(r[1]);

    // Abaikan header besar
    if (/laporan distribusi|unit donor darah|tahun 20/i.test(col0) || /laporan distribusi/i.test(col1)) continue;
    // Abaikan baris jumlah
    if (/^jumlah$/i.test(col0) || /^jumlah$/i.test(col1)) continue;
    // Abaikan baris label header kolom
    if (/nama permintaan/i.test(col1) || /jumlah permintaan/i.test(col1) || /persentase/i.test(col1)) continue;
    if (/jenis rs yang dilayani/i.test(col1)) {
      grup = 'Berdasarkan Lokasi';
      continue;
    }
    if (col1 === '-' || col0 === '-') continue;
    if (!col1 && !col0) continue;

    let label = col1 || col0;
    label = label.replace(/^[0-9]+[.)]\s*/, '').replace(/^[a-z][.)]\s*/i, '').trim();
    if (!label) continue;

    // Tentukan pengelompokan baris
    if (i >= 11 && i <= 14) grup = 'Berdasarkan Penyakit / Diagnosa';
    else if (i >= 19 && i <= 24) grup = 'Berdasarkan Institusi';
    else if (i >= 28) grup = 'Berdasarkan Lokasi';
    else if (i < 8) grup = 'Bagian di RS';

    // Ambil nilai dari kolom pemenuhan (col 3), permintaan (col 2), atau angka pertama
    let val = 0;
    if (adaAngka(r[3])) {
      val = angka(r[3]);
    } else if (adaAngka(r[2])) {
      val = angka(r[2]);
    } else {
      for (let c = 2; c < r.length; c++) {
        if (adaAngka(r[c])) { val = angka(r[c]); break; }
      }
    }

    const fullLabel = grup ? `${grup} – ${label}` : label;
    tambah('rekap_pelayanan', 'Rekap Distribusi Darah (Realisasi/Dipenuhi)', fullLabel, val);

    if (adaAngka(r[2])) {
      tambah('permintaan', 'Distribusi Darah – Permintaan', fullLabel, angka(r[2]));
    }
  }

  return Object.values(T);
}

// ====================== PARSER 2: IMUNOHEMATOLOGI (UNIVERSAL SCAN) ======================
export function parseImuno(v, bulan, peringatan) {
  const T = {};
  function tambah(id, judul, label, nilai) {
    if (!T[id]) T[id] = { id, judul, aditif: true, baris: [] };
    T[id].baris.push({ label, nilai });
  }

  const reHeader = /^(no\.?|nomor|uraian|keterangan|nama|jenis|pemeriksaan|parameter|kegiatan|golongan|item|deskripsi|kategori|tipe|indikator|rs\b)/i;
  let headerRow = -1, labelCol = 0;
  const numericCols = [];

  for (let i = 0; i < Math.min(v.length, 30); i++) {
    const r = v[i];
    for (let c = 0; c < Math.min(r.length, 8); c++) {
      if (reHeader.test(teks(r[c]))) {
        if (/^(no\.?|nomor)$/i.test(teks(r[c])) && c + 1 < r.length && teks(r[c + 1])) {
          headerRow = i; labelCol = c + 1;
        } else { headerRow = i; labelCol = c; }
        break;
      }
    }
    if (headerRow >= 0) {
      for (let c = labelCol + 1; c < r.length; c++) {
        const ct = teks(r[c]);
        if (ct && !/^(no\.?|nomor)$/i.test(ct)) numericCols.push({ idx: c, label: ct });
      }
      break;
    }
  }

  if (headerRow < 0) {
    for (let i = 0; i < v.length; i++) {
      const r = v[i];
      const a = teks(r[0]), b = teks(r[1]);
      let firstNum = -1;
      for (let c = 1; c < r.length; c++) { if (adaAngka(r[c])) { firstNum = c; break; } }
      if ((a || b) && firstNum > 0) {
        labelCol = a && !adaAngka(r[0]) ? 0 : (b && !adaAngka(r[1]) ? 1 : 0);
        headerRow = i - 1;
        const hr = headerRow >= 0 ? (v[headerRow] || []) : [];
        for (let c = labelCol + 1; c < r.length; c++) {
          numericCols.push({ idx: c, label: teks(hr[c]) || `Kolom ${c + 1}` });
        }
        break;
      }
    }
  }

  const ABAIKAN = /^(laporan|pmi|unit\s*donor|rekapitulasi|tahun|mengetahui|kepala|penanggung|banda\s*aceh|ttd|tanggal|halaman)/i;
  const SKIP_TOT = /^(jumlah|total)(\s+seluruhnya|\s+keseluruhan)?$/i;
  let grup = '';
  const mulai = Math.max(0, headerRow + 1);

  for (let i = mulai; i < v.length; i++) {
    const r = v[i];
    let lbl = teks(r[labelCol >= 0 ? labelCol : 0]);
    if (!lbl) lbl = teks(r[0]);
    if (!lbl && r.length > 1) lbl = teks(r[1]);
    if (!lbl) continue;
    if (ABAIKAN.test(lbl) && !r.some((x) => adaAngka(x))) continue;
    if (SKIP_TOT.test(lbl)) continue;

    let punyaAngka = false;
    for (let c = 0; c < r.length; c++) {
      if (c !== labelCol && adaAngka(r[c])) { punyaAngka = true; break; }
    }
    if (!punyaAngka) { grup = lbl.replace(/^[a-z0-9]+[.)]\s*/i, '').trim(); continue; }

    const bersih = lbl.replace(/^[-–•*]\s*/, '').replace(/^[a-z0-9]+[.)]\s*/i, '').trim();
    const namaLengkap = grup && bersih && !bersih.toLowerCase().startsWith(grup.toLowerCase())
      ? `${grup} – ${bersih}` : (bersih || lbl);

    if (numericCols.length > 0) {
      let idxTotal = -1;
      numericCols.forEach((nc) => { if (/^(jumlah|total)\b/i.test(nc.label)) idxTotal = nc.idx; });
      let val = idxTotal >= 0 ? angka(r[idxTotal])
        : numericCols.length === 1 ? angka(r[numericCols[0].idx])
        : numericCols.reduce((s, nc) => s + angka(r[nc.idx]), 0);
      tambah('rekap_imuno', 'Imunohematologi (Total)', namaLengkap, val);
      if (numericCols.length > 1) {
        numericCols.forEach((nc) => {
          if (nc.idx !== idxTotal) {
            tambah('imuno_' + nc.label.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 20),
              'Imunohematologi – ' + nc.label, namaLengkap, angka(r[nc.idx]));
          }
        });
      }
    } else {
      for (let c = 0; c < r.length; c++) {
        if (c !== labelCol && adaAngka(r[c])) { tambah('rekap_imuno', 'Imunohematologi (Total)', namaLengkap, angka(r[c])); break; }
      }
    }
  }

  // Fallback total: baca semua baris dengan angka
  if (!Object.keys(T).length) {
    for (let i = 0; i < v.length; i++) {
      const r = v[i];
      const lbl = teks(r[0]) || teks(r[1]);
      if (!lbl || ABAIKAN.test(lbl)) continue;
      for (let c = 1; c < r.length; c++) {
        if (adaAngka(r[c])) { tambah('rekap_imuno', 'Imunohematologi (Total)', lbl, angka(r[c])); break; }
      }
    }
  }

  if (!Object.keys(T).length && peringatan) {
    peringatan.push(`Imunohematologi bulan ${bulan}: tidak ada baris data yang terbaca.`);
  }
  return Object.values(T);
}

// ====================== PARSER 3: UJI SARING IMLTD ======================
const JENIS_IMLTD = ['Hepatitis B', 'Hepatitis C', 'HIV', 'Sifilis', 'Malaria'];
const METODE_IMLTD = ['RAPID', 'EIA', 'CHLIA', 'NAT'];

export function parseUjiSaring(v, bulan, peringatan) {
  const T = {};
  function tambah(id, judul, label, nilai) {
    if (!T[id]) T[id] = { id, judul, aditif: true, baris: [] };
    T[id].baris.push({ label, nilai });
  }

  let sec = 0, sub = '', sudahSero = false, sudahNat = false, kolomUmur = [];

  for (let i = 0; i < v.length; i++) {
    const r = v[i];
    const a = teks(r[0]), b = teks(r[1]);

    // Deteksi nomor seksi: "1.", "2.", ..., "I.", "II.", dll.
    let mm = /^(\d+)[.)]\s/.exec(a) || /^(\d+)[.)]$/.exec(a);
    if (mm) { sec = Number(mm[1]); sub = ''; continue; }
    mm = /^(I{1,3}|IV|V)[.)]\s/i.exec(a);
    if (mm) {
      const rom = { I: 1, II: 2, III: 3, IV: 4, V: 5 };
      if (rom[mm[1].toUpperCase()]) { sec = rom[mm[1].toUpperCase()]; sub = ''; continue; }
    }
    mm = /^([ab])[.)]\s/i.exec(a);
    if (mm && sec === 5) { sub = mm[1].toLowerCase(); continue; }

    if (sec === 2 && JENIS_IMLTD.indexOf(b) >= 0) {
      METODE_IMLTD.forEach((m, k) => tambah('metode', 'Jumlah Pemeriksaan per Metode', `${b} – ${m}`, angka(r[3 + k])));
      continue;
    }

    if ((sec === 3 && !sudahSero) || (sec === 4 && !sudahNat)) {
      if (adaAngka(r[0]) && adaAngka(r[1])) {
        const jenis = sec === 3 ? JENIS_IMLTD : ['Hepatitis B', 'Hepatitis C', 'HIV', 'Tidak Didiskriminatori'];
        const pre = sec === 3 ? 'sero' : 'nat';
        const nm = sec === 3 ? 'Serologi' : 'NAT';
        jenis.forEach((j, k) => {
          tambah(`${pre}_n`, `${nm} – Jumlah Sampel Diperiksa`, j, angka(r[k * 3]));
          tambah(`${pre}_ir`, `${nm} – Reaktif Awal (IR)`, j, angka(r[k * 3 + 1]));
          tambah(`${pre}_rr`, `${nm} – Reaktif Ulang (RR)`, j, angka(r[k * 3 + 2]));
        });
        if (sec === 3) sudahSero = true; else sudahNat = true;
      }
      continue;
    }

    if (sec === 5 && sub === 'a' && !a && !b && teks(r[2]) && !/^Jumlah/i.test(teks(r[2]))) {
      kolomUmur = [];
      for (let k = 2; k < r.length; k++) {
        const h = teks(r[k]);
        if (!h || /^Jumlah/i.test(h)) break;
        kolomUmur.push({ idx: k, label: h });
      }
      continue;
    }
    if (sec === 5 && sub === 'a' && JENIS_IMLTD.indexOf(a) >= 0) {
      kolomUmur.forEach((u) => tambah('umur', 'Donor Reaktif per Kelompok Umur', `${a} | ${u.label}`, angka(r[u.idx])));
      continue;
    }
    if (sec === 5 && sub === 'b' && JENIS_IMLTD.indexOf(a) >= 0) {
      tambah('kelamin', 'Donor Reaktif per Jenis Kelamin', `${a} | Laki-laki`, angka(r[2]));
      tambah('kelamin', 'Donor Reaktif per Jenis Kelamin', `${a} | Perempuan`, angka(r[4]));
      continue;
    }
  }

  // Fallback generik jika seksi tidak terdeteksi
  if (!Object.keys(T).length) {
    if (peringatan) peringatan.push(`Uji Saring bulan ${bulan}: format seksi tidak dikenali, membaca secara generik.`);
    for (let i = 0; i < v.length; i++) {
      const r = v[i];
      const a = teks(r[0]), b = teks(r[1]);
      const lbl = JENIS_IMLTD.indexOf(a) >= 0 ? a : JENIS_IMLTD.indexOf(b) >= 0 ? b : (a || b);
      if (!lbl) continue;
      if (/^(laporan|pmi|unit|rekap|tahun|mengetahui|kepala|no\.?$)/i.test(lbl)) continue;
      if (/^(jumlah|total)/i.test(lbl)) continue;
      for (let c = 1; c < r.length; c++) {
        if (adaAngka(r[c])) { tambah('generik', 'Uji Saring IMLTD (Generik)', lbl, angka(r[c])); break; }
      }
    }
  }

  return Object.values(T);
}

// ====================== PARSER 4: PEMUSNAHAN DARAH ======================
export function parsePemusnahan(v, bulan, peringatan) {
  const baris = [];
  let mulai = false, grup = '', jumlahSheet = null;

  // Cek apakah data langsung mulai tanpa banner "Penyebab Darah" (kasus gviz)
  for (let i = 0; i < Math.min(v.length, 5); i++) {
    const b = teks(v[i][1]);
    if (/^Penyebab Darah/i.test(b) || /^Pengambilan Darah/i.test(b) || b.startsWith('-')) {
      mulai = true;
      break;
    }
  }

  for (let i = 0; i < v.length; i++) {
    const b = teks(v[i][1]);
    if (!mulai) {
      if (/^Penyebab Darah/i.test(b) || /^Pengambilan Darah/i.test(b)) mulai = true;
      continue;
    }
    if (!b) continue;
    if (/^JUMLAH$/i.test(b)) { jumlahSheet = v[i][5]; break; }
    const nilai = v[i][5];
    if (b.charAt(0) === '-') {
      baris.push({ label: (grup ? grup + ' – ' : '') + b.replace(/^-\s*/, ''), nilai: angka(nilai) });
    } else {
      grup = b.replace(/^[a-z0-9]\.\s*/i, '').replace(/^[0-9]+\.\s*/, '').trim();
      if (adaAngka(nilai)) baris.push({ label: grup, nilai: angka(nilai) });
    }
  }
  return [{ id: 'penyebab', judul: 'Jumlah Kantong Darah Dimusnahkan (per Penyebab)', aditif: true, baris }];
}

// ====================== PARSER 5: PENGOLAHAN KOMPONEN ======================
const KOMP_DEF = [
  ['stok',     'Stok Lalu',                                   false, [2]],
  ['produksi', 'Produksi UDD',                                true,  [3]],
  ['terima',   'Terima dari UDD Lain',                        true,  [4]],
  ['baru',     'Pengadaan Baru (Produksi + Terima UDD Lain)', true,  [3, 4]],
  ['bdrs',     'Pengeluaran ke BDRS',                         true,  [6, 7]],
  ['rs',       'Pengeluaran ke RS',                           true,  [8, 9]],
  ['uddpmi',   'Pengeluaran ke UDD PMI',                      true,  [10]],
  ['updrs',    'Pengeluaran ke UPD RS',                       true,  [11, 12]],
  ['dinkes',   'Pengeluaran ke UPD Dinkes',                   true,  [13, 14]],
  ['puf',      'Plasma untuk Fraksionasi (PuF)',              true,  [15]],
  ['keluar',   'Total Pengeluaran',                           true,  [6, 7, 8, 9, 10, 11, 12, 13, 14, 15]],
];

export function parseKomponen(v, bulan, peringatan) {
  let awal = -1;
  for (let i = 0; i < Math.min(v.length, 10); i++) {
    if (/^Stok Lalu/i.test(teks(v[i][2]))) { awal = i + 2; break; }
  }
  // Fallback untuk gviz: jika baris header tidak ada, mulai dari row 0
  if (awal < 0) awal = 0;

  const hasil = KOMP_DEF.map(([id, judul, aditif]) => ({ id, judul, aditif, baris: [] }));

  for (let i = awal; i < v.length; i++) {
    const a = teks(v[i][0]), b = teks(v[i][1]);
    if (/^JUMLAH$/i.test(a) || /^JUMLAH$/i.test(b)) break;
    const nama = b || (/^Lain-lain$/i.test(a) ? 'Lain-lain' : '');
    if (!nama) continue;
    KOMP_DEF.forEach(([, , , idxArr], k) => {
      const nilai = idxArr.reduce((s, idx) => s + angka(v[i][idx]), 0);
      hasil[k].baris.push({ label: nama, nilai });
    });
  }
  return hasil;
}

// ====================== REGISTRY ======================
export const JENIS_LAPORAN = {
  pelayanan:  { nama: 'Distribusi Darah',    urut: 1, parse: parsePelayanan },
  imuno:      { nama: 'Imunohematologi',      urut: 2, parse: parseImuno },
  ujisaring:  { nama: 'Uji Saring IMLTD',    urut: 3, parse: parseUjiSaring },
  pemusnahan: { nama: 'Pemusnahan Darah',    urut: 4, parse: parsePemusnahan },
  komponen:   { nama: 'Pengolahan Komponen', urut: 5, parse: parseKomponen },
};

// ====================== BUILDER ======================
/**
 * Bangun rekap dari array { jenis, nilai: {1: [[...]], 2: [[...]], ...} }
 * nilai = { [bulan]: 2D_array }
 */
export function bangunRekap(tahun, sheetData) {
  const out = {
    tahun,
    diperbarui: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
    laporan: [],
    peringatan: [],
  };

  const urut = Object.entries(sheetData)
    .filter(([jenis]) => JENIS_LAPORAN[jenis])
    .sort(([a], [b]) => JENIS_LAPORAN[a].urut - JENIS_LAPORAN[b].urut);

  urut.forEach(([jenis, { nama: namaCfg, nilai }]) => {
    const jenisInfo = JENIS_LAPORAN[jenis];
    const nama = namaCfg || jenisInfo.nama;
    const parse = jenisInfo.parse;
    const peta = {}, urutanTampilan = [], bulanAda = [];

    for (let m = 1; m <= 12; m++) {
      const v = nilai[m];
      if (!v || !v.length) continue;
      let tampilan;
      try { tampilan = parse(v, m, out.peringatan); }
      catch (e) { out.peringatan.push(`${nama} bulan ${m}: gagal (${e.message})`); continue; }
      bulanAda.push(m);
      tampilan.forEach((t) => {
        if (!peta[t.id]) { peta[t.id] = { id: t.id, judul: t.judul, aditif: t.aditif, urutan: [], baris: {} }; urutanTampilan.push(t.id); }
        const p = peta[t.id];
        t.baris.forEach((r) => {
          if (!p.baris[r.label]) { p.baris[r.label] = new Array(12).fill(null); p.urutan.push(r.label); }
          p.baris[r.label][m - 1] = r.nilai;
        });
      });
    }

    urutanTampilan.forEach((id) => {
      const p = peta[id];
      p.urutan.forEach((label) => {
        bulanAda.forEach((m) => { if (p.baris[label][m - 1] === null) p.baris[label][m - 1] = 0; });
      });
    });

    out.laporan.push({
      id: jenis,
      nama,
      bulanAda,
      tampilan: urutanTampilan.map((id) => {
        const p = peta[id];
        return {
          id: p.id, judul: p.judul, aditif: p.aditif,
          baris: kelompokkan(p.urutan).map((label) => ({ label, bulan: p.baris[label] })),
        };
      }),
    });
  });

  return out;
}
