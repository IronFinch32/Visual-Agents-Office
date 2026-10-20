// Simulates a few Claude Code sessions with subagent teams so you can try the office without real agents.
// Usage: npm run demo   (server must be running)
import { runTenxDemo } from './demo-10x.js';

const port = Number(process.env.VAO_PORT) || 4747;
const url = `http://127.0.0.1:${port}/event`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function send(evt) {
  try {
    const { src, ...body } = evt;
    await fetch(src ? `${url}?src=${src}` : url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  } catch {
    console.error(`Kan ${url} niet bereiken. Start eerst de server met: npm start`);
    process.exit(1);
  }
}

const web = { session_id: 'demo-webshop', cwd: '/Users/demo/code/webshop' };
const webWt = { session_id: 'demo-webshop-wt', cwd: '/Users/demo/code/webshop/.claude/worktrees/checkout-fix' };
const api = { session_id: 'demo-api', cwd: '/Users/demo/code/payments-api' };
const docs = { session_id: 'demo-docs', cwd: '/Users/demo/code/handbook' };
// Codex agents: one in its own project, one sharing the payments-api office with Claude.
const cx = { session_id: 'demo-codex-ml', cwd: '/Users/demo/code/ml-pipeline', src: 'codex' };
const cxApi = { session_id: 'demo-codex-api', cwd: '/Users/demo/code/payments-api', src: 'codex' };

const ev = (s, hook_event_name, extra = {}) => send({ ...s, hook_event_name, ...extra });
const tool = (s, tool_name, tool_input, extra = {}) => ev(s, 'PreToolUse', { tool_name, tool_input, ...extra });
const sub = (id, type) => ({ agent_id: id, agent_type: type });

async function spawn(s, id, type, description) {
  await tool(s, 'Agent', { subagent_type: type, description });
  await ev(s, 'SubagentStart', sub(id, type));
}

// The /10x-team run happens in parallel in its own department office.
const tenxRun = runTenxDemo(send, { flavor: process.env.VAO_DEMO_10X === 'classic' ? 'classic' : 'plus' });

for (const s of [web, webWt, api, docs, cx, cxApi]) { await ev(s, 'SessionStart', { source: 'startup' }); await sleep(300); }

await ev(web, 'UserPromptSubmit', { prompt: 'Bouw de nieuwe winkelwagen met kortingscodes' });
await ev(webWt, 'UserPromptSubmit', { prompt: 'Fix de afrekenbug bij iDEAL' });
await ev(api, 'UserPromptSubmit', { prompt: 'Fix de failing refund tests' });
await ev(docs, 'UserPromptSubmit', { prompt: 'Schrijf onboarding docs voor nieuwe developers' });
await ev(cx, 'UserPromptSubmit', { prompt: 'Train het model opnieuw met de nieuwe features' });
await ev(cxApi, 'UserPromptSubmit', { prompt: 'Review de refund-wijzigingen van Claude' });
await sleep(1000);

// The webshop manager sends out a team
await spawn(web, 'w1', 'Explore', 'Zoek bestaande cart-componenten');
await sleep(400);
await spawn(web, 'w2', 'Explore', 'Zoek de prijsberekening');
await sleep(400);
await spawn(web, 'w3', 'general-purpose', 'Bouw CartSummary component');
await sleep(400);
await spawn(web, 'w4', 'Plan', 'Ontwerp kortingscode-API');
await tool(web, 'TaskOutput', {}); // manager waits on the team
await spawn(webWt, 'x1', 'Explore', 'Zoek iDEAL callback');
await spawn(api, 'a1', 'general-purpose', 'Analyseer refund failures');
await tool(docs, 'Read', { file_path: '/Users/demo/code/handbook/README.md' });
await tool(cx, 'Bash', { command: 'python train.py --epochs 3' });
await ev(cx, 'SubagentStart', sub('c1', 'explorer'));
await tool(cxApi, 'apply_patch', { command: '*** Begin Patch\n*** Update File: src/refunds/service.ts\n' });
await sleep(1500);

await tool(web, 'Grep', { pattern: 'CartItem' }, sub('w1', 'Explore'));
await tool(web, 'Grep', { pattern: 'calculatePrice' }, sub('w2', 'Explore'));
await tool(web, 'Write', { file_path: '/src/cart/CartSummary.tsx' }, sub('w3', 'general-purpose'));
await tool(web, 'Read', { file_path: '/docs/api.md' }, sub('w4', 'Plan'));
await tool(webWt, 'Grep', { pattern: 'idealCallback' }, sub('x1', 'Explore'));
await tool(api, 'Bash', { command: 'npm test -- refunds', description: 'Draait refund tests' }, sub('a1', 'general-purpose'));
await tool(docs, 'Write', { file_path: '/Users/demo/code/handbook/onboarding.md' });
await sleep(3000);

await ev(web, 'SubagentStop', sub('w1', 'Explore'));
await ev(api, 'PermissionRequest', { tool_name: 'Bash', tool_input: { description: 'Verwijdert node_modules' } });
await ev(webWt, 'SubagentStop', sub('x1', 'Explore'));
await tool(webWt, 'Edit', { file_path: '/src/payments/ideal.ts' });
await sleep(3000);

await ev(web, 'SubagentStop', sub('w2', 'Explore'));
await spawn(web, 'w5', 'general-purpose', 'Schrijf tests voor de cart');
await tool(web, 'Bash', { command: 'npm test', description: 'Draait cart tests' }, sub('w5', 'general-purpose'));
await ev(docs, 'Stop');
await ev(cxApi, 'PermissionRequest', { tool_name: 'Bash', tool_input: { command: 'git push', description: 'Push naar main' } });
await tool(cx, 'update_plan', {});
await sleep(3000);

await ev(web, 'SubagentStop', sub('w4', 'Plan'));
await tool(web, 'AskUserQuestion', { questions: [] }, sub('w3', 'general-purpose'));
await ev(api, 'PostToolUse', { tool_name: 'Bash' });
await tool(api, 'Edit', { file_path: '/src/refunds/service.ts' });
await sleep(4000);

console.log('Demo klaar. Het handbook-team vertrekt over 5 seconden.');
await sleep(5000);
await ev(docs, 'SessionEnd', { reason: 'prompt_input_exit' });
await tenxRun;
