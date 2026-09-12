import { auth } from '../../../auth';
import { acceptsBrowserMutation, internalApiFetch } from '../../../lib/internal-api';

export async function POST(request: Request) {
  if (!acceptsBrowserMutation(request)) return Response.json({ message: 'مبدأ درخواست معتبر نیست.' }, { status: 403 });
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ message: 'ابتدا وارد حساب شوید.' }, { status: 401 });
  try {
    const body = await request.text();
    const response = await internalApiFetch('/api/v1/integrations/google-search-console/keyword-tracking', { method: 'POST', userId, body });
    const text = await response.text();
    return new Response(text || JSON.stringify({ message: response.ok ? 'انجام شد.' : 'درخواست انجام نشد.' }), { status: response.status, headers: { 'content-type': 'application/json' } });
  } catch (error) {
    console.error('[keywords] mutation failed', error);
    return Response.json({ message: 'ارتباط با سرویس رهگیری برقرار نشد.' }, { status: 503 });
  }
}
