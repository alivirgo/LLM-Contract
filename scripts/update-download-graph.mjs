import { mkdir, writeFile } from 'node:fs/promises';

const packageName = process.env.NPM_PACKAGE_NAME || 'llm-contract';
const outputPath = process.env.DOWNLOAD_GRAPH_PATH || 'assets/npm-downloads.svg';
const days = 30;

const end = new Date();
end.setUTCDate(end.getUTCDate() - 1);
const start = new Date(end);
start.setUTCDate(start.getUTCDate() - (days - 1));
const iso = date => date.toISOString().slice(0, 10);
const url = `https://api.npmjs.org/downloads/range/${iso(start)}:${iso(end)}/${encodeURIComponent(packageName)}`;

let downloads = [];
let status = '';
try {
  const response = await fetch(url, { headers: { 'user-agent': 'npm-download-graph/1.0' } });
  if (!response.ok) throw new Error(`npm API returned ${response.status}`);
  downloads = (await response.json()).downloads ?? [];
} catch (error) {
  status = `Download data is still being indexed (${error.message}).`;
}

const values = downloads.map(item => Number(item.downloads) || 0);
const total = values.reduce((sum, value) => sum + value, 0);
const max = Math.max(1, ...values);
const width = 820;
const height = 260;
const left = 52;
const top = 76;
const chartWidth = 738;
const chartHeight = 128;
const points = values.map((value, index) => {
  const x = left + (index * chartWidth) / Math.max(1, values.length - 1);
  const y = top + chartHeight - (value / max) * chartHeight;
  return `${x.toFixed(1)},${y.toFixed(1)}`;
}).join(' ');
const area = points ? `${left},${top + chartHeight} ${points} ${left + chartWidth},${top + chartHeight}` : '';
const updated = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
const escapeXml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Daily npm downloads for ${escapeXml(packageName)}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#0d1117"/><stop offset="1" stop-color="#161b22"/></linearGradient>
    <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#58a6ff" stop-opacity=".5"/><stop offset="1" stop-color="#58a6ff" stop-opacity=".03"/></linearGradient>
  </defs>
  <rect width="820" height="260" rx="14" fill="url(#bg)"/>
  <text x="28" y="35" fill="#f0f6fc" font-family="Arial, sans-serif" font-size="19" font-weight="700">${escapeXml(packageName)} · daily npm downloads</text>
  <text x="28" y="59" fill="#8b949e" font-family="Arial, sans-serif" font-size="13">Last ${days} days · ${total.toLocaleString('en-US')} downloads · updated ${updated}</text>
  <line x1="${left}" y1="${top}" x2="${left}" y2="${top + chartHeight}" stroke="#30363d"/>
  <line x1="${left}" y1="${top + chartHeight}" x2="${left + chartWidth}" y2="${top + chartHeight}" stroke="#30363d"/>
  ${area ? `<polygon points="${area}" fill="url(#fill)"/><polyline points="${points}" fill="none" stroke="#58a6ff" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>` : ''}
  <text x="16" y="${top + 5}" fill="#8b949e" font-family="Arial, sans-serif" font-size="11">${max}</text>
  <text x="35" y="${top + chartHeight + 4}" fill="#8b949e" font-family="Arial, sans-serif" font-size="11">0</text>
  <text x="${left}" y="230" fill="#8b949e" font-family="Arial, sans-serif" font-size="11">${escapeXml(iso(start))}</text>
  <text x="${left + chartWidth}" y="230" fill="#8b949e" text-anchor="end" font-family="Arial, sans-serif" font-size="11">${escapeXml(iso(end))}</text>
  ${status ? `<text x="410" y="145" fill="#d29922" text-anchor="middle" font-family="Arial, sans-serif" font-size="14">${escapeXml(status)}</text>` : ''}
</svg>\n`;

await mkdir(new URL('../assets/', import.meta.url), { recursive: true });
await writeFile(outputPath, svg, 'utf8');
console.log(`Updated ${outputPath} for ${packageName} (${total} downloads).`);
