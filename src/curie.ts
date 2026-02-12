import { CurieDefinition, HalLink, HalResponse } from './types.js';

/**
 * Extract CURIE definitions from a HAL response's _links.curies array.
 */
export function extractCuries(response: HalResponse): CurieDefinition[] {
  const curies = response._links?.curies;
  if (!Array.isArray(curies)) return [];
  return curies as CurieDefinition[];
}

/**
 * Expand a CURIE like "wiki:pages" to its full URL using the CURIE definitions.
 * If it's not a CURIE (no prefix match), returns null.
 */
export function expandCurie(curie: string, curies: CurieDefinition[]): string | null {
  const colonIndex = curie.indexOf(':');
  if (colonIndex === -1) return null;

  const prefix = curie.substring(0, colonIndex);
  const reference = curie.substring(colonIndex + 1);

  const curieDef = curies.find((c) => c.name === prefix);
  if (!curieDef) return null;

  return curieDef.href.replace('{rel}', reference);
}

/**
 * Find a link in a HAL response by relation name.
 * Supports both full and CURIE-prefixed relations.
 */
export function findLink(
  response: HalResponse,
  relation: string,
  curies: CurieDefinition[]
): HalLink | null {
  // Direct match
  const direct = response._links?.[relation];
  if (direct && !Array.isArray(direct)) {
    return direct as HalLink;
  }

  // Try expanding the CURIE and matching against full URLs
  const expandedUrl = expandCurie(relation, curies);
  if (expandedUrl) {
    for (const [key, link] of Object.entries(response._links || {})) {
      if (key === 'curies' || key === 'self') continue;
      // Check if this key's expansion matches
      const keyExpanded = expandCurie(key, curies);
      if (keyExpanded === expandedUrl && !Array.isArray(link)) {
        return link as HalLink;
      }
    }
  }

  return null;
}

/**
 * List all available link relations (excluding self and curies) from a HAL response.
 */
export function listRelations(response: HalResponse): { relation: string; href: string; title?: string; templated?: boolean; deprecated?: boolean }[] {
  const relations: { relation: string; href: string; title?: string; templated?: boolean; deprecated?: boolean }[] = [];
  for (const [key, value] of Object.entries(response._links || {})) {
    if (key === 'curies' || key === 'self') continue;
    if (Array.isArray(value)) continue;
    const link = value as HalLink;
    relations.push({
      relation: key,
      href: link.href,
      title: link.title,
      templated: link.templated,
      ...(link.deprecated ? { deprecated: true } : {}),
    });
  }
  return relations;
}
