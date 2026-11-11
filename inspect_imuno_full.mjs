const sid = '15BOwbSQ-2UYSNAIWgD-mnNPisY14nkiK4D1I_exnL5Y';
const res = await fetch(`https://docs.google.com/spreadsheets/d/${sid}/gviz/tq?tqx=out:json&sheet=1`);
const text = await res.text();
const json = JSON.parse(text.match(/setResponse\(([\s\S]*?)\);?\s*$/)[1]);
const rows = json.table.rows;

console.log('Total rows:', rows.length);
rows.forEach((r, idx) => {
  const cells = (r.c || []).map(c => c ? c.v : '');
  const non_empty = cells.map((val, colIdx) => (val !== '' && val !== null ? `${colIdx}: ${JSON.stringify(val)}` : '')).filter(Boolean);
  if (non_empty.length > 0) {
    console.log(`[R${idx}] ${non_empty.join(', ')}`);
  }
});
