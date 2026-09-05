import { auth } from '../../../../auth';
import { acceptsBrowserMutation, internalApiFetch } from '../../../../lib/internal-api';

export async function POST(request: Request) {
  if (!acceptsBrowserMutation(request)) return Response.json({ message: 'Invalid request origin or content type.' }, { status: 403 });
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ message: 'Sign in before syncing Search Console.' }, { status: 401 });
  const response = await internalApiFetch('/api/v1/integrations/google-search-console/sync', { method: 'POST', userId, body: JSON.stringify(await request.json()) });
  return Response.json(await response.json(), { status: response.status });
}
