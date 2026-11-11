'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { loadConfig, saveConfig, daftarTahun, JENIS_LIST, extractId } from '@/lib/store';
import { bangunRekap } from '@/lib/parsers';
import RekapTable from './RekapTable';
import SettingsModal from './SettingsModal';

const BULAN = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
const fmt = new Intl.NumberFormat('id-ID');
const fmtP = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 });

function angkaFmt(v, satuan) {
  return satuan ? fmtP.format(v) + '%' : fmt.format(v);
}

export default function Dashboard() {
  const [cfg, setCfg] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [tahun, setTahun] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [lapIdx, setLapIdx] = useState(0);
  const [tampilanId, setTampilanId] = useState({});
  const [sembunyi, setSembunyi] = useState(true);
  const [cari, setCari] = useState('');
  const abortRef = useRef(null);

  // Load config dari localStorage
  useEffect(() => {
    const c = loadConfig();
    setCfg(c);
    const tahunList = daftarTahun(c);
    setTahun(tahunList[0] || '');
  }, []);

  // Fetch data setiap kali tahun berubah
  useEffect(() => {
    if (!cfg || !tahun) return;
    fetchData(cfg, tahun);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tahun, cfg]);

  const fetchData = useCallback(async (config, thn, paksa = false) => {
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const sheetsCfg = config.tahun?.[thn];
    if (!sheetsCfg) {
      setData(null); setErr(''); return;
    }

    // Cek apakah ada sheet yang diisi
    const jenisAktif = JENIS_LIST.filter((j) => sheetsCfg[j.jenis] && extractId(sheetsCfg[j.jenis]));
    if (!jenisAktif.length) {
      setData(null); setErr('');
      setShowSettings(true); // Auto-buka settings jika belum ada ID
      return;
    }

    setLoading(true); setErr(''); setData(null);

    try {
      // Fetch semua sheet secara paralel
      const sheetData = {};
      await Promise.all(
        jenisAktif.map(async ({ jenis, nama }) => {
          const sheetId = extractId(sheetsCfg[jenis]);
          if (!sheetId) return;
          try {
            const res = await fetch(
              `/api/sheet?id=${encodeURIComponent(sheetId)}&all=1`,
              { signal: ctrl.signal, cache: paksa ? 'no-store' : 'default' }
            );
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            if (json.data) {
              sheetData[jenis] = { nama, nilai: json.data };
            }
          } catch (e) {
            if (e.name === 'AbortError') throw e;
            console.error(`Gagal fetch ${jenis}:`, e);
          }
        })
      );

      const rekap = bangunRekap(thn, sheetData);
      setData(rekap);
      setLapIdx(0);
    } catch (e) {
      if (e.name !== 'AbortError') setErr(e.message || 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSaveSettings = (newCfg) => {
    saveConfig(newCfg);
    setCfg(newCfg);
    setShowSettings(false);
    const tahunList = daftarTahun(newCfg);
    const thn = tahunList[0] || tahun;
    setTahun(thn);
  };

  const handleMuatUlang = () => fetchData(cfg, tahun, true);

  const lap = data?.laporan?.[lapIdx];
  const tampilanAktif = lap
    ? (lap.tampilan.find((t) => t.id === tampilanId[lap.id]) || lap.tampilan[0])
    : null;

  const tahunList = cfg ? daftarTahun(cfg) : [];

  return (
    <div className="wrap">
      <header>
        <div>
          <div className="eyebrow">Unit Donor Darah · PMI Kota Banda Aceh</div>
          <h1>{cfg?.judul || 'Rekap Laporan UDD PMI'}</h1>
          <div className="sub">
            {data ? `Tahun ${data.tahun} · diperbarui ${data.diperbarui}` : '\u00A0'}
          </div>
        </div>
        <div className="controls">
          <span className="lbl">Tahun</span>
          <select value={tahun} onChange={(e) => setTahun(e.target.value)} aria-label="Pilih tahun">
            {tahunList.map((t) => <option key={t}>{t}</option>)}
          </select>
          <button onClick={handleMuatUlang} className="primary" disabled={loading}>
            {loading ? <><span className="spin" />&nbsp;Memuat…</> : 'Muat Ulang'}
          </button>
          <button onClick={() => setShowSettings(true)} className="ghost" title="Pengaturan Sheet ID">
            ⚙ Pengaturan
          </button>
        </div>
      </header>

      {/* Peringatan */}
      {data?.peringatan?.length > 0 && (
        <details className="warn">
          <summary>{data.peringatan.length} catatan data</summary>
          <ul>{data.peringatan.map((p, i) => <li key={i}>{p}</li>)}</ul>
        </details>
      )}

      {/* Error */}
      {err && <div className="warn"><strong>Error:</strong> {err}</div>}

      {/* Belum ada config */}
      {!loading && !data && !err && (
        <div className="card">
          <div className="state">
            <div style={{ marginBottom: 16, fontSize: 36 }}>📋</div>
            <div style={{ marginBottom: 12, fontWeight: 600 }}>Belum ada Sheet ID yang dikonfigurasi</div>
            <div style={{ marginBottom: 20, color: 'var(--ink-3)' }}>
              Klik tombol di bawah untuk memasukkan ID spreadsheet Google Sheets Anda.
            </div>
            <button className="primary" onClick={() => setShowSettings(true)}>⚙ Buka Pengaturan Sheet</button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="card">
          <div className="state"><span className="spin" /> Mengambil data dari Google Sheets…</div>
        </div>
      )}

      {/* Dashboard */}
      {data && !loading && (
        <>
          {/* Tab laporan */}
          <div className="tabs" role="tablist">
            {data.laporan.map((l, i) => (
              <button
                key={l.id}
                className={`tab ${i === lapIdx ? 'active' : ''}`}
                role="tab"
                aria-selected={i === lapIdx}
                onClick={() => { setLapIdx(i); setCari(''); }}
              >
                {l.nama}
              </button>
            ))}
          </div>

          {lap && tampilanAktif ? (
            <>
              {/* Chips ringkasan */}
              <ChipSummary lap={lap} tampilan={tampilanAktif} tahun={tahun} />

              {/* Toolbar */}
              <div className="bar">
                <div className="left">
                  <select
                    value={tampilanAktif.id}
                    onChange={(e) => setTampilanId({ ...tampilanId, [lap.id]: e.target.value })}
                    aria-label="Pilih tabel"
                  >
                    {lap.tampilan.map((t) => (
                      <option key={t.id} value={t.id}>{t.judul}</option>
                    ))}
                  </select>
                  <input
                    type="search"
                    placeholder="Cari baris…"
                    value={cari}
                    onChange={(e) => setCari(e.target.value)}
                  />
                </div>
                <div className="right">
                  <label className="chk">
                    <input type="checkbox" checked={sembunyi} onChange={(e) => setSembunyi(e.target.checked)} />
                    Sembunyikan baris kosong
                  </label>
                  <DownloadButtons lap={lap} tampilan={tampilanAktif} tahun={tahun} sembunyi={sembunyi} cari={cari} />
                </div>
              </div>

              <div className="card">
                <div className="cap">
                  <div>
                    <h2>{tampilanAktif.judul}</h2>
                    <span>{lap.nama} · {tahun}</span>
                  </div>
                  {cfg?.tahun?.[tahun]?.[lap.id] && (
                    <a
                      href={`https://docs.google.com/spreadsheets/d/${extractId(cfg.tahun[tahun][lap.id])}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Buka Spreadsheet ↗
                    </a>
                  )}
                </div>
                <div className="scroll">
                  <RekapTable
                    tampilan={tampilanAktif}
                    tahun={tahun}
                    sembunyi={sembunyi}
                    cari={cari}
                  />
                </div>
              </div>

              <div className="note">
                Bulan terbaca: {lap.bulanAda.length} dari 12. "·" = tab bulan belum ada, "–" = nol/kosong.
              </div>
            </>
          ) : (
            lap && (
              <div className="card">
                <div className="state">Laporan ini belum punya data yang bisa dibaca.</div>
              </div>
            )
          )}

          {!data.laporan.length && (
            <div className="card">
              <div className="state">Belum ada data yang bisa dibaca. Cek catatan di atas atau periksa pengaturan sheet.</div>
            </div>
          )}
        </>
      )}

      <Footer />

      {showSettings && (
        <SettingsModal
          cfg={cfg}
          onSave={handleSaveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

// ====================== CHIP SUMMARY ======================
function ChipSummary({ lap, tampilan, tahun }) {
  const rows = tampilan.baris.filter((b) => b.bulan.some((v) => v !== null && v !== 0));
  let total = null;
  if (tampilan.aditif) {
    total = rows.reduce((s, b) => s + b.bulan.reduce((ss, v) => ss + (v || 0), 0), 0);
  }
  const terisi = Array.from({ length: 12 }, (_, i) =>
    rows.some((b) => b.bulan[i] !== null && b.bulan[i] !== 0)
  ).filter(Boolean).length;

  const chips = [];
  if (total !== null) chips.push(['Total ' + tahun, fmt.format(total)]);
  chips.push(['Bulan berisi', `${terisi} / 12`]);
  if (total !== null && terisi > 0) chips.push(['Rata-rata/bulan', fmt.format(Math.round(total / terisi))]);

  return (
    <div className="chips">
      {chips.map(([k, v]) => (
        <div key={k} className="chip">
          <div className="k">{k}</div>
          <div className="v">{v}</div>
        </div>
      ))}
    </div>
  );
}

// ====================== DOWNLOAD BUTTONS ======================
function DownloadButtons({ lap, tampilan, tahun, sembunyi, cari }) {
  const getRows = () => {
    const q = cari.toLowerCase();
    return tampilan.baris.filter((b) => {
      if (q && !b.label.toLowerCase().includes(q)) return false;
      if (sembunyi && !b.bulan.some((v) => v !== null && v !== 0)) return false;
      return true;
    });
  };

  const getTotal = (b) => {
    if (!tampilan.aditif) return null;
    const vals = b.bulan.filter((v) => v !== null);
    return vals.length ? vals.reduce((s, v) => s + v, 0) : null;
  };

  const jumlah = Array.from({ length: 12 }, (_, i) => {
    const vals = getRows().map((b) => b.bulan[i]).filter((v) => v !== null);
    return vals.length ? vals.reduce((s, v) => s + v, 0) : null;
  });

  const jumTotal = tampilan.aditif ? jumlah.reduce((s, v) => s + (v || 0), 0) : null;

  const handleCSV = () => {
    const BULAN_H = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
    const c = (x) => { x = String(x === null ? '' : x); return /[;\"\n]/.test(x) ? `"${x.replace(/"/g,'""')}"` : x; };
    const n = (v) => v === null ? '' : String(v).replace('.', ',');
    const rows = getRows();
    const lines = [['Uraian', ...BULAN_H, `Total ${tahun}`].map(c).join(';')];
    rows.forEach((b) => lines.push([b.label, ...b.bulan.map(n), n(getTotal(b))].map(c).join(';')));
    lines.push(['JUMLAH', ...jumlah.map(n), n(jumTotal)].map(c).join(';'));
    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `rekap_${lap.id}_${tampilan.id}_${tahun}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const handleExcel = () => {
    if (window.XLSX) { doExcel(window.XLSX); return; }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    s.onload = () => doExcel(window.XLSX);
    document.head.appendChild(s);
  };

  const doExcel = (XLSX) => {
    const BULAN_H = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
    const rows = getRows();
    const aoa = [
      [tampilan.judul],
      [`${lap.nama} · Tahun ${tahun} · Unit Donor Darah PMI Kota Banda Aceh`],
      [],
      ['Uraian', ...BULAN_H, `Total ${tahun}`],
      ...rows.map((b) => [b.label, ...b.bulan, getTotal(b)]),
      ['JUMLAH', ...jumlah, jumTotal],
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [{ wch: 44 }, ...BULAN_H.map(() => ({ wch: 11 })), { wch: 14 }];
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 13 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 13 } }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${lap.nama} ${tahun}`.slice(0, 31));
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `rekap_${lap.id}_${tampilan.id}_${tahun}.xlsx`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const loadScript = (src) => new Promise((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) return res();
    const s = document.createElement('script'); s.src = src;
    s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });

  const handlePDF = async () => {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js');
    const BULAN_H = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const rows = getRows();
    const W = doc.internal.pageSize.getWidth(), ml = 28;
    const tx = (v) => v === null ? '·' : v === 0 ? '–' : fmt.format(v);

    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(156, 90, 102);
    doc.text('UNIT DONOR DARAH · PMI KOTA BANDA ACEH', ml, 30);
    doc.setFontSize(15); doc.setTextColor(61, 59, 66);
    doc.text(tampilan.judul, ml, 48);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(111, 107, 117);
    doc.text(`${lap.nama} · Tahun ${tahun} · diperbarui ${new Date().toLocaleDateString('id-ID')}`, ml, 62);

    const body = [
      ...rows.map((b) => [b.label, ...b.bulan.map(tx), getTotal(b) === null ? '–' : fmt.format(getTotal(b))]),
      ['JUMLAH', ...jumlah.map(tx), jumTotal === null ? '–' : fmt.format(jumTotal)],
    ];
    const last = body.length - 1;

    doc.autoTable({
      startY: 72, margin: { left: ml, right: ml, bottom: 30 },
      head: [['Uraian', ...BULAN_H, `Total ${tahun}`]],
      body,
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 7.5, cellPadding: 3, lineColor: [236,229,219], lineWidth: 0.4, textColor: [61,59,66], overflow: 'linebreak' },
      headStyles: { fillColor: [246,240,232], textColor: [111,107,117], fontStyle: 'bold', halign: 'right' },
      columnStyles: (() => {
        const cs = { 0: { cellWidth: 170, halign: 'left' }, 13: { fontStyle: 'bold', fillColor: [248,236,237], halign: 'right' } };
        for (let i = 1; i <= 12; i++) cs[i] = { halign: 'right' };
        return cs;
      })(),
      didParseCell: (d) => {
        if (d.section === 'head' && d.column.index === 0) d.cell.styles.halign = 'left';
        if (d.section === 'body' && d.row.index === last) {
          d.cell.styles.fontStyle = 'bold'; d.cell.styles.fillColor = [246,240,232];
          if (d.column.index === 13) { d.cell.styles.fillColor = [245,230,232]; d.cell.styles.textColor = [156,90,102]; }
        }
      },
      didDrawPage: () => {
        const pg = doc.internal.getCurrentPageInfo().pageNumber, H = doc.internal.pageSize.getHeight();
        doc.setFontSize(7.5); doc.setTextColor(163,159,168);
        doc.text('"·" = bulan belum ada, "–" = nol/kosong', ml, H - 14);
        doc.text(`Hal. ${pg}`, W - ml, H - 14, { align: 'right' });
      },
    });
    doc.save(`rekap_${lap.id}_${tampilan.id}_${tahun}.pdf`);
  };

  return (
    <>
      <button onClick={handleExcel}>Unduh Excel</button>
      <button onClick={handlePDF}>Unduh PDF</button>
      <button onClick={handleCSV}>Unduh CSV</button>
    </>
  );
}

// ====================== FOOTER ======================
function Footer() {
  return (
    <footer className="sign" aria-label="Kredit desain">
      <div className="orn"><i /><b /><i /></div>
      <svg width="64" height="64" viewBox="0 0 64 64" role="img" aria-label="Logo ZF">
        <defs>
          <linearGradient id="gz" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#e6d3ac"/><stop offset=".5" stopColor="#b89a6e"/><stop offset="1" stopColor="#8f7449"/>
          </linearGradient>
          <linearGradient id="gr" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#c9858f"/><stop offset="1" stopColor="#8f4f5b"/>
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r="29.5" fill="none" stroke="url(#gz)" strokeWidth="1.6"/>
        <circle cx="32" cy="32" r="25" fill="none" stroke="url(#gz)" strokeWidth=".7" strokeDasharray="1.2 2.6" strokeLinecap="round"/>
        <text x="32" y="40.5" textAnchor="middle" fontFamily="'Cormorant Garamond',Georgia,serif" fontSize="26" fontWeight="700" fontStyle="italic" letterSpacing="1" fill="url(#gr)">ZF</text>
        <path d="M21 46.5h22" stroke="url(#gz)" strokeWidth="1" strokeLinecap="round"/>
      </svg>
      <div className="by">Desain by <em>Zulfikri</em></div>
    </footer>
  );
}
