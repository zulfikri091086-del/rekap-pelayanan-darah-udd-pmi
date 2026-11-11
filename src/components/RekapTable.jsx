'use client';

const BULAN = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
const fmt = new Intl.NumberFormat('id-ID');

export default function RekapTable({ tampilan, tahun, sembunyi, cari }) {
  const q = (cari || '').toLowerCase();

  const rows = tampilan.baris.filter((b) => {
    if (q && !b.label.toLowerCase().includes(q)) return false;
    if (sembunyi && !b.bulan.some((v) => v !== null && v !== 0)) return false;
    return true;
  });

  if (!rows.length) {
    return <div className="state">Tidak ada baris yang cocok.</div>;
  }

  // Hitung total per kolom
  const jumlah = Array.from({ length: 12 }, (_, i) => {
    const vals = rows.map((b) => b.bulan[i]).filter((v) => v !== null);
    return vals.length ? vals.reduce((s, v) => s + v, 0) : null;
  });
  const jumTotal = tampilan.aditif
    ? jumlah.reduce((s, v) => s + (v || 0), 0)
    : null;

  const getTotal = (b) => {
    if (!tampilan.aditif) return null;
    const vals = b.bulan.filter((v) => v !== null);
    return vals.length ? vals.reduce((s, v) => s + v, 0) : null;
  };

  function Cell({ v }) {
    if (v === null) return <td className="na">·</td>;
    if (v === 0) return <td className="z">–</td>;
    return <td>{fmt.format(v)}</td>;
  }

  function TotCell({ v }) {
    return <td className="tot">{v === null ? '–' : fmt.format(v)}</td>;
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Uraian</th>
          {BULAN.map((b) => <th key={b}>{b}</th>)}
          <th className="tot">Total {tahun}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((b) => {
          const parts = b.label.split(/ – | \| /);
          const nama = parts.length > 1
            ? <><span className="grp">{parts[0]}</span><span className="nm">{parts.slice(1).join(' – ')}</span></>
            : <span className="nm">{b.label}</span>;
          return (
            <tr key={b.label}>
              <td>{nama}</td>
              {b.bulan.map((v, i) => <Cell key={i} v={v} />)}
              <TotCell v={getTotal(b)} />
            </tr>
          );
        })}
        <tr className="sum">
          <td>JUMLAH</td>
          {jumlah.map((v, i) => <Cell key={i} v={v} />)}
          <TotCell v={jumTotal} />
        </tr>
      </tbody>
    </table>
  );
}
