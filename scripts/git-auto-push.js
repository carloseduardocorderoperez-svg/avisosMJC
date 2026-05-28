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
const os = require('os');

function run(cmd, opts = {}) {
  return execSync(cmd, { cwd: repoRoot, stdio: 'pipe', encoding: 'utf8', ...opts });
}

try {
  const distPath = path.join(repoRoot, 'dist-public');
  if (!fs.existsSync(distPath)) {
    console.log('dist-public not found; nothing to commit');
    process.exit(0);
  }

  // If DEPLOY_BRANCH is set, publish only the dist-public contents to that branch
  // using a temporary repo and a force push. This isolates public builds from
  // the main repo history and avoids merge/rebase complexity for non-technical users.
  const deployBranch = process.env.DEPLOY_BRANCH || 'public-builds';
  if (deployBranch) {
    console.log('DEPLOY_BRANCH is set to', deployBranch);
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'auto-publish-'));
    try {
      run('git init', { cwd: tmpDir });
      try { run('git config user.name "auto-publish-bot"', { cwd: tmpDir }); } catch (e) {}
      try { run('git config user.email "auto-publish-bot@local"', { cwd: tmpDir }); } catch (e) {}

      // copy dist-public into tmpDir/dist-public so workflows watching 'dist-public/**' trigger
      const targetDist = path.join(tmpDir, 'dist-public');
      // create target dist directory synchronously
      try { fs.mkdirSync(targetDist, { recursive: true }); } catch (e) {}
      fs.cpSync(distPath, targetDist, { recursive: true });

      // include firebase config so the GitHub Action can deploy from this branch
      const firebaseJson = path.join(repoRoot, 'firebase.json');
      if (fs.existsSync(firebaseJson)) {
        fs.copyFileSync(firebaseJson, path.join(tmpDir, 'firebase.json'));
      }
      const firebaserc = path.join(repoRoot, '.firebaserc');
      if (fs.existsSync(firebaserc)) {
        fs.copyFileSync(firebaserc, path.join(tmpDir, '.firebaserc'));
      }

      // stage and commit
      run('git add -A', { cwd: tmpDir });
      const safeMsg = slug ? `auto publish aviso: ${slug}` : 'auto publish aviso';
      const commitMsg = safeMsg.replace(/"/g, '\\"');
      try { run(`git commit -m "${commitMsg}"`, { cwd: tmpDir }); } catch (e) {
        // if there are no changes, exit gracefully
        try {
          run('git status --porcelain', { cwd: tmpDir });
        } catch (se) {}
      }

      // determine push target
      const pushToken = process.env.GITHUB_PUSH_TOKEN || process.env.GITHUB_TOKEN || '';
      let pushUrl = '';
      if (pushToken) {
        let ownerRepo = process.env.GITHUB_REPOSITORY || '';
        try { origin = run('git remote get-url origin').trim(); } catch (e) { origin = ''; }
        if (!ownerRepo && origin) {
          const m1 = origin.match(/github.com[:\\/](.+\/.+?)(?:\.git)?$/i);
          if (m1 && m1[1]) ownerRepo = m1[1].replace(/\.git$/, '');
        }
        if (!ownerRepo) {
          console.error('Cannot determine owner/repo for DEPLOY_BRANCH push. Aborting.');
          process.exit(2);
        }
        pushUrl = `https://github.com/${ownerRepo}.git`;
        console.log('Deploy: will push to', pushUrl, '(token will be used for auth)');
        run(`git remote add origin "https://${pushToken}@github.com/${ownerRepo}.git"`, { cwd: tmpDir });
      } else {
        // reuse existing origin URL
        try {
          const originUrl = run('git remote get-url origin').trim();
          console.log('Deploy: will push to existing origin', originUrl);
          run(`git remote add origin "${originUrl}"`, { cwd: tmpDir });
        } catch (e) {
          console.error('Cannot determine origin URL for DEPLOY_BRANCH push. Aborting.');
          process.exit(2);
        }
      }

      // force push to the deploy branch
      try {
        run(`git push --force origin HEAD:refs/heads/${deployBranch}`, { cwd: tmpDir });
        console.log('Published dist-public to branch', deployBranch);
        process.exit(0);
      } catch (e) {
        console.error('Deploy-branch push failed:', (e && e.message) || e);
        process.exit(3);
      }
    } finally {
      // attempted cleanup of tmpDir; leave it if cleanup fails
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) {}
    }
  }

  // Try to add dist-public contents and check if anything was staged.
  // Older environments may return empty for `git status --porcelain` on ignored paths,
  // so we rely on staging + checking the index instead.

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

  // Helper: try push, and on non-fast-forward attempt fetch+rebase then retry
  function tryPushWithIntegrate(pushCmd) {
    try {
      run(pushCmd);
      console.log('Pushed to remote branch', branch);
      return;
    } catch (err) {
      const msg = (err && err.message) || String(err);
      console.error('Push failed:', msg.trim());

      // Attempt to integrate remote changes safely and retry once
      try {
        console.log('Attempting to fetch and rebase onto origin/' + branch);
        try { run('git fetch origin'); } catch (ferr) { run('git fetch'); }
        run(`git rebase origin/${branch}`);
        console.log('Rebase successful, retrying push');
        run(pushCmd);
        console.log('Pushed to remote branch after rebase', branch);
        return;
      } catch (err2) {
        console.error('Retry after fetch/rebase failed:', (err2 && err2.message) || String(err2));
        try {
          run('git rebase --abort');
        } catch (ab) {}
        throw err2;
      }
    }
  }

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
        tryPushWithIntegrate(`git push "${pushUrl}" HEAD:refs/heads/${branch}`);
      } catch (e) {
        console.error('Push failed:', (e && e.message) || e);
        process.exit(3);
      }
  } else {
    // Use configured origin (SSH or existing credentials)
    try {
      tryPushWithIntegrate(`git push origin HEAD:refs/heads/${branch}`);
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
