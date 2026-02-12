import { loadSession, getCurrentPosition } from '../session.js';

export function positionCommand(sessionFile: string): void {
  const session = loadSession(sessionFile);
  const pos = getCurrentPosition(session);

  console.log(JSON.stringify(pos.response, null, 2));
}
