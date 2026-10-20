// Simulates a few Claude Code sessions with subagent teams so you can try the office without real agents.
// Usage: npm run demo   (server must be running)
const port = Number(process.env.VAO_PORT) || 4747;
const url = `http://127.0.0.1:${port}/event`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function send(evt) {
  try {
    await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(evt) });
  } catch {
    console.error(`Kan ${url} niet bereiken. Start eerst de server met: npm start`);
    process.exit(1);
  }
}

const web = { session_id: 'demo-webshop', cwd: '/Users/demo/code/webshop' };
const webWt = { session_id: 'demo-webshop-wt', cwd: '/Users/demo/code/webshop/.claude/worktrees/checkout-fix' };
const api = { session_id: 'demo-api', cwd: '/Users/demo/code/payments-api' };
const docs = { session_id: 'demo-docs', cwd: '/Users/demo/code/handbook' };

const ev = (s, hook_event_name, extra = {}) => send({ ...s, hook_event_name, ...extra });
const tool = (s, tool_name, tool_input, extra = {}) => ev(s, 'PreToolUse', { tool_name, tool_input, ...extra });
const sub = (id, type) => ({ agent_id: id, agent_type: type });

async function spawn(s, id, type, description) {
  await tool(s, 'Agent', { subagent_type: type, description });
  await ev(s, 'SubagentStart', sub(id, type));
}

for (const s of [web, webWt, api, docs]) { await ev(s, 'SessionStart', { source: 'startup' }); await sleep(300); }

await ev(web, 'UserPromptSubmit', { prompt: 'Bouw de nieuwe winkelwagen met kortingscodes' });
await ev(webWt, 'UserPromptSubmit', { prompt: 'Fix de afrekenbug bij iDEAL' });
await ev(api, 'UserPromptSubmit', { prompt: 'Fix de failing refund tests' });
await ev(docs, 'UserPromptSubmit', { prompt: 'Schrijf onboarding docs voor nieuwe developers' });
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
await sleep(3000);

await ev(web, 'SubagentStop', sub('w4', 'Plan'));
await tool(web, 'AskUserQuestion', { questions: [] }, sub('w3', 'general-purpose'));
await ev(api, 'PostToolUse', { tool_name: 'Bash' });
await tool(api, 'Edit', { file_path: '/src/refunds/service.ts' });
await sleep(4000);

console.log('Demo klaar. Het handbook-team vertrekt over 5 seconden.');
await sleep(5000);
await ev(docs, 'SessionEnd', { reason: 'prompt_input_exit' });
