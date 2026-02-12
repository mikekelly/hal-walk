import {
  loadSession,
  saveSession,
  getCurrentPosition,
  addPosition,
  addTransition,
  nextPositionId,
  nextTransitionId,
} from '../session.js';
import { findLink, listRelations } from '../curie.js';
import { fetchHal, resolveUrl, expandTemplate } from '../hal-client.js';
import { HalResponse } from '../types.js';

export async function followCommand(
  sessionFile: string,
  relation: string,
  options: { data?: string; templateVars?: string; method?: string }
): Promise<void> {
  const session = loadSession(sessionFile);
  const currentPos = getCurrentPosition(session);
  const response = currentPos.response as HalResponse;

  const link = findLink(response, relation, session.curies);
  if (!link) {
    const available = listRelations(response);
    console.error(
      JSON.stringify({
        error: `Relation "${relation}" not found at current position`,
        availableRelations: available.map((r) => r.relation),
      })
    );
    process.exit(1);
  }

  let href = link.href;

  // Expand templated links
  if (link.templated && options.templateVars) {
    const vars = JSON.parse(options.templateVars) as Record<string, string>;
    href = expandTemplate(href, vars);
  }

  const fullUrl = resolveUrl(session.baseUrl, href);

  // Determine method
  let method = options.method?.toUpperCase() || 'GET';
  let body: unknown = undefined;

  if (options.data) {
    body = JSON.parse(options.data);
    if (!options.method) {
      method = 'POST';
    }
  }

  const result = await fetchHal(fullUrl, { method, body });

  const posId = nextPositionId(session);
  const transId = nextTransitionId(session);

  addPosition(session, {
    id: posId,
    url: fullUrl,
    method,
    statusCode: result.statusCode,
    response: result.response as HalResponse,
    timestamp: new Date().toISOString(),
  });

  addTransition(session, {
    id: transId,
    from: currentPos.id,
    to: posId,
    relation,
    method,
    ...(body ? { input: body } : {}),
    timestamp: new Date().toISOString(),
  });

  saveSession(sessionFile, session);

  console.log(JSON.stringify(result.response, null, 2));
}
