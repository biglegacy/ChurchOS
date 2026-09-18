import fs from 'fs';
import path from 'path';

/**
 * Patches Vite 6 client transport to prevent:
 * [vite] Cannot read properties of undefined (reading 'send')
 * which occurs when WebSocket fails to connect in sandboxed iframe environments.
 */
export function patchViteClient() {
  try {
    const clientPath = path.resolve(process.cwd(), 'node_modules/vite/dist/client/client.mjs');
    if (fs.existsSync(clientPath)) {
      let content = fs.readFileSync(clientPath, 'utf-8');
      let modified = false;

      // 1. Guard ws.send in createWebSocketModuleRunnerTransport
      if (content.includes('send(data) {\n      ws.send(JSON.stringify(data));\n    }')) {
        content = content.replace(
          'send(data) {\n      ws.send(JSON.stringify(data));\n    }',
          'send(data) {\n      if (ws && typeof ws.send === "function" && ws.readyState === ws.OPEN) {\n        ws.send(JSON.stringify(data));\n      }\n    }'
        );
        modified = true;
      } else if (content.includes('ws.send(JSON.stringify(data));')) {
        content = content.replace(
          /ws\.send\(JSON\.stringify\(data\)\);/g,
          'if (ws && typeof ws.send === "function" && ws.readyState === ws.OPEN) { ws.send(JSON.stringify(data)); }'
        );
        modified = true;
      }

      // 2. Guard wsTransport.send(data)
      if (content.includes('wsTransport.send(data);')) {
        content = content.replace(
          /wsTransport\.send\(data\);/g,
          'if (wsTransport && typeof wsTransport.send === "function") { try { wsTransport.send(data); } catch (_) {} }'
        );
        modified = true;
      }

      if (modified) {
        fs.writeFileSync(clientPath, content, 'utf-8');
        console.log('[Church-OS] Successfully applied null-safety patch to Vite client transport.');
      }
    }

    const runnerPath = path.resolve(process.cwd(), 'node_modules/vite/dist/node/module-runner.js');
    if (fs.existsSync(runnerPath)) {
      let content = fs.readFileSync(runnerPath, 'utf-8');
      if (content.includes('ws.send(JSON.stringify(data));')) {
        content = content.replace(
          /ws\.send\(JSON\.stringify\(data\)\);/g,
          'if (ws && typeof ws.send === "function" && ws.readyState === ws.OPEN) { ws.send(JSON.stringify(data)); }'
        );
        fs.writeFileSync(runnerPath, content, 'utf-8');
      }
    }
  } catch (err: any) {
    console.warn('[Church-OS] Note: Vite patch check encountered non-fatal error:', err?.message);
  }
}
