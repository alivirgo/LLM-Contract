import type { SuiteResult } from '../types/suite.js';
import type { PolicyEvaluationResult } from '../types/policy.js';

/**
 * Generates a self-contained, interactive HTML dashboard report.
 */
export function formatHtmlReport(
  suiteResult: SuiteResult,
  policyResult?: PolicyEvaluationResult
): string {
  const m = suiteResult.metrics;
  const serializedData = JSON.stringify({ suite: suiteResult, policy: policyResult });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>LLM Behavioral Contract Report - ${escapeHtml(suiteResult.suiteName)}</title>
  <style>
    :root {
      --bg: #0d1117;
      --card-bg: #161b22;
      --border: #30363d;
      --text: #c9d1d9;
      --text-muted: #8b949e;
      --accent: #58a6ff;
      --success: #3fb950;
      --danger: #f85149;
      --warning: #d29922;
      --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: var(--font);
      padding: 24px;
      line-height: 1.5;
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 24px;
    }
    h1 { font-size: 24px; font-weight: 600; color: #fff; }
    .status-badge {
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .badge-pass { background: rgba(63, 185, 80, 0.2); color: var(--success); border: 1px solid var(--success); }
    .badge-fail { background: rgba(248, 81, 73, 0.2); color: var(--danger); border: 1px solid var(--danger); }

    .grid-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .stat-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 16px;
    }
    .stat-title { font-size: 12px; color: var(--text-muted); text-transform: uppercase; }
    .stat-value { font-size: 24px; font-weight: 700; margin-top: 4px; color: #fff; }

    .filters-bar {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
      align-items: center;
      flex-wrap: wrap;
    }
    .filter-btn {
      background: var(--card-bg);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      transition: all 0.2s;
    }
    .filter-btn.active, .filter-btn:hover {
      background: var(--border);
      color: #fff;
    }
    .search-box {
      margin-left: auto;
      background: var(--card-bg);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 8px 14px;
      border-radius: 6px;
      font-size: 13px;
      min-width: 240px;
    }

    .case-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      margin-bottom: 16px;
      overflow: hidden;
      transition: border-color 0.2s;
    }
    .case-card.failed { border-left: 4px solid var(--danger); }
    .case-card.passed { border-left: 4px solid var(--success); }
    .case-card.regression { border-left: 4px solid #ff0055; background: rgba(255, 0, 85, 0.03); }

    .case-header {
      padding: 14px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
      user-select: none;
    }
    .case-title { font-weight: 600; font-size: 15px; color: #fff; display: flex; align-items: center; gap: 8px; }
    .case-details {
      padding: 0 18px 18px 18px;
      display: none;
      border-top: 1px solid rgba(255,255,255,0.05);
    }
    .case-card.open .case-details { display: block; }

    .check-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid rgba(255,255,255,0.05);
      font-size: 13px;
    }
    .code-block {
      background: #090d13;
      border: 1px solid var(--border);
      padding: 12px;
      border-radius: 6px;
      font-family: monospace;
      font-size: 12px;
      overflow-x: auto;
      margin-top: 8px;
      white-space: pre-wrap;
    }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>🛡️ LLM Behavioral Contract Report: ${escapeHtml(suiteResult.suiteName)}</h1>
      <p style="color: var(--text-muted); font-size: 13px; margin-top: 4px;">
        Generated at ${new Date(suiteResult.timestamp).toLocaleString()}
      </p>
    </div>
    <div>
      <span class="status-badge ${m.passRate >= 0.95 && m.regressionsCount === 0 ? 'badge-pass' : 'badge-fail'}">
        ${m.passRate >= 0.95 && m.regressionsCount === 0 ? 'Passed' : 'Failed'}
      </span>
    </div>
  </header>

  <div class="grid-stats">
    <div class="stat-card">
      <div class="stat-title">Pass Rate</div>
      <div class="stat-value" style="color: ${m.passRate >= 0.95 ? 'var(--success)' : 'var(--danger)'}">
        ${(m.passRate * 100).toFixed(1)}%
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-title">Total Cases</div>
      <div class="stat-value">${m.totalCases}</div>
    </div>
    <div class="stat-card">
      <div class="stat-title">Regressions</div>
      <div class="stat-value" style="color: ${m.regressionsCount > 0 ? 'var(--danger)' : 'inherit'}">
        ${m.regressionsCount}
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-title">Fixes</div>
      <div class="stat-value" style="color: ${m.fixesCount > 0 ? 'var(--success)' : 'inherit'}">
        ${m.fixesCount}
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-title">Flaky Cases</div>
      <div class="stat-value" style="color: ${m.flakyCasesCount > 0 ? 'var(--warning)' : 'inherit'}">
        ${m.flakyCasesCount}
      </div>
    </div>
  </div>

  <div class="filters-bar">
    <button class="filter-btn active" onclick="setFilter('all')">All (${m.totalCases})</button>
    <button class="filter-btn" onclick="setFilter('failed')">Failed (${m.failedCases})</button>
    <button class="filter-btn" onclick="setFilter('passed')">Passed (${m.passedCases})</button>
    <button class="filter-btn" onclick="setFilter('regression')">Regressions (${m.regressionsCount})</button>
    <button class="filter-btn" onclick="setFilter('flaky')">Flaky (${m.flakyCasesCount})</button>
    <input type="text" id="search" class="search-box" placeholder="Search case ID or text..." oninput="renderCases()" />
  </div>

  <div id="cases-container"></div>

  <script>
    const reportData = ${serializedData};
    let currentFilter = 'all';

    function setFilter(f) {
      currentFilter = f;
      document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
      event.target.classList.add('active');
      renderCases();
    }

    function renderCases() {
      const container = document.getElementById('cases-container');
      const search = (document.getElementById('search').value || '').toLowerCase();
      const results = reportData.suite.results;

      const filtered = results.filter(r => {
        if (currentFilter === 'failed' && r.passed) return false;
        if (currentFilter === 'passed' && !r.passed) return false;
        if (currentFilter === 'regression' && r.baselineComparison?.status !== 'regression') return false;
        if (currentFilter === 'flaky' && !r.isFlaky) return false;

        if (search) {
          const matchId = r.caseId.toLowerCase().includes(search);
          const matchText = JSON.stringify(r.input).toLowerCase().includes(search);
          if (!matchId && !matchText) return false;
        }
        return true;
      });

      if (filtered.length === 0) {
        container.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--text-muted);">No test cases match filter criteria.</div>';
        return;
      }

      container.innerHTML = filtered.map(r => {
        const isReg = r.baselineComparison?.status === 'regression';
        const cardClass = isReg ? 'regression' : r.passed ? 'passed' : 'failed';
        const tag = isReg ? '<span style="color:#ff0055; font-size:12px; font-weight:700;">[REGRESSION]</span>' : '';

        return \`
          <div class="case-card \${cardClass}" onclick="this.classList.toggle('open')">
            <div class="case-header">
              <div class="case-title">
                <span>\${r.passed ? '✓' : '✗'}</span>
                <span>\${escapeHtml(r.caseId)}</span>
                \${tag}
              </div>
              <div style="font-size: 13px; color: var(--text-muted);">
                Score: \${(r.score * 100).toFixed(0)}%
              </div>
            </div>
            <div class="case-details">
              <div style="margin-top: 10px;">
                <strong>Checks:</strong>
                \${r.primaryResult.checks.map(c => \`
                  <div class="check-row">
                    <span>\${c.pass ? '✓' : '✗'} \${escapeHtml(c.name)} \${c.isHard ? '(hard)' : '(soft)'}</span>
                    <span style="color: \${c.pass ? 'var(--success)' : 'var(--danger)'}">\${(c.score * 100).toFixed(0)}%</span>
                  </div>
                \`).join('')}
              </div>

              \${r.primaryResult.failures.length > 0 ? \`
                <div style="margin-top: 14px;">
                  <strong style="color: var(--danger);">Failures:</strong>
                  \${r.primaryResult.failures.map(f => \`
                    <div style="color: var(--danger); font-size: 13px; margin-top: 4px;">
                      • [\${escapeHtml(f.code)}] \${escapeHtml(f.message)}
                    </div>
                  \`).join('')}
                </div>
              \` : ''}

              <div style="margin-top: 14px;">
                <strong>Raw Output:</strong>
                <pre class="code-block">\${escapeHtml(r.primaryResult.rawOutput)}</pre>
              </div>
            </div>
          </div>
        \`;
      }).join('');
    }

    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    renderCases();
  </script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
