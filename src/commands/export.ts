import { writeFileSync } from 'fs';
import { loadSession, findPath, getTransitionBetween } from '../session.js';
import { PathSpec, PathStep } from '../types.js';

export function exportCommand(
  sessionFile: string,
  options: { output?: string; from?: string; to?: string }
): void {
  const session = loadSession(sessionFile);

  // Determine start and end positions
  const posIds = Object.keys(session.positions);
  const fromId = options.from || posIds[0];
  const toId = options.to || session.currentPosition;

  if (!session.positions[fromId]) {
    console.error(JSON.stringify({ error: `Position "${fromId}" not found` }));
    process.exit(1);
  }
  if (!session.positions[toId]) {
    console.error(JSON.stringify({ error: `Position "${toId}" not found` }));
    process.exit(1);
  }

  const path = findPath(session, fromId, toId);
  if (!path) {
    console.error(
      JSON.stringify({ error: `No path found from ${fromId} to ${toId}` })
    );
    process.exit(1);
  }

  // Build steps from the path
  const steps: PathStep[] = [];

  for (let i = 0; i < path.length; i++) {
    const posId = path[i];
    const pos = session.positions[posId];

    if (i === 0) {
      // Start step
      const urlPath = new URL(pos.url).pathname || '/';
      steps.push({
        id: `step${i + 1}`,
        action: 'start',
        url: urlPath,
      });
    } else {
      const prevPosId = path[i - 1];
      const transition = getTransitionBetween(session, prevPosId, posId);

      if (transition) {
        const step: PathStep = {
          id: `step${i + 1}`,
          action: 'follow',
          from: `step${i}`,
          relation: transition.relation,
          method: transition.method,
        };

        if (transition.note) {
          step.note = transition.note;
        }

        const input: PathStep['input'] = {};
        if (transition.uriTemplateValues) input.uriTemplateValues = transition.uriTemplateValues;
        if (transition.body !== undefined) input.body = transition.body;
        if (transition.bodySchema) input.bodySchema = transition.bodySchema;
        if (transition.headers) input.headers = transition.headers;
        if (transition.headerSchema) input.headerSchema = transition.headerSchema;
        if (Object.keys(input).length > 0) step.input = input;

        steps.push(step);
      }
    }
  }

  const pathSpec: PathSpec = {
    name: 'exported-path',
    description: `Path from ${fromId} to ${toId}`,
    entryPoint: session.entryPoint,
    steps,
  };

  const output = JSON.stringify(pathSpec, null, 2);

  if (options.output) {
    writeFileSync(options.output, output);
    console.error(`Path spec written to ${options.output}`);
  } else {
    console.log(output);
  }
}
