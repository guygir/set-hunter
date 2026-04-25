const REPO_OWNER = 'guygir';
const REPO_NAME = 'set-hunter';
const MAX_REPORT_LEN = 200;

function sanitizeText(value, maxLen) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/[<>`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

function sanitizePlayerName(value) {
  return String(value || '')
    .replace(/[^a-zA-Z0-9_ \-]/g, '')
    .slice(0, 20)
    .trim() || 'Anonymous';
}

function buildIssueBody({ report, playerName, url, setName, day, budget, browser }) {
  const runContext = setName
    ? `Set: ${setName} | Day: ${day || '?'} | Budget: ${budget || '?'}`
    : 'Set: not in a run';

  return [
    '### What went wrong?',
    report,
    '',
    '### Player',
    playerName,
    '',
    '### Context',
    `URL: ${url || 'Unknown'}`,
    runContext,
    `Browser: ${browser || 'Unknown'}`,
  ].join('\n');
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.GITHUB_ISSUE_TOKEN || process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) return res.status(500).json({ error: 'GitHub issue token is not configured' });

  const body = req.body || {};
  const report = sanitizeText(body.report, MAX_REPORT_LEN);
  if (!report) return res.status(400).json({ error: 'Missing bug description' });

  const playerName = sanitizePlayerName(body.player_name);
  const issueBody = buildIssueBody({
    report,
    playerName,
    url: sanitizeText(body.url, 300),
    setName: sanitizeText(body.set_name, 60),
    day: sanitizeText(body.day, 10),
    budget: sanitizeText(body.budget, 20),
    browser: sanitizeText(body.browser, 300),
  });

  const ghRes = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'Set-Hunter-Bug-Reporter',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({
      title: `Bug report: ${report.slice(0, 60)}`,
      body: issueBody,
      labels: ['bug'],
    }),
  });

  const ghData = await ghRes.json().catch(() => ({}));
  if (!ghRes.ok) {
    return res.status(ghRes.status).json({ error: ghData.message || 'GitHub issue creation failed' });
  }

  return res.status(201).json({ url: ghData.html_url, number: ghData.number });
};
