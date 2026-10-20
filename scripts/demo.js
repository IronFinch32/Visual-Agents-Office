// Simulates a few Claude Code sessions so you can try the office without real agents.
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

const sessions = [
  { session_id: 'demo-webshop', cwd: '/Users/demo/code/webshop' },
  { session_id: 'demo-api', cwd: '/Users/demo/code/payments-api' },
  { session_id: 'demo-docs', cwd: '/Users/demo/code/handbook' },
  { session_id: 'demo-data', cwd: '/Users/demo/code/data-pipeline' },
];
const ev = (s, hook_event_name, extra = {}) => send({ ...s, hook_event_name, ...extra });
const tool = (s, tool_name, tool_input, extra = {}) => ev(s, 'PreToolUse', { tool_name, tool_input, ...extra });

const [web, api, docs, data] = sessions;

for (const s of sessions) { await ev(s, 'SessionStart', { source: 'startup' }); await sleep(400); }

await ev(web, 'UserPromptSubmit', { prompt: 'Voeg een winkelwagen-pagina toe met totaalprijs en kortingscode' });
await ev(api, 'UserPromptSubmit', { prompt: 'Fix de failing refund tests' });
await ev(docs, 'UserPromptSubmit', { prompt: 'Schrijf onboarding docs voor nieuwe developers' });
await sleep(1200);

await tool(web, 'Agent', { subagent_type: 'Explore', description: 'Zoek bestaande cart-componenten' });
await ev(web, 'SubagentStart', { agent_id: 'a1', agent_type: 'Explore' });
await tool(web, 'Grep', { pattern: 'CartItem' }, { agent_id: 'a1', agent_type: 'Explore' });
await tool(api, 'Bash', { command: 'npm test -- refunds', description: 'Draait refund tests' });
await tool(docs, 'Read', { file_path: '/Users/demo/code/handbook/README.md' });
await sleep(2500);

await ev(web, 'SubagentStart', { agent_id: 'a2', agent_type: 'general-purpose' });
await tool(web, 'Read', { file_path: '/src/components/Cart.tsx' }, { agent_id: 'a2', agent_type: 'general-purpose' });
await tool(web, 'Read', { file_path: '/src/components/CartItem.tsx' }, { agent_id: 'a1', agent_type: 'Explore' });
await ev(api, 'PermissionRequest', { tool_name: 'Bash', tool_input: { command: 'rm -rf node_modules', description: 'Verwijdert node_modules' } });
await tool(docs, 'Write', { file_path: '/Users/demo/code/handbook/onboarding.md' });
await sleep(3000);

await ev(web, 'SubagentStop', { agent_id: 'a1', agent_type: 'Explore' });
await ev(data, 'UserPromptSubmit', { prompt: 'Analyseer waarom de nightly job traag is' });
await tool(data, 'mcp__bigquery__run_query', { sql: 'select 1' });
await ev(docs, 'Stop');
await sleep(3000);

await tool(web, 'AskUserQuestion', { questions: [] });
await ev(web, 'SubagentStop', { agent_id: 'a2', agent_type: 'general-purpose' });
await ev(api, 'PostToolUse', { tool_name: 'Bash' });
await tool(api, 'Edit', { file_path: '/src/refunds/service.ts' });
await sleep(4000);

console.log('Demo klaar. Agents blijven staan; demo-docs verlaat over 5 seconden het kantoor.');
await sleep(5000);
await ev(docs, 'SessionEnd', { reason: 'prompt_input_exit' });
