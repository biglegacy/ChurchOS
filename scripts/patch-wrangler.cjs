const fs = require('fs');
const path = require('path');

const wranglerBin = path.join(__dirname, '../node_modules/wrangler/bin/wrangler.js');

if (fs.existsSync(wranglerBin)) {
  let content = fs.readFileSync(wranglerBin, 'utf8');

  // Strip older patch if present so we can update cleanly
  if (content.includes('// CHURCHOS_PAGES_PATCH_START')) {
    content = content.replace(/\/\/ CHURCHOS_PAGES_PATCH_START[\s\S]*?\/\/ CHURCHOS_PAGES_PATCH_END\n?/, '');
  } else if (content.includes('// CHURCHOS_PAGES_PATCH:')) {
    // legacy patch pattern
    content = content.replace(/\/\/ CHURCHOS_PAGES_PATCH:[\s\S]*?console\.log\('\[ChurchOS\] Redirecting[^\n]+\n\}/, '');
  }

  const patch = `
// CHURCHOS_PAGES_PATCH_START
const rawArgs = process.argv.slice(2);
let effectiveArgs = rawArgs;
if (rawArgs[0] === 'deploy' && rawArgs[1] !== 'pages') {
  effectiveArgs = ['pages', 'deploy', 'dist'];
  
  // Extract project-name or other valid flags
  const otherArgs = rawArgs.slice(1);
  let hasProjectName = false;
  let hasBranch = false;
  let hasCommitDirty = false;

  for (let i = 0; i < otherArgs.length; i++) {
    const arg = otherArgs[i];
    if (arg === '--project-name' || arg.startsWith('--project-name=')) {
      hasProjectName = true;
      effectiveArgs.push(arg);
      if (arg === '--project-name' && otherArgs[i + 1]) {
        effectiveArgs.push(otherArgs[++i]);
      }
    } else if (arg === '--branch' || arg.startsWith('--branch=')) {
      hasBranch = true;
      effectiveArgs.push(arg);
      if (arg === '--branch' && otherArgs[i + 1]) {
        effectiveArgs.push(otherArgs[++i]);
      }
    } else if (arg === '--commit-dirty') {
      hasCommitDirty = true;
      effectiveArgs.push(arg);
    } else if (arg === '--help' || arg === '-h') {
      effectiveArgs.push('--help');
    } else if (arg === '--commit-hash' || arg === '--commit-message') {
      effectiveArgs.push(arg);
      if (otherArgs[i + 1]) effectiveArgs.push(otherArgs[++i]);
    }
  }

  if (!hasProjectName) {
    effectiveArgs.push('--project-name', 'church-os');
  }
  if (!hasBranch && process.env.CF_PAGES_BRANCH) {
    effectiveArgs.push('--branch', process.env.CF_PAGES_BRANCH);
  }
  if (!hasCommitDirty) {
    effectiveArgs.push('--commit-dirty=true');
  }

  console.log('[ChurchOS] Routing "wrangler deploy" to "wrangler pages deploy dist --project-name church-os"...');
}
// CHURCHOS_PAGES_PATCH_END
`;

  content = content.replace(
    'function runWrangler() {',
    `function runWrangler() {${patch}`
  );
  if (!content.includes('...effectiveArgs,')) {
    content = content.replace(
      '...process.argv.slice(2),',
      '...effectiveArgs,'
    );
  }
  fs.writeFileSync(wranglerBin, content, 'utf8');
  console.log('[ChurchOS] Successfully configured wrangler for Cloudflare Pages deployment.');
}
