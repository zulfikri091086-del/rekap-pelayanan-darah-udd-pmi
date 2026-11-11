'use client';
import { useState } from 'react';
import { JENIS_LIST, extractId, DEFAULT_CONFIG } from '@/lib/store';

const JENIS_INFO = {
  pelayanan:  { icon: '🩸', hint: 'Contoh: 1Mk2DnpJbF86Gq1VNDKDF6NmOe7cRnPNEPEcy2QffJK8' },
  imuno:      { icon: '🔬', hint: 'Sheet harus dibagikan "Anyone with the link can view"' },
  ujisaring:  { icon: '🧪', hint: 'Sheet harus dibagikan "Anyone with the link can view"' },
  pemusnahan: { icon: '🗑', hint: 'Sheet harus dibagikan "Anyone with the link can view"' },
  komponen:   { icon: '🏥', hint: 'Sheet harus dibagikan "Anyone with the link can view"' },
};

export default function SettingsModal({ cfg, onSave, onClose }) {
  const [form, setForm] = useState(() => {
    // Deep clone dari cfg
    const c = JSON.parse(JSON.stringify(cfg || DEFAULT_CONFIG));
    if (!c.tahun) c.tahun = {};
    return c;
  });
  const [tahunBaru, setTahunBaru] = useState('');
  const [saved, setSaved] = useState(false);

  const setField = (path, value) => {
    setForm((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      const parts = path.split('.');
      let obj = next;
      for (let i = 0; i < parts.length - 1; i++) obj = obj[parts[i]];
      obj[parts[parts.length - 1]] = value;
      return next;
    });
    setSaved(false);
  };

  const setSheetId = (thn, jenis, val) => {
    setForm((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      if (!next.tahun[thn]) next.tahun[thn] = {};
      next.tahun[thn][jenis] = val.trim();
      return next;
    });
    setSaved(false);
  };

  const tambahTahun = () => {
    const t = tahunBaru.trim();
    if (!t || !/^\d{4}$/.test(t)) { alert('Masukkan tahun yang valid (4 digit, contoh: 2027)'); return; }
    if (form.tahun[t]) { alert('Tahun ' + t + ' sudah ada'); return; }
    setForm((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      next.tahun[t] = { pelayanan: '', imuno: '', ujisaring: '', pemusnahan: '', komponen: '' };
      return next;
    });
    setTahunBaru('');
    setSaved(false);
  };

  const hapusTahun = (thn) => {
    if (!confirm(`Hapus semua data konfigurasi tahun ${thn}?`)) return;
    setForm((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      delete next.tahun[thn];
      return next;
    });
    setSaved(false);
  };

  const handleSave = () => {
    onSave(form);
    setSaved(true);
  };

  const tahunList = Object.keys(form.tahun).sort().reverse();

  return (
    <div className="modal-bg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2>⚙ Pengaturan Sheet ID</h2>
        <p className="desc">
          Masukkan ID Google Spreadsheet atau URL lengkap untuk setiap laporan dan tahun.
          Sheet harus dibagikan dengan akses <strong>"Anyone with the link can view"</strong>.
        </p>

        {/* Judul Dashboard */}
        <div className="section-title">Informasi Dashboard</div>
        <div className="form-group">
          <label>Judul Dashboard</label>
          <input
            type="text"
            value={form.judul || ''}
            onChange={(e) => setField('judul', e.target.value)}
            placeholder="Rekap Laporan UDD PMI Kota Banda Aceh"
          />
        </div>

        {/* Sheet IDs per tahun */}
        <div className="section-title">Sheet ID per Tahun</div>

        {tahunList.length === 0 && (
          <div style={{ color: 'var(--ink-3)', marginBottom: 12, fontSize: 13 }}>
            Belum ada tahun. Tambahkan tahun di bawah.
          </div>
        )}

        {tahunList.map((thn) => (
          <div key={thn} className="year-block">
            <div className="year-header">
              <div className="year-label">📅 Tahun {thn}</div>
              <button className="danger ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => hapusTahun(thn)}>
                Hapus Tahun
              </button>
            </div>

            {JENIS_LIST.map(({ jenis, nama }) => {
              const { icon, hint } = JENIS_INFO[jenis];
              const val = form.tahun[thn]?.[jenis] || '';
              const id = extractId(val);
              return (
                <div key={jenis} className="form-group">
                  <label>
                    {icon} {nama}
                    {id && <span>✓ ID: {id.slice(0, 20)}…</span>}
                  </label>
                  <input
                    type="text"
                    value={val}
                    onChange={(e) => setSheetId(thn, jenis, e.target.value)}
                    placeholder={`URL atau ID spreadsheet ${nama}`}
                  />
                  <small>{hint}</small>
                </div>
              );
            })}
          </div>
        ))}

        {/* Tambah tahun baru */}
        <div className="add-year">
          <input
            type="text"
            value={tahunBaru}
            onChange={(e) => setTahunBaru(e.target.value)}
            placeholder="2027"
            onKeyDown={(e) => e.key === 'Enter' && tambahTahun()}
            maxLength={4}
          />
          <button onClick={tambahTahun}>+ Tambah Tahun</button>
        </div>

        {/* Info cara mendapatkan ID */}
        <details style={{ marginTop: 20 }}>
          <summary style={{ cursor: 'pointer', color: 'var(--accent)', fontWeight: 500, fontSize: 13 }}>
            ℹ Cara mendapatkan Sheet ID
          </summary>
          <div style={{ marginTop: 10, fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.7 }}>
            <p>1. Buka Google Spreadsheet yang ingin digunakan.</p>
            <p>2. Salin URL lengkap dari address bar browser, contoh:</p>
            <code style={{ display: 'block', background: 'var(--bg-2)', padding: '6px 10px', borderRadius: 8, margin: '6px 0', fontSize: 11, wordBreak: 'break-all' }}>
              https://docs.google.com/spreadsheets/d/<strong>1Mk2DnpJbF86Gq1VNDKDF6</strong>/edit#gid=0
            </code>
            <p>3. Bagian yang dicetak tebal adalah Sheet ID. Tempel URL lengkap atau ID saja ke kolom di atas.</p>
            <p style={{ marginTop: 8 }}>4. Pastikan sheet sudah dibagikan: klik tombol <strong>Share</strong> → pilih <strong>"Anyone with the link"</strong> → <strong>Viewer</strong>.</p>
            <p style={{ marginTop: 8 }}>5. Tab bulan di sheet harus bernama: <code>1</code>, <code>2</code>, ... <code>12</code> (atau <code>Januari</code>, <code>February</code>, dll).</p>
          </div>
        </details>

        <div className="modal-actions">
          {saved && <span style={{ color: 'var(--ok-ink)', fontSize: 13, alignSelf: 'center' }}>✓ Tersimpan!</span>}
          <button onClick={onClose}>Tutup</button>
          <button className="primary" onClick={handleSave}>💾 Simpan & Terapkan</button>
        </div>
      </div>
    </div>
  );
}
