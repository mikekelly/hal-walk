import { writeFileSync } from 'fs';
import { loadSession } from '../session.js';

export function renderCommand(sessionFile: string, options: { output?: string }): void {
  const session = loadSession(sessionFile);

  const lines: string[] = ['graph LR'];

  // Add nodes
  for (const [id, pos] of Object.entries(session.positions)) {
    const urlPath = new URL(pos.url).pathname || '/';
    const label = `${urlPath}\\n(${id})`;
    // Highlight current position
    if (id === session.currentPosition) {
      lines.push(`  ${id}["${label}"]:::current`);
    } else {
      lines.push(`  ${id}["${label}"]`);
    }
  }

  // Add edges
  for (const t of session.transitions) {
    const label = `${t.relation}\\n${t.method}`;
    lines.push(`  ${t.from} -->|"${label}"| ${t.to}`);
  }

  // Style for current position
  lines.push('');
  lines.push('  classDef current fill:#f9f,stroke:#333,stroke-width:3px');

  const mermaid = lines.join('\n');

  if (options.output) {
    writeFileSync(options.output, mermaid);
    console.error(`Mermaid diagram written to ${options.output}`);
  } else {
    console.log(mermaid);
  }
}
