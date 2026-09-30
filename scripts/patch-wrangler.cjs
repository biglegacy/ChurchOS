const fs = require('fs');
const path = require('path');

const wranglerBin = path.join(__dirname, '../node_modules/wrangler/bin/wrangler.js');

if (fs.existsSync(wranglerBin)) {
  let content = fs.readFileSync(wranglerBin, 'utf8');

  // Strip older patch if present so we can update cleanly
  if (content.includes('// CHURCHOS_PAGES_PATCH_START')) {
    content = content.replace(/\/\/ CHURCHOS_PAGES_PATCH_START[\s\S]*?\/\/ CHURCHOS_PAGES_PATCH_END\n?/, '');
  } else if (content.includes('// CHURCHOS_PAGES_PATCH:')) {
    content = content.replace(/\/\/ CHURCHOS_PAGES_PATCH:[\s\S]*?console\.log\('\[ChurchOS\] Redirecting[^\n]+\n\}/, '');
  }

  const patch = `
// CHURCHOS_PAGES_PATCH_START
const rawArgs = process.argv.slice(2);
let effectiveArgs = rawArgs;

const isDeployCmd = rawArgs[0] === 'deploy' || (rawArgs[0] === 'pages' && rawArgs[1] === 'deploy');
const isHelp = rawArgs.includes('--help') || rawArgs.includes('-h');

// Cloudflare Account & Project constants
const TARGET_ACCOUNT_ID = '0d4be3e173f3bb506d877491853edc86';
const TARGET_PROJECT_NAME = 'church-os';

if (isDeployCmd) {
  // 1. Sanitize & Normalize Environment Variables
  if (process.env.CF_API_TOKEN && !process.env.CLOUDFLARE_API_TOKEN) {
    process.env.CLOUDFLARE_API_TOKEN = process.env.CF_API_TOKEN;
  }
  if (process.env.CF_ACCOUNT_ID && !process.env.CLOUDFLARE_ACCOUNT_ID) {
    process.env.CLOUDFLARE_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
  }

  // Ensure targeted account ID is consistently set
  if (!process.env.CLOUDFLARE_ACCOUNT_ID) {
    process.env.CLOUDFLARE_ACCOUNT_ID = TARGET_ACCOUNT_ID;
  } else {
    let accId = process.env.CLOUDFLARE_ACCOUNT_ID.trim();
    if ((accId.startsWith('"') && accId.endsWith('"')) || (accId.startsWith("'") && accId.endsWith("'"))) {
      accId = accId.slice(1, -1).trim();
    }
    process.env.CLOUDFLARE_ACCOUNT_ID = accId;
  }

  // Sanitize CLOUDFLARE_API_TOKEN if present
  if (process.env.CLOUDFLARE_API_TOKEN) {
    let token = process.env.CLOUDFLARE_API_TOKEN.trim();
    if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"))) {
      token = token.slice(1, -1).trim();
    }
    if (token.startsWith('Bearer ')) {
      token = token.slice(7).trim();
    }
    process.env.CLOUDFLARE_API_TOKEN = token;

    // Prevent conflicting Global API Key from overriding the Bearer token
    delete process.env.CLOUDFLARE_API_KEY;
    delete process.env.CF_API_KEY;
  }

  // 2. Validate token presence unless checking help
  if (!isHelp) {
    if (!process.env.CLOUDFLARE_API_TOKEN) {
      console.error('\\n================================================================================');
      console.error('[ChurchOS Cloudflare Deployment Diagnostic]');
      console.error('Target Cloudflare Pages Project: ' + TARGET_PROJECT_NAME);
      console.error('Target Cloudflare Account ID:    ' + TARGET_ACCOUNT_ID);
      console.error('CLOUDFLARE_API_TOKEN Status:     MISSING ❌');
      console.error('\\nError: Missing required environment variable "CLOUDFLARE_API_TOKEN".');
      console.error('Deployment cannot proceed without a valid Cloudflare API token.');
      console.error('\\nPlease configure "CLOUDFLARE_API_TOKEN" in your Cloudflare Pages / CI/CD secrets.');
      console.error('The token must have the following permissions:');
      console.error('  1. Account > Cloudflare Pages > Edit (Required for Pages deployments)');
      console.error('  2. Account > Account Settings > Read');
      console.error('  3. User > Memberships > Read');
      console.error('  4. User > User Details > Read');
      console.error('Account Scope: Specific account -> ' + TARGET_ACCOUNT_ID);
      console.error('================================================================================\\n');
      process.exit(1);
    } else {
      console.log('[ChurchOS Cloudflare Deployment]');
      console.log('Target Cloudflare Pages Project: ' + TARGET_PROJECT_NAME);
      console.log('Target Cloudflare Account ID:    ' + TARGET_ACCOUNT_ID);
      console.log('CLOUDFLARE_API_TOKEN Status:     Present (configured) ✅');
    }
  }

  // 3. Route "wrangler deploy" to "wrangler pages deploy dist --project-name church-os"
  if (rawArgs[0] === 'deploy' && rawArgs[1] !== 'pages') {
    effectiveArgs = ['pages', 'deploy', 'dist'];

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
      effectiveArgs.push('--project-name', TARGET_PROJECT_NAME);
    }
    if (!hasBranch && process.env.CF_PAGES_BRANCH) {
      effectiveArgs.push('--branch', process.env.CF_PAGES_BRANCH);
    }
    if (!hasCommitDirty) {
      effectiveArgs.push('--commit-dirty=true');
    }

    console.log('[ChurchOS] Routing "wrangler deploy" to: wrangler ' + effectiveArgs.join(' '));
  }
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

  // Hook process exit to provide clear guidance if Cloudflare API returns authentication error
  if (!content.includes('// CHURCHOS_EXIT_HANDLER')) {
    content = content.replace(
      'wranglerProcess = runWrangler();',
      `wranglerProcess = runWrangler();
	// CHURCHOS_EXIT_HANDLER
	if (wranglerProcess && typeof wranglerProcess.on === 'function') {
		wranglerProcess.on('exit', (code) => {
			if (code !== 0 && (process.argv.includes('deploy') || process.argv.includes('pages'))) {
				console.error('\\n--------------------------------------------------------------------------------');
				console.error('[ChurchOS Deployment Diagnostic - Authentication Error 10000 Resolution]');
				console.error('If the error was: "Authentication error [code: 10000]" on /pages/projects/church-os:');
				console.error('This occurs when the API token in CLOUDFLARE_API_TOKEN lacks "Cloudflare Pages" scope.');
				console.error('\\nTo fix this in Cloudflare Dashboard:');
				console.error('1. Navigate to: https://dash.cloudflare.com/profile/api-tokens');
				console.error('2. Create or Edit the API Token:');
				console.error('   • Permissions:');
				console.error('     - Account > Cloudflare Pages > Edit (REQUIRED for Pages deployments)');
				console.error('     - Account > Account Settings > Read');
				console.error('     - User > Memberships > Read');
				console.error('     - User > User Details > Read');
				console.error('   • Account Resources:');
				console.error('     - Include > Specific account > 0d4be3e173f3bb506d877491853edc86');
				console.error('3. Update CLOUDFLARE_API_TOKEN with the new token in your Cloudflare Pages / CI secrets.');
				console.error('--------------------------------------------------------------------------------\\n');
			}
		});
	}`
    );
  }

  fs.writeFileSync(wranglerBin, content, 'utf8');
  console.log('[ChurchOS] Successfully configured wrangler for Cloudflare Pages deployment.');
}
