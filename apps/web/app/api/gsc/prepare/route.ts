import { auth } from '../../../../auth';

const apiUrl = () => process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ message: 'Sign in before connecting Search Console.' }, { status: 401 });
  const response = await fetch(`${apiUrl()}/api/v1/integrations/google-search-console/prepare`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-user-id': userId }, body: JSON.stringify(await request.json()), cache: 'no-store' });
  return Response.json(await response.json(), { status: response.status });
}
