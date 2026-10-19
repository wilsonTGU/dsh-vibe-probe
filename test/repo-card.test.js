'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { fetchRepoSummary, formatCard } = require('../lib/repo-card');

/** Build a fake fetch that returns one canned response. */
function fakeFetch({ status = 200, body = {} }) {
  const calls = [];
  const impl = async (url, init) => {
    calls.push({ url, init });
    return {
      status,
      ok: status >= 200 && status < 300,
      json: async () => body
    };
  };
  impl.calls = calls;
  return impl;
}

const SAMPLE = {
  full_name: 'nodejs/examples',
  description: 'Runnable Node.js examples',
  stargazers_count: 673,
  forks_count: 384,
  language: 'JavaScript',
  license: { spdx_id: 'MIT' },
  default_branch: 'main',
  archived: true,
  pushed_at: '2024-06-22T16:42:43Z',
  html_url: 'https://github.com/nodejs/examples'
};

test('rejects a slug that is not owner/repo', async () => {
  await assert.rejects(() => fetchRepoSummary('not-a-slug'), /owner\/repo/);
  await assert.rejects(() => fetchRepoSummary(''), /owner\/repo/);
  await assert.rejects(() => fetchRepoSummary(undefined), /owner\/repo/);
});

test('maps the API payload onto the summary shape', async () => {
  const impl = fakeFetch({ body: SAMPLE });
  const summary = await fetchRepoSummary('nodejs/examples', { fetchImpl: impl });

  assert.equal(summary.fullName, 'nodejs/examples');
  assert.equal(summary.stars, 673);
  assert.equal(summary.forks, 384);
  assert.equal(summary.language, 'JavaScript');
  assert.equal(summary.license, 'MIT');
  assert.equal(summary.defaultBranch, 'main');
  assert.equal(summary.archived, true);
  assert.equal(summary.pushedAt, '2024-06-22');
  assert.equal(summary.htmlUrl, 'https://github.com/nodejs/examples');
});

test('sends a User-Agent and adds Authorization only when a token is given', async () => {
  const without = fakeFetch({ body: SAMPLE });
  await fetchRepoSummary('nodejs/examples', { fetchImpl: without });
  assert.equal(without.calls[0].init.headers['User-Agent'], 'repo-card');
  assert.equal('Authorization' in without.calls[0].init.headers, false);

  const withToken = fakeFetch({ body: SAMPLE });
  await fetchRepoSummary('nodejs/examples', { fetchImpl: withToken, token: 't0ken' });
  assert.equal(withToken.calls[0].init.headers.Authorization, 'Bearer t0ken');
});

test('honours a custom api base', async () => {
  const impl = fakeFetch({ body: SAMPLE });
  await fetchRepoSummary('owner/repo', { fetchImpl: impl, apiBase: 'https://ghe.example/api/v3' });
  assert.equal(impl.calls[0].url, 'https://ghe.example/api/v3/repos/owner/repo');
});

test('reports 404 and 403 with actionable messages', async () => {
  await assert.rejects(
    () => fetchRepoSummary('owner/missing', { fetchImpl: fakeFetch({ status: 404 }) }),
    /not found/
  );
  await assert.rejects(
    () => fetchRepoSummary('owner/limited', { fetchImpl: fakeFetch({ status: 403 }) }),
    /rate limited or forbidden/
  );
  await assert.rejects(
    () => fetchRepoSummary('owner/broken', { fetchImpl: fakeFetch({ status: 500 }) }),
    /HTTP 500/
  );
});

test('tolerates a null description and a missing license', async () => {
  const impl = fakeFetch({
    body: { ...SAMPLE, description: null, license: null, language: null }
  });
  const summary = await fetchRepoSummary('nodejs/examples', { fetchImpl: impl });
  assert.equal(summary.description, '');
  assert.equal(summary.license, 'unspecified');
  assert.equal(summary.language, 'unknown');
});

test('formatCard renders aligned key/value lines', async () => {
  const impl = fakeFetch({ body: SAMPLE });
  const card = formatCard(await fetchRepoSummary('nodejs/examples', { fetchImpl: impl }));
  const lines = card.split('\n');

  assert.equal(lines.length, 10);
  assert.ok(lines[0].startsWith('repository'), 'first row is the repository');
  assert.ok(card.includes('https://github.com/nodejs/examples'));
  // every line uses the same separator column
  const columns = new Set(lines.map((line) => line.indexOf(' : ')));
  assert.equal(columns.size, 1, `separator column drifted: ${[...columns]}`);
});
