'use strict';

const DEFAULT_API = process.env.GITHUB_API_BASE || 'https://api.github.com';

/**
 * Fetch a repository summary from the GitHub REST API.
 *
 * @param {string} slug Repository as "owner/repo".
 * @param {{token?: string, fetchImpl?: Function, apiBase?: string}} [options]
 * @returns {Promise<{fullName: string, description: string, stars: number, forks: number,
 *   language: string, license: string, defaultBranch: string, archived: boolean,
 *   pushedAt: string, htmlUrl: string}>}
 */
async function fetchRepoSummary(slug, options = {}) {
  if (typeof slug !== 'string' || !/^[^/\s]+\/[^/\s]+$/.test(slug)) {
    throw new Error(`slug must look like "owner/repo", got: ${JSON.stringify(slug)}`);
  }

  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    throw new Error('no fetch implementation available (pass options.fetchImpl)');
  }

  const apiBase = options.apiBase || DEFAULT_API;
  const headers = {
    'User-Agent': 'repo-card',
    Accept: 'application/vnd.github+json'
  };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  const response = await fetchImpl(`${apiBase}/repos/${slug}`, { headers });

  if (response.status === 404) throw new Error(`repository not found: ${slug}`);
  if (response.status === 403) throw new Error(`rate limited or forbidden: ${slug} (HTTP 403)`);
  if (!response.ok) throw new Error(`GitHub API returned HTTP ${response.status} for ${slug}`);

  const data = await response.json();

  return {
    fullName: data.full_name,
    description: data.description || '',
    stars: data.stargazers_count,
    forks: data.forks_count,
    language: data.language || 'unknown',
    license: data.license ? data.license.spdx_id : 'unspecified',
    defaultBranch: data.default_branch,
    archived: Boolean(data.archived),
    pushedAt: new Date(data.pushed_at).toISOString().slice(0, 10),
    htmlUrl: data.html_url
  };
}

/**
 * Render a summary as an aligned multi-line card.
 *
 * @param {ReturnType<typeof fetchRepoSummary> extends Promise<infer T> ? T : never} summary
 * @returns {string}
 */
function formatCard(summary) {
  const rows = [
    ['repository', summary.fullName],
    ['description', summary.description || '(none)'],
    ['stars', String(summary.stars)],
    ['forks', String(summary.forks)],
    ['language', summary.language],
    ['license', summary.license],
    ['default branch', summary.defaultBranch],
    ['last push', summary.pushedAt],
    ['archived', summary.archived ? 'yes' : 'no'],
    ['url', summary.htmlUrl]
  ];
  const width = Math.max(...rows.map(([k]) => k.length));
  return rows.map(([k, v]) => `${k.padEnd(width)} : ${v}`).join('\n');
}

module.exports = { fetchRepoSummary, formatCard };
