import { auth } from '../../auth';
import Link from 'next/link';
import ConnectSearchConsole from './connect-search-console';

const apiUrl = () => process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) return <main className="auth-shell"><div className="auth-card"><p className="eyebrow">Private workspace</p><h1>Sign in to see your signals.</h1><Link className="primary-button full" href="/sign-in">Sign in <span>→</span></Link></div></main>;
  const statusResponse = await fetch(`${apiUrl()}/api/v1/onboarding`, { headers: { 'x-user-id': session.user.id }, cache: 'no-store' });
  const status = statusResponse.ok ? await statusResponse.json() as { organizations?: Array<{ workspaces?: Array<{ projects?: Array<{ id: string; domain: string }> }> }> } : null;
  const project = status?.organizations?.[0]?.workspaces?.[0]?.projects?.[0];
  return <main className="dashboard-shell"><nav className="dashboard-nav"><div className="brand"><span className="brand-mark">⌁</span> SEO Machine</div><span className="setup-user">{session.user.email ?? session.user.name}</span></nav><section className="dashboard-content"><div className="dashboard-header"><div><p className="eyebrow">Workspace / Overview</p><h1>Your search system is ready.</h1><p className="muted">Next, connect the signal and let the useful questions surface.</p></div><span className="live-pill">● workspace live</span></div><div className="dashboard-grid"><article className="metric-card accent"><span>PROJECTS</span><strong>{project ? '01' : '00'}</strong><p>{project ? 'One site, ready to learn from.' : 'Complete setup to add a site.'}</p></article><article className="metric-card"><span>GSC STATUS</span><strong>Pending</strong><p>Read-only connection, awaiting consent.</p></article><article className="next-card"><p className="eyebrow">Next useful move</p><h2>Bring in the query layer.</h2><p className="muted">Search Console gives your team a shared view of clicks, impressions, and the pages earning attention.</p>{project ? <ConnectSearchConsole projectId={project.id} property={project.domain} /> : <Link className="secondary-button" href="/onboarding">Set up a project <span>→</span></Link>}</article></div></section></main>;
}
