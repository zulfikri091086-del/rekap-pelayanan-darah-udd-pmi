/**
 * /api/sheet — Proxy fetch Google Sheets gviz/tq untuk menghindari CORS
 * GET /api/sheet?id={SHEET_ID}&tab={TAB_NAME}
 */

export const runtime = 'edge'; // jalankan di Vercel Edge untuk latensi rendah

const MONTH_MATCHERS = [
  ['jan', 'januari', 'january', '1', '01'],
  ['feb', 'februari', 'february', '2', '02'],
  ['mar', 'maret', 'march', '3', '03'],
  ['apr', 'april', '4', '04'],
  ['mei', 'may', '5', '05'],
  ['jun', 'juni', 'june', '6', '06'],
  ['jul', 'juli', 'july', '7', '07'],
  ['agu', 'agus', 'agustus', 'aug', 'august', '8', '08'],
  ['sep', 'september', '9', '09'],
  ['okt', 'oct', 'oktober', 'october', '10'],
  ['nov', 'november', '11'],
  ['des', 'dec', 'desember', 'december', '12'],
];

async function getSheetTabs(sheetId) {
  try {
    const res = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/edit`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    });
    if (!res.ok) return [];
    const html = await res.text();
    const tabs = [];
    const regex = /class="[^"]*docs-sheet-tab-caption[^"]*"[^>]*>([^<]+)<\/div>/g;
    let m;
    while ((m = regex.exec(html)) !== null) {
      tabs.push(m[1].trim());
    }
    return tabs;
  } catch {
    return [];
  }
}

function mapTabsToMonths(tabs) {
  const result = {};
  for (let m = 1; m <= 12; m++) {
    const matchers = MONTH_MATCHERS[m - 1];
    const found = tabs.find((t) => {
      const lower = t.toLowerCase().trim();
      return matchers.some((match) => lower === match || lower === `bulan ${match}` || lower.startsWith(match));
    });
    if (found) {
      result[m] = found;
    } else if (tabs[m - 1]) {
      result[m] = tabs[m - 1];
    } else {
      result[m] = String(m);
    }
  }
  return result;
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
  const allBulan = searchParams.get('all') === '1';

  if (!id) {
    return Response.json({ error: 'Parameter id diperlukan' }, { status: 400 });
  }

  if (!/^[a-zA-Z0-9_-]{20,}$/.test(id)) {
    return Response.json({ error: 'Format Sheet ID tidak valid' }, { status: 400 });
  }

  if (allBulan) {
    // 1. Dapatkan daftar nama tab asli dari dokumen
    const realTabs = await getSheetTabs(id);
    const tabMap = realTabs.length ? mapTabsToMonths(realTabs) : null;

    // 2. Fetch ke-12 bulan langsung menggunakan nama tab aslinya
    const result = {};
    await Promise.all(
      Array.from({ length: 12 }, async (_, idx) => {
        const m = idx + 1;
        const targetTab = tabMap ? tabMap[m] : String(m);
        if (targetTab) {
          const data = await fetchTab(id, targetTab);
          if (data && data.length > 0) {
            result[m] = data;
          }
        }
      })
    );

    return Response.json({ data: result }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  }

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
