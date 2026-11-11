/**
 * /api/sheet — Proxy fetch Google Sheets gviz/tq untuk menghindari CORS
 * GET /api/sheet?id={SHEET_ID}&tab={TAB_NAME}
 */

export const runtime = 'edge'; // jalankan di Vercel Edge untuk latensi rendah

const NAMA_IDN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const NAMA_ENG = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const SING_IDN = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
const SING_ENG = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function namaCandidates(m) {
  return [
    String(m), (m < 10 ? '0' : '') + m, m + '.', 'Bulan ' + m,
    NAMA_IDN[m - 1], NAMA_ENG[m - 1], SING_IDN[m - 1], SING_ENG[m - 1],
  ];
}

function parseGviz(text) {
  const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*?)\);?\s*$/);
  if (!match) return null;
  try {
    const json = JSON.parse(match[1]);
    if (json.status === 'error' || !json.table) return null;
    const rows = json.table.rows || [];
    const numCols = (json.table.cols || []).length;
    return rows.map((row) => {
      const cells = row.c || [];
      return Array.from({ length: numCols }, (_, i) => {
        const cell = cells[i];
        if (!cell || cell.v === null || cell.v === undefined) return '';
        if (typeof cell.v === 'string' && /^Date\(/.test(cell.v)) return cell.f || '';
        return cell.v;
      });
    });
  } catch {
    return null;
  }
}

async function fetchTab(sheetId, tabName) {
  const url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheetId)}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(tabName)}`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return null;
    return parseGviz(await res.text());
  } catch {
    return null;
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const tab = searchParams.get('tab');
  const allBulan = searchParams.get('all') === '1'; // ?all=1 untuk fetch semua bulan sekaligus

  if (!id) {
    return Response.json({ error: 'Parameter id diperlukan' }, { status: 400 });
  }

  // Validasi format ID (hanya alfanumerik, underscore, dash)
  if (!/^[a-zA-Z0-9_-]{20,}$/.test(id)) {
    return Response.json({ error: 'Format Sheet ID tidak valid' }, { status: 400 });
  }

  if (allBulan) {
    // Fetch semua 12 bulan sekaligus
    const result = {};
    await Promise.all(
      Array.from({ length: 12 }, async (_, idx) => {
        const m = idx + 1;
        for (const candidate of namaCandidates(m)) {
          const data = await fetchTab(id, candidate);
          if (data && data.length > 0) { result[m] = data; return; }
        }
      })
    );
    return Response.json({ data: result }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  }

  // Fetch tab tertentu
  if (!tab) {
    return Response.json({ error: 'Parameter tab atau all=1 diperlukan' }, { status: 400 });
  }
  const data = await fetchTab(id, tab);
  if (!data) {
    return Response.json({ error: 'Tab tidak ditemukan atau sheet tidak bisa diakses' }, { status: 404 });
  }
  return Response.json({ data }, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
  });
}
