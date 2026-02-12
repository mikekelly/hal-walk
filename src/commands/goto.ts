import { loadSession, saveSession } from '../session.js';

export function gotoCommand(sessionFile: string, positionId: string): void {
  const session = loadSession(sessionFile);

  const pos = session.positions[positionId];
  if (!pos) {
    console.error(
      JSON.stringify({
        error: `Position "${positionId}" not found`,
        availablePositions: Object.keys(session.positions),
      })
    );
    process.exit(1);
  }

  session.currentPosition = positionId;
  saveSession(sessionFile, session);

  console.log(JSON.stringify(pos.response, null, 2));
}
