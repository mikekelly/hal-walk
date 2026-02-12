import { v4 as uuid } from 'uuid';
import { fetchHal } from '../hal-client.js';
import { saveSession } from '../session.js';
import { extractCuries } from '../curie.js';
import { Session, HalResponse } from '../types.js';

export async function startCommand(sessionFile: string, url: string): Promise<void> {
  const result = await fetchHal(url);

  if (result.statusCode >= 400) {
    console.error(JSON.stringify({ error: `HTTP ${result.statusCode}`, url }));
    process.exit(1);
  }

  const response = result.response as HalResponse;
  const curies = extractCuries(response);

  const session: Session = {
    id: uuid(),
    startedAt: new Date().toISOString(),
    baseUrl: url.replace(/\/$/, ''),
    curies,
    currentPosition: 'p1',
    positions: {
      p1: {
        id: 'p1',
        url,
        method: 'GET',
        statusCode: result.statusCode,
        response,
        timestamp: new Date().toISOString(),
      },
    },
    transitions: [],
  };

  saveSession(sessionFile, session);

  console.log(JSON.stringify(response, null, 2));
}
