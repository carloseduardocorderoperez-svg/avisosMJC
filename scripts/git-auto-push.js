#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Ensure .env is loaded when this script runs standalone or from other processes
try {
  const dotenvPath = path.resolve(__dirname, '..', '.env');
  if (fs.existsSync(dotenvPath)) {
    require('dotenv').config({ path: dotenvPath });
  }
} catch (e) {
  // ignore dotenv load failures
}

const slug = process.argv[2] || process.env.SLUG || '';
const repoRoot = path.resolve(__dirname, '..');

function run(cmd, opts = {}) {
  return execSync(cmd, { cwd: repoRoot, stdio: 'pipe', encoding: 'utf8', ...opts });
}

try {
  const distPath = path.join(repoRoot, 'dist-public');
  if (!fs.existsSync(distPath)) {
    console.log('dist-public not found; nothing to commit');
    process.exit(0);
  }

  // Check for changes in dist-public
  let statusOut = '';
  try {
    statusOut = run('git status --porcelain dist-public');
  } catch (e) {
    statusOut = '';
  }

  if (!statusOut || !statusOut.trim()) {
    console.log('No changes in dist-public to commit');
    process.exit(0);
  }

  // Ensure git user config
  try {
    const name = run('git config user.name').trim();
    if (!name) run('git config user.name "auto-publish-bot"');
  } catch (e) {
    try { run('git config user.name "auto-publish-bot"'); } catch (er) {}
  }

  try {
    const email = run('git config user.email').trim();
    if (!email) run('git config user.email "auto-publish-bot@local"');
  } catch (e) {
    try { run('git config user.email "auto-publish-bot@local"'); } catch (er) {}
  }

  // Stage changes
  run('git add -A dist-public');

  // If nothing staged, exit
  try {
    run('git diff --cached --quiet');
    console.log('No staged changes after adding; nothing to commit');
    process.exit(0);
  } catch (e) {
    // exit code !== 0 means there are staged changes
  }

  // Commit
  const safeMsg = slug ? `auto publish aviso: ${slug}` : 'auto publish aviso';
  // Escape double quotes
  const commitMsg = safeMsg.replace(/"/g, '\\"');
  run(`git commit -m "${commitMsg}"`);

  // Determine branch
  let branch = 'main';
  try {
    const br = run('git rev-parse --abbrev-ref HEAD').trim();
    if (br && br !== 'HEAD') branch = br;
  } catch (e) {}

  // Push: support token-based HTTPS push or existing SSH config
  const pushToken = process.env.GITHUB_PUSH_TOKEN || process.env.GITHUB_TOKEN || '';
  if (pushToken) {
    // Determine owner/repo
    let origin = '';
    try { origin = run('git remote get-url origin').trim(); } catch (e) { origin = ''; }

    let ownerRepo = process.env.GITHUB_REPOSITORY || '';
    if (!ownerRepo && origin) {
      const m1 = origin.match(/github.com[:\\/](.+\/.+?)(?:\.git)?$/i);
      if (m1 && m1[1]) ownerRepo = m1[1].replace(/\.git$/, '');
    }

    if (!ownerRepo) {
      console.error('Cannot determine GitHub owner/repo. Set GITHUB_REPOSITORY env or ensure origin points to GitHub. Aborting push.');
      process.exit(2);
    }

    const pushUrl = `https://${pushToken}@github.com/${ownerRepo}.git`;
    try {
      // do not log the pushUrl (contains token)
      run(`git push "${pushUrl}" HEAD:refs/heads/${branch}`);
      console.log('Pushed to remote branch', branch);
    } catch (e) {
      console.error('Push failed:', (e && e.message) || e);
      process.exit(3);
    }
  } else {
    // Use configured origin (SSH or existing credentials)
    try {
      run(`git push origin HEAD:refs/heads/${branch}`);
      console.log('Pushed to origin via existing credentials');
    } catch (e) {
      console.error('Push failed (no token and origin push failed):', (e && e.message) || e);
      process.exit(4);
    }
  }

  console.log('Auto-push completed');
  process.exit(0);
} catch (err) {
  console.error('Error running auto-push:', err && err.message ? err.message : err);
  process.exit(5);
}
