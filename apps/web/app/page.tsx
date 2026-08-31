import Link from 'next/link';

export default function HomePage() {
  return <main className="landing-shell">
    <nav className="topbar"><div className="brand"><span className="brand-mark">⌁</span> SEO Machine</div><Link className="quiet-link" href="/sign-in">Sign in <span>↗</span></Link></nav>
    <section className="hero-grid">
      <div className="hero-copy">
        <p className="eyebrow">Search operations, without the scramble</p>
        <h1>Make every<br /><em>query</em> count.</h1>
        <p className="hero-lede">A focused workspace for the people turning search intent into durable growth. Connect a site, find the signal, ship the next right thing.</p>
        <Link className="primary-button" href="/sign-in">Create your workspace <span>→</span></Link>
      </div>
      <div className="signal-card" aria-label="Search signal preview">
        <div className="signal-card-head"><span>LIVE SIGNAL / 01</span><span className="status-dot">● connected</span></div>
        <div className="signal-number">+28.4<span>%</span></div>
        <p>organic clicks, last 28 days</p>
        <div className="sparkline" aria-hidden="true"><span /><span /><span /><span /><span /><span /><span /><span /><span /></div>
        <div className="signal-foot"><span>search console</span><strong>steady climb ↗</strong></div>
      </div>
    </section>
    <section className="manifesto"><span>01 — orient</span><p>One home for your organizations, workspaces, projects, and the search data that makes priorities obvious.</p><span>v0.4.0</span></section>
  </main>;
}
