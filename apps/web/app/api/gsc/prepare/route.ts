import { auth } from '../../../../auth';
import { acceptsBrowserMutation, internalApiFetch } from '../../../../lib/internal-api';

export async function POST(request: Request) {
  if (!acceptsBrowserMutation(request)) return Response.json({ message: 'Invalid request origin or content type.' }, { status: 403 });
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ message: 'Sign in before connecting Search Console.' }, { status: 401 });
  const response = await internalApiFetch('/api/v1/integrations/google-search-console/prepare', { method: 'POST', userId, body: JSON.stringify(await request.json()) });
  const payload = await response.json().catch(() => ({ message: `The API returned an unexpected response (HTTP ${response.status}).` }));
  return Response.json(payload, { status: response.status });
}
