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
  params?: Record<string, string>;
  input?: unknown;
  timestamp: string;
}

export interface Session {
  id: string;
  startedAt: string;
  baseUrl: string;
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
}

export interface HalResponse {
  _links: Record<string, HalLink | HalLink[] | CurieDefinition[]>;
  _embedded?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface PathSpec {
  name: string;
  description: string;
  baseUrl: string;
  steps: PathStep[];
}

export interface PathStep {
  id: string;
  action: 'start' | 'follow';
  url?: string;
  from?: string;
  relation?: string;
  method?: string;
  input?: {
    schema?: unknown;
    data?: unknown;
  };
}
