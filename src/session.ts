import { readFileSync, writeFileSync } from 'fs';
import { Session, Position, Transition } from './types.js';

export function loadSession(filePath: string): Session {
  const data = readFileSync(filePath, 'utf-8');
  return JSON.parse(data) as Session;
}

export function saveSession(filePath: string, session: Session): void {
  writeFileSync(filePath, JSON.stringify(session, null, 2));
}

export function getCurrentPosition(session: Session): Position {
  return session.positions[session.currentPosition];
}

export function addPosition(session: Session, position: Position): void {
  session.positions[position.id] = position;
  session.currentPosition = position.id;
}

export function addTransition(session: Session, transition: Transition): void {
  session.transitions.push(transition);
}

export function nextPositionId(session: Session): string {
  const ids = Object.keys(session.positions);
  const maxNum = ids.reduce((max, id) => {
    const num = parseInt(id.replace('p', ''), 10);
    return isNaN(num) ? max : Math.max(max, num);
  }, 0);
  return `p${maxNum + 1}`;
}

export function nextTransitionId(session: Session): string {
  const maxNum = session.transitions.reduce((max, t) => {
    const num = parseInt(t.id.replace('t', ''), 10);
    return isNaN(num) ? max : Math.max(max, num);
  }, 0);
  return `t${maxNum + 1}`;
}

/**
 * BFS to find shortest path between two positions in the directed graph.
 * Returns an array of position IDs forming the path.
 */
export function findPath(session: Session, fromId: string, toId: string): string[] | null {
  if (fromId === toId) return [fromId];

  // Build adjacency list from transitions
  const adj = new Map<string, { to: string; transition: Transition }[]>();
  for (const t of session.transitions) {
    if (!adj.has(t.from)) adj.set(t.from, []);
    adj.get(t.from)!.push({ to: t.to, transition: t });
  }

  // BFS
  const visited = new Set<string>([fromId]);
  const queue: { id: string; path: string[] }[] = [{ id: fromId, path: [fromId] }];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = adj.get(current.id) || [];
    for (const neighbor of neighbors) {
      if (visited.has(neighbor.to)) continue;
      const newPath = [...current.path, neighbor.to];
      if (neighbor.to === toId) return newPath;
      visited.add(neighbor.to);
      queue.push({ id: neighbor.to, path: newPath });
    }
  }

  return null;
}

/**
 * Get the transition between two adjacent positions.
 */
export function getTransitionBetween(
  session: Session,
  fromId: string,
  toId: string
): Transition | undefined {
  return session.transitions.find((t) => t.from === fromId && t.to === toId);
}
