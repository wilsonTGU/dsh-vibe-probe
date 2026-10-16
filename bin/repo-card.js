#!/usr/bin/env node
'use strict';

const { fetchRepoSummary, formatCard } = require('../lib/repo-card');

async function main(argv) {
  const slug = argv[2];
  if (!slug || slug === '-h' || slug === '--help') {
    console.log('Usage: repo-card <owner/repo>');
    console.log('Example: repo-card nodejs/examples');
    console.log('');
    console.log('Environment:');
    console.log('  GITHUB_TOKEN      optional, raises the API rate limit');
    console.log('  GITHUB_API_BASE   optional, override the API base URL');
    process.exit(slug ? 0 : 2);
  }

  try {
    const summary = await fetchRepoSummary(slug, { token: process.env.GITHUB_TOKEN });
    console.log(formatCard(summary));
  } catch (error) {
    console.error(`repo-card: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main(process.argv);
}

module.exports = { main };
