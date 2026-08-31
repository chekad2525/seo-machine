import Link from "next/link";
import { auth } from "@/auth";

export default async function HomePage() {
  const session = await auth();

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">S</div>
          <span>SEO Machine</span>
        </div>

        <span className="pill">Evidence-first SEO OS</span>
      </header>

      <section className="hero">
        <div>
          <div className="eyebrow">SEO OPERATING SYSTEM</div>
          <h1>
            سئو را مدیریت نکن.
            <br />
            هدایتش کن.
          </h1>

          <p className="lead">
            SEO Machine داده‌های واقعی سایت را به تصمیم، مأموریت و اقدام تبدیل
            می‌کند؛ با معماری Evidence-first و کنترل کامل کاربر روی اجرای تغییرات.
          </p>

          <div className="actions">
            <Link
              className="btn btn-primary"
              href={session ? "/dashboard" : "/sign-in"}
            >
              {session ? "ورود به Mission Control" : "ورود به SEO Machine"}
            </Link>
            <Link className="btn btn-secondary" href="#architecture">
              مشاهده معماری
            </Link>
          </div>

          <div className="feature-list" id="architecture">
            <div className="feature">
              <strong>Evidence</strong>
              <span>داده قبل از AI؛ تصمیم‌ها باید قابل اثبات باشند.</span>
            </div>
            <div className="feature">
              <strong>Decision</strong>
              <span>سیستم قبل از اجرا، اولویت، ریسک و دلیل را مشخص می‌کند.</span>
            </div>
            <div className="feature">
              <strong>Execution</strong>
              <span>اجرای کنترل‌شده با Approval، Audit و Verification.</span>
            </div>
          </div>
        </div>

        <div className="visual" aria-hidden="true">
          <div className="orb" />
          <div className="console-card">
            <div className="eyebrow">MISSION CONTROL</div>
            <div className="console-row">
              <span className="console-label">Health</span>
              <span className="console-value positive">Healthy</span>
            </div>
            <div className="console-row">
              <span className="console-label">Opportunity</span>
              <span className="console-value">High</span>
            </div>
            <div className="console-row">
              <span className="console-label">Momentum</span>
              <span className="console-value positive">+18.4%</span>
            </div>
            <div className="console-row">
              <span className="console-label">Top Mission</span>
              <span className="console-value">Refresh content</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
