import { loadSession } from '../session.js';
import { expandCurie } from '../curie.js';
import { fetchHal } from '../hal-client.js';

export async function describeCommand(sessionFile: string, relation: string): Promise<void> {
  const session = loadSession(sessionFile);

  // Expand CURIE to get the documentation URL
  let docUrl = expandCurie(relation, session.curies);

  if (!docUrl) {
    // If not a CURIE, try using it as a direct URL
    docUrl = relation;
  }

  // Ensure it's an absolute URL
  if (!docUrl.startsWith('http://') && !docUrl.startsWith('https://')) {
    docUrl = `${session.baseUrl}${docUrl.startsWith('/') ? '' : '/'}${docUrl}`;
  }

  const result = await fetchHal(docUrl);

  if (result.statusCode >= 400) {
    console.error(`Error: HTTP ${result.statusCode} fetching ${docUrl}`);
    process.exit(1);
  }

  // Output raw markdown, not JSON-wrapped
  if (typeof result.response === 'string') {
    console.log(result.response);
  } else {
    console.log(JSON.stringify(result.response, null, 2));
  }
}
