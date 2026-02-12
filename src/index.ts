#!/usr/bin/env node

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Command } from 'commander';
import { startCommand } from './commands/start.js';
import { followCommand } from './commands/follow.js';
import { describeCommand } from './commands/describe.js';
import { positionCommand } from './commands/position.js';
import { gotoCommand } from './commands/goto.js';
import { renderCommand } from './commands/render.js';
import { exportCommand } from './commands/export.js';
import { sessionViewerCommand } from './commands/session-viewer.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));

const program = new Command();

program
  .name('hal-walk')
  .description('CLI tool for exploring HAL APIs via HATEOAS link-following')
  .version(pkg.version);

program
  .command('start')
  .description('Begin a session by fetching the root resource')
  .requiredOption('-s, --session <file>', 'Session file path')
  .argument('<url>', 'URL of the root resource')
  .action(async (url: string, opts: { session: string }) => {
    await startCommand(opts.session, url);
  });

program
  .command('follow')
  .description('Follow a link relation from the current position')
  .requiredOption('-s, --session <file>', 'Session file path')
  .argument('<relation>', 'Link relation to follow')
  .option('--body <json>', 'JSON request body')
  .option('--body-schema <json>', 'JSON Schema for the request body')
  .option('--uri-template-values <json>', 'JSON template variables for URI expansion')
  .option('--headers <json>', 'JSON object of custom request headers')
  .option('--header-schema <json>', 'JSON Schema for the request headers')
  .option('-m, --method <method>', 'HTTP method override')
  .option('-n, --note <text>', 'Brief description of why this step is being taken')
  .action(async (relation: string, opts: { session: string; body?: string; bodySchema?: string; uriTemplateValues?: string; headers?: string; headerSchema?: string; method?: string; note?: string }) => {
    await followCommand(opts.session, relation, opts);
  });

program
  .command('describe')
  .description('Fetch and display relation documentation')
  .requiredOption('-s, --session <file>', 'Session file path')
  .argument('<relation>', 'Link relation to describe')
  .action(async (relation: string, opts: { session: string }) => {
    await describeCommand(opts.session, relation);
  });

program
  .command('position')
  .description('Show the current position and available links')
  .requiredOption('-s, --session <file>', 'Session file path')
  .action((opts: { session: string }) => {
    positionCommand(opts.session);
  });

program
  .command('goto')
  .description('Jump to a previous position (local state change)')
  .requiredOption('-s, --session <file>', 'Session file path')
  .argument('<position-id>', 'Position ID to jump to')
  .action((positionId: string, opts: { session: string }) => {
    gotoCommand(opts.session, positionId);
  });

program
  .command('render')
  .description('Generate a Mermaid diagram from the session graph')
  .requiredOption('-s, --session <file>', 'Session file path')
  .option('-o, --output <file>', 'Output file (defaults to stdout)')
  .action((opts: { session: string; output?: string }) => {
    renderCommand(opts.session, opts);
  });

program
  .command('export')
  .description('Export a path spec from the session graph')
  .requiredOption('-s, --session <file>', 'Session file path')
  .option('-o, --output <file>', 'Output file (defaults to stdout)')
  .option('--from <pos-id>', 'Start position (defaults to first)')
  .option('--to <pos-id>', 'End position (defaults to current)')
  .action((opts: { session: string; output?: string; from?: string; to?: string }) => {
    exportCommand(opts.session, opts);
  });

program
  .command('session-viewer')
  .description('Serve a web UI for inspecting the session graph')
  .requiredOption('-s, --session <file>', 'Session file path')
  .action((opts: { session: string }) => {
    sessionViewerCommand(opts.session);
  });

program.parse();
