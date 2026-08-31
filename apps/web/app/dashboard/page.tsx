import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) redirect("/sign-in");

  const displayName =
    session.user.name ||
    session.user.email ||
    session.user.phone ||
    "کاربر";

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <div className="shell topbar" style={{ height: "auto" }}>
          <div className="brand">
            <div className="brand-mark">S</div>
            <span>SEO Machine</span>
          </div>

          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button className="btn btn-secondary" type="submit">
              خروج
            </button>
          </form>
        </div>
      </header>

      <div className="shell">
        <div style={{ paddingTop: 48 }}>
          <div className="eyebrow">MISSION CONTROL</div>
          <h1 style={{ fontSize: "clamp(38px, 6vw, 68px)" }}>
            خوش آمدی، {displayName}
          </h1>
          <p className="lead">
            ورود امن فعال است. مرحله بعد ایجاد Project و اتصال Google Search
            Console خواهد بود.
          </p>
        </div>

        <section className="dashboard-grid">
          <div className="metric">
            <div className="metric-label">Auth Provider</div>
            <div className="metric-value positive">
              {session.provider || "Session"}
            </div>
          </div>
          <div className="metric">
            <div className="metric-label">Projects</div>
            <div className="metric-value">0</div>
          </div>
          <div className="metric">
            <div className="metric-label">Next Mission</div>
            <div className="metric-value">Create project</div>
          </div>
        </section>
      </div>
    </main>
  );
}
