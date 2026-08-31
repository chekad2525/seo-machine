import { redirect } from "next/navigation";
import { auth } from "@/auth";
import SignInPanel from "./sign-in-panel";

export default async function SignInPage() {
  const session = await auth();
  if (session) redirect("/dashboard");

  return (
    <main className="auth-layout">
      <section className="auth-story">
        <div className="brand">
          <div className="brand-mark">S</div>
          <span>SEO Machine</span>
        </div>

        <div className="auth-title">
          <div className="eyebrow">SECURE ACCESS</div>
          <h1>ورود به مرکز فرماندهی سئو</h1>
          <p className="auth-help">
            با Google یا شماره موبایل وارد شوید. برای ورود موبایلی یک کد
            یک‌بارمصرف ارسال می‌شود.
          </p>
        </div>

        <p className="auth-help">
          موتور احراز هویت Auth.js روی سرور خود SEO Machine اجرا می‌شود و سرویس
          پیامک از طریق Adapter قابل تعویض است.
        </p>
      </section>

      <section className="auth-panel">
        <SignInPanel />
      </section>
    </main>
  );
}
