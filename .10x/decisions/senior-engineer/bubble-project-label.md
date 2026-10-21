# Senior — bubble-project-label
- T1: `bubbleHeader(c)` → `null` als `!c || !c.project || c.project==='?'`, anders `{ text: c.project, color: c.color }`.
- T2: meet beide regels met eigen font, w = max; h = header ? 18 : 11; kop op y+2 (top), tekst op y+h-5.5 midden. Font terugzetten per regel.
- T3: `const header = bubbleHeader(ch.case || caseOf…)`; in drawAgentBubble is `c` niet bekend → geef header als parameter vanaf beide aanroepen.
