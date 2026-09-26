import { Link, useNavigate } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { savePreviewSession } from "@/lib/preview-session";

export function PreviewAuthPage({ mode }: { mode: "sign-in" | "sign-up" }) {
  const navigate = useNavigate();
  const isSignUp = mode === "sign-up";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim() || password.length < 6 || (isSignUp && !name.trim())) {
      setError("لطفاً همه فیلدها را کامل کنید؛ رمز عبور باید حداقل ۶ کاراکتر باشد.");
      return;
    }
    savePreviewSession({ name: name.trim() || email.split("@")[0] || "کاربر آزمایشی", email: email.trim() });
    void navigate({ to: "/dashboard" });
  }

  return (
    <main className="fd-light grid min-h-screen place-items-center bg-[#f5f1ec] px-4 py-10 text-neutral-950">
      <section className="w-full max-w-md rounded-3xl border border-[#d8d1c8] bg-white p-6 shadow-xl shadow-neutral-900/5 sm:p-8">
        <Link to="/" className="mb-8 inline-flex text-base font-bold">SEO Machine</Link>
        <h1 className="text-3xl font-black">{isSignUp ? "ساخت حساب آزمایشی" : "ورود به پنل آزمایشی"}</h1>
        <p className="mt-2 text-sm leading-7 text-neutral-600">برای تست آنلاین برنامه در همین مرورگر وارد شوید.</p>
        <form className="mt-7 space-y-4" onSubmit={submit}>
          {isSignUp && <label className="block text-sm font-semibold">نام و نام خانوادگی
            <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className="mt-2 h-12 w-full rounded-xl border border-neutral-300 px-4 outline-none focus:border-neutral-950" placeholder="نام شما" />
          </label>}
          <label className="block text-sm font-semibold">ایمیل
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" dir="ltr" className="mt-2 h-12 w-full rounded-xl border border-neutral-300 px-4 text-left outline-none focus:border-neutral-950" placeholder="name@example.com" />
          </label>
          <label className="block text-sm font-semibold">رمز عبور
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={isSignUp ? "new-password" : "current-password"} dir="ltr" className="mt-2 h-12 w-full rounded-xl border border-neutral-300 px-4 text-left outline-none focus:border-neutral-950" placeholder="حداقل ۶ کاراکتر" />
          </label>
          {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button className="h-12 w-full rounded-xl bg-neutral-950 font-bold text-white hover:bg-neutral-800">{isSignUp ? "ساخت حساب و ورود" : "ورود"}</button>
        </form>
        <p className="mt-5 text-center text-sm text-neutral-600">
          {isSignUp ? "قبلاً حساب ساخته‌اید؟" : "حساب آزمایشی ندارید؟"}{" "}
          <Link to={isSignUp ? "/sign-in" : "/sign-up"} className="font-bold text-neutral-950 underline underline-offset-4">
            {isSignUp ? "وارد شوید" : "ثبت‌نام کنید"}
          </Link>
        </p>
        <p className="mt-6 border-t border-neutral-200 pt-4 text-center text-xs leading-6 text-neutral-500">نسخه آزمایشی است؛ مشخصات ورود فقط در مرورگر شما ذخیره می‌شود و رمز عبور ذخیره نمی‌شود.</p>
      </section>
    </main>
  );
}