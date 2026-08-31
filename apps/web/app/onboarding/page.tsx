import { auth } from '../../auth';
import Link from 'next/link';
import OnboardingForm from './onboarding-form';

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user) return <main className="auth-shell"><div className="auth-card"><p className="eyebrow">Setup needs an identity</p><h1>Sign in to start your workspace.</h1><p className="muted">Your organization and projects are always attached to one canonical SEO Machine user.</p><Link className="primary-button full" href="/sign-in">Go to sign in <span>→</span></Link></div></main>;
  return <main className="setup-shell"><div className="setup-top"><div className="brand"><span className="brand-mark">⌁</span> SEO Machine</div><span className="setup-user">{session.user.email ?? session.user.name}</span></div><div className="setup-layout"><aside className="setup-rail"><p className="eyebrow">Your first signal</p><h1>Give the work a home.</h1><p>One organization. One workspace. One site to begin with. You can add more when the signal gets interesting.</p><div className="rail-line" /><span className="rail-caption">SETUP / 04</span></aside><section className="setup-panel"><OnboardingForm /></section></div></main>;
}
