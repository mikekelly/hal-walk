import { HalResponse } from './types.js';

export interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

export interface HalResult {
  statusCode: number;
  response: HalResponse | string;
  contentType: string;
}

export async function fetchHal(url: string, options: RequestOptions = {}): Promise<HalResult> {
  const { method = 'GET', body, headers = {} } = options;

  const fetchOptions: RequestInit = {
    method,
    headers: {
      Accept: 'application/hal+json, application/json, text/markdown',
      ...headers,
    },
  };

  if (body !== undefined) {
    fetchOptions.body = JSON.stringify(body);
    fetchOptions.headers = {
      ...fetchOptions.headers as Record<string, string>,
      'Content-Type': 'application/json',
    };
  }

  const res = await fetch(url, fetchOptions);
  const contentType = res.headers.get('content-type') || '';

  if (contentType.includes('json')) {
    const json = await res.json() as HalResponse;
    return { statusCode: res.status, response: json, contentType };
  }

  const text = await res.text();
  return { statusCode: res.status, response: text, contentType };
}

/**
 * Resolve a potentially relative URL against a base URL.
 */
export function resolveUrl(base: string, path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  // Remove trailing slash from base
  const cleanBase = base.replace(/\/$/, '');
  // Ensure path starts with /
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
}

/**
 * Expand a URI template with variables (RFC 6570 basic support).
 */
export function expandTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{[?&]?([^}]+)\}/g, (_match, expr) => {
    // Handle query parameter templates like {?q}
    if (_match.startsWith('{?')) {
      const keys = expr.split(',');
      const parts: string[] = [];
      for (const key of keys) {
        const trimmed = key.trim();
        if (vars[trimmed] !== undefined) {
          parts.push(`${trimmed}=${encodeURIComponent(vars[trimmed])}`);
        }
      }
      return parts.length > 0 ? `?${parts.join('&')}` : '';
    }
    // Handle continuation templates like {&key}
    if (_match.startsWith('{&')) {
      const keys = expr.split(',');
      const parts: string[] = [];
      for (const key of keys) {
        const trimmed = key.trim();
        if (vars[trimmed] !== undefined) {
          parts.push(`${trimmed}=${encodeURIComponent(vars[trimmed])}`);
        }
      }
      return parts.length > 0 ? `&${parts.join('&')}` : '';
    }
    // Simple substitution
    const trimmed = expr.trim();
    return vars[trimmed] !== undefined ? encodeURIComponent(vars[trimmed]) : '';
  });
}
