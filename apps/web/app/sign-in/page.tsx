import { signIn } from '../../auth';
import Link from 'next/link';

export default function SignInPage() {
  return <main className="auth-shell"><Link className="back-link" href="/">← Back to home</Link><div className="auth-card"><p className="eyebrow">Welcome to the machine</p><h1>Bring your search work into focus.</h1><p className="muted">Sign in with Google to create your canonical SEO Machine identity. Phone OTP remains available for teams that prefer it.</p><form action={async () => { 'use server'; await signIn('google', { redirectTo: '/onboarding' }); }}><button className="primary-button full" type="submit">Continue with Google <span>↗</span></button></form><div className="auth-note"><span className="rule" />Your data stays in your workspace<span className="rule" /></div></div></main>;
}
