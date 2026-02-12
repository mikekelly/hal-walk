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
import { validateAgainstSchema, inferSchema } from '../schema.js';
import { HalResponse } from '../types.js';

export interface FollowOptions {
  body?: string;
  bodySchema?: string;
  uriTemplateValues?: string;
  headers?: string;
  headerSchema?: string;
  method?: string;
  note?: string;
}

export async function followCommand(
  sessionFile: string,
  relation: string,
  options: FollowOptions
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

  // Warn on deprecated links
  if (link.deprecated) {
    const msg = link.deprecation
      ? `Warning: "${relation}" is deprecated — ${link.deprecation}`
      : `Warning: "${relation}" is deprecated`;
    console.error(JSON.stringify({ warning: msg }));
  }

  let href = link.href;

  // Expand templated links
  let uriTemplateValues: Record<string, string> | undefined;
  if (link.templated && options.uriTemplateValues) {
    uriTemplateValues = JSON.parse(options.uriTemplateValues) as Record<string, string>;
    href = expandTemplate(href, uriTemplateValues);
  }

  const fullUrl = resolveUrl(session.entryPoint, href);

  // Determine method
  let method = options.method?.toUpperCase() || 'GET';
  let body: unknown = undefined;
  let bodySchema: Record<string, unknown> | undefined;

  if (options.body) {
    body = JSON.parse(options.body);
    if (!options.method) {
      method = 'POST';
    }

    // Schema: explicit or auto-inferred
    if (options.bodySchema) {
      bodySchema = JSON.parse(options.bodySchema) as Record<string, unknown>;
    } else {
      bodySchema = inferSchema(body);
    }

    // Validate body against schema
    try {
      validateAgainstSchema(body, bodySchema, 'body');
    } catch (e) {
      console.error(JSON.stringify({ error: (e as Error).message }));
      process.exit(1);
    }
  }

  // Headers
  let headers: Record<string, string> | undefined;
  let headerSchema: Record<string, unknown> | undefined;

  if (options.headers) {
    headers = JSON.parse(options.headers) as Record<string, string>;

    if (options.headerSchema) {
      headerSchema = JSON.parse(options.headerSchema) as Record<string, unknown>;
    } else {
      headerSchema = inferSchema(headers);
    }

    try {
      validateAgainstSchema(headers, headerSchema, 'headers');
    } catch (e) {
      console.error(JSON.stringify({ error: (e as Error).message }));
      process.exit(1);
    }
  }

  const result = await fetchHal(fullUrl, { method, body, headers });

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
    ...(options.note ? { note: options.note } : {}),
    ...(uriTemplateValues ? { uriTemplateValues } : {}),
    ...(body !== undefined ? { body } : {}),
    ...(bodySchema ? { bodySchema } : {}),
    ...(headers ? { headers } : {}),
    ...(headerSchema ? { headerSchema } : {}),
    timestamp: new Date().toISOString(),
  });

  saveSession(sessionFile, session);

  console.log(JSON.stringify(result.response, null, 2));
}
