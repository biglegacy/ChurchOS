const fs = require('fs');
const path = require('path');

const wranglerBin = path.join(__dirname, '../node_modules/wrangler/bin/wrangler.js');

if (fs.existsSync(wranglerBin)) {
  let content = fs.readFileSync(wranglerBin, 'utf8');
  if (!content.includes('// CHURCHOS_PAGES_PATCH')) {
    const patch = `
// CHURCHOS_PAGES_PATCH: Automatically route "wrangler deploy" to "wrangler pages deploy dist" on Cloudflare Pages projects
const rawArgs = process.argv.slice(2);
let effectiveArgs = rawArgs;
if (rawArgs[0] === 'deploy' && rawArgs[1] !== 'pages') {
  effectiveArgs = ['pages', 'deploy', 'dist', ...rawArgs.slice(1)];
  console.log('[ChurchOS] Redirecting "wrangler deploy" to "wrangler pages deploy dist"...');
}
`;
    content = content.replace(
      'function runWrangler() {',
      `function runWrangler() {${patch}`
    );
    content = content.replace(
      '...process.argv.slice(2),',
      '...effectiveArgs,'
    );
    fs.writeFileSync(wranglerBin, content, 'utf8');
    console.log('[ChurchOS] Successfully patched wrangler for Cloudflare Pages deployment.');
  }
}
