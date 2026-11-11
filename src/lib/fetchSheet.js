/**
 * fetchSheet.js — Ambil data dari Google Sheets via gviz/tq API
 * Sheet harus dibagikan sebagai "Anyone with the link can view"
 */

const NAMA_IDN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const NAMA_ENG = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const SING_IDN = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
const SING_ENG = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function namaCandidates(m) {
  return [
    String(m),
    (m < 10 ? '0' : '') + m,
    m + '.',
    'Bulan ' + m,
    NAMA_IDN[m - 1],
    NAMA_ENG[m - 1],
    SING_IDN[m - 1],
    SING_ENG[m - 1],
  ];
}

/**
 * Parse respons gviz/tq menjadi 2D array.
 * gviz mengembalikan: google.visualization.Query.setResponse({...});
 */
function parseGviz(text) {
  const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*?)\);?\s*$/);
  if (!match) throw new Error('Format respons gviz tidak dikenal');
  const json = JSON.parse(match[1]);
  if (json.status === 'error') throw new Error(json.errors?.[0]?.detailed_message || 'Error dari gviz');
  if (!json.table) return null;
  const rows = json.table.rows || [];
  const numCols = (json.table.cols || []).length;
  return rows.map((row) => {
    const cells = row.c || [];
    return Array.from({ length: numCols }, (_, i) => {
      const cell = cells[i];
      if (!cell || cell.v === null || cell.v === undefined) return '';
      // gviz bisa mengembalikan Date sebagai "Date(year,month,day)" string
      if (typeof cell.v === 'string' && /^Date\(/.test(cell.v)) return cell.f || '';
      return cell.v;
    });
  });
}

/**
 * Fetch satu tab sheet dari Google Sheets via Next.js API proxy.
 * tabName: nama tab (string), misal "1", "Januari", dll.
 */
export async function fetchTabData(sheetId, tabName, signal) {
  const params = new URLSearchParams({ id: sheetId, tab: tabName });
  const res = await fetch(`/api/sheet?${params}`, { signal });
  if (!res.ok) return null;
  const json = await res.json();
  if (json.error) return null;
  return json.data || null;
}

/**
 * Fetch semua 12 tab bulan dari satu spreadsheet.
 * Mencoba berbagai nama tab hingga berhasil.
 * Mengembalikan { [bulan: 1-12]: 2D_array }
 */
export async function fetchAllBulan(sheetId, signal) {
  const hasil = {};
  await Promise.all(
    Array.from({ length: 12 }, async (_, idx) => {
      const m = idx + 1;
      const candidates = namaCandidates(m);
      for (const tab of candidates) {
        try {
          const data = await fetchTabData(sheetId, tab, signal);
          if (data && data.length > 0) {
            hasil[m] = data;
            return;
          }
        } catch (e) {
          if (e.name === 'AbortError') throw e;
        }
      }
      // Fallback: coba fetch info sheet untuk daftar tab (via API)
    })
  );
  return hasil;
}

/**
 * Versi server-side: fetch data gviz langsung (untuk Next.js API route).
 * Ini dipanggil dari /api/sheet/route.js, bukan dari browser.
 */
export async function fetchGvizServer(sheetId, tabName) {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(tabName)}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    next: { revalidate: 300 }, // cache 5 menit di server
  });
  if (!res.ok) return null;
  const text = await res.text();
  try {
    return parseGviz(text);
  } catch {
    return null;
  }
}
