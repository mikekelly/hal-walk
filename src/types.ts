export interface CurieDefinition {
  name: string;
  href: string;
  templated: boolean;
}

export interface Position {
  id: string;
  url: string;
  method: string;
  statusCode: number;
  response: HalResponse;
  timestamp: string;
}

export interface Transition {
  id: string;
  from: string;
  to: string;
  relation: string;
  method: string;
  note?: string;
  uriTemplateValues?: Record<string, string>;
  body?: unknown;
  bodySchema?: Record<string, unknown>;
  headers?: Record<string, string>;
  headerSchema?: Record<string, unknown>;
  timestamp: string;
}

export interface Session {
  id: string;
  startedAt: string;
  entryPoint: string;
  curies: CurieDefinition[];
  currentPosition: string;
  positions: Record<string, Position>;
  transitions: Transition[];
}

export interface HalLink {
  href: string;
  templated?: boolean;
  title?: string;
  name?: string;
  type?: string;
  deprecated?: boolean;
  deprecation?: string;
}

export interface HalResponse {
  _links: Record<string, HalLink | HalLink[] | CurieDefinition[]>;
  _embedded?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface PathSpec {
  name: string;
  description: string;
  entryPoint: string;
  steps: PathStep[];
}

export interface PathStep {
  id: string;
  action: 'start' | 'follow';
  url?: string;
  from?: string;
  relation?: string;
  method?: string;
  note?: string;
  input?: {
    uriTemplateValues?: Record<string, string>;
    body?: unknown;
    bodySchema?: Record<string, unknown>;
    headers?: Record<string, string>;
    headerSchema?: Record<string, unknown>;
  };
}
