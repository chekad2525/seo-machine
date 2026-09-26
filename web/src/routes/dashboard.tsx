import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { type FormEvent, useEffect, useState } from "react";
import { loadPreviewSession, PREVIEW_RANKINGS_KEY, PREVIEW_SESSION_KEY, type PreviewRanking, type PreviewSession } from "@/lib/preview-session";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "پنل آزمایشی | SEO Machine" }] }),
  component: PreviewDashboard,
});

const navigation = ["داشبورد", "نمای کلی دامنه", "تحقیق کلمات کلیدی", "ردیابی رتبه", "بک‌لینک‌ها", "ممیزی سایت", "سرچ کنسول", "تنظیمات"];

function PreviewDashboard() {
  const navigate = useNavigate();
  const [session, setSession] = useState<PreviewSession | null>(null);
  const [active, setActive] = useState("داشبورد");
  const [rankings, setRankings] = useState<PreviewRanking[]>([]);
  const [keyword, setKeyword] = useState("");
  const [domain, setDomain] = useState("");
  const [country, setCountry] = useState("ایران");

  useEffect(() => {
    const current = loadPreviewSession();
    if (!current) { void navigate({ to: "/sign-in", replace: true }); return; }
    setSession(current);
    try {
      const stored = localStorage.getItem(PREVIEW_RANKINGS_KEY);
      if (stored) setRankings(JSON.parse(stored) as PreviewRanking[]);
    } catch { localStorage.removeItem(PREVIEW_RANKINGS_KEY); }
  }, [navigate]);

  function addRanking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!keyword.trim() || !domain.trim()) return;
    const next = [{
      id: crypto.randomUUID(),
      keyword: keyword.trim(),
      domain: domain.trim().replace(/^https?:\/\//, "").replace(/\/$/, ""),
      country,
      position: Math.floor(Math.random() * 90) + 1,
    }, ...rankings];
    setRankings(next);
    localStorage.setItem(PREVIEW_RANKINGS_KEY, JSON.stringify(next));
    setKeyword("");
  }

  function logout() {
    localStorage.removeItem(PREVIEW_SESSION_KEY);
    void navigate({ to: "/sign-in" });
  }

  if (!session) return <main className="min-h-screen bg-[#f5f1ec]" />;
  const average = rankings.length ? String(Math.round(rankings.reduce((sum, item) => sum + item.position, 0) / rankings.length)) : "—";

  return (
    <main className="fd-light min-h-screen bg-[#f5f1ec] text-neutral-950 lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="border-b border-[#d8d1c8] bg-white p-5 lg:min-h-screen lg:border-b-0 lg:border-l">
        <div className="flex items-center justify-between lg:block">
          <div><p className="text-lg font-black">SEO Machine</p><p className="mt-1 text-xs text-neutral-500">پنل آزمایشی آنلاین</p></div>
          <button onClick={logout} className="text-sm font-semibold text-neutral-500 lg:hidden">خروج</button>
        </div>
        <nav className="mt-6 flex gap-2 overflow-x-auto pb-2 lg:block lg:space-y-1">
          {navigation.map((item) => <button key={item} onClick={() => setActive(item)}
            className={`whitespace-nowrap rounded-xl px-4 py-3 text-right text-sm font-semibold transition lg:w-full ${active === item ? "bg-neutral-950 text-white" : "hover:bg-[#f5f1ec]"}`}>{item}</button>)}
        </nav>
        <button onClick={logout} className="mt-8 hidden text-sm font-semibold text-neutral-500 lg:block">خروج از حساب آزمایشی</button>
      </aside>
      <section className="p-4 sm:p-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div><p className="text-sm text-neutral-500">خوش آمدید، {session.name}</p><h1 className="mt-1 text-3xl font-black">{active}</h1></div>
          <div className="rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-800">داده‌ها فقط در همین مرورگر ذخیره می‌شوند</div>
        </header>
        {active === "داشبورد" ? (
          <div className="mt-8">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["کلمات ردیابی‌شده", String(rankings.length)],
                ["میانگین رتبه", average],
                ["پروژه‌های فعال", rankings.length ? "۱" : "۰"],
                ["کشور هدف", rankings[0]?.country ?? "ایران"],
              ].map(([label, value]) => <article key={label} className="rounded-2xl border border-[#d8d1c8] bg-white p-5">
                <p className="text-sm text-neutral-500">{label}</p><p className="mt-3 text-3xl font-black">{value}</p>
              </article>)}
            </div>
            <article className="mt-5 rounded-2xl border border-[#d8d1c8] bg-white p-6">
              <h2 className="text-xl font-bold">شروع سریع</h2>
              <p className="mt-2 text-sm leading-7 text-neutral-600">برای آزمایش، بخش ردیابی رتبه را باز و اولین کلمه کلیدی را اضافه کنید.</p>
              <button onClick={() => setActive("ردیابی رتبه")} className="mt-5 rounded-xl bg-neutral-950 px-5 py-3 text-sm font-bold text-white">افزودن کلمه کلیدی</button>
            </article>
          </div>
        ) : active === "ردیابی رتبه" ? (
          <div className="mt-8 grid gap-5 xl:grid-cols-[360px_1fr]">
            <form onSubmit={addRanking} className="h-fit space-y-4 rounded-2xl border border-[#d8d1c8] bg-white p-5">
              <h2 className="text-lg font-bold">افزودن ردیابی</h2>
              <input value={keyword} onChange={(e) => setKeyword(e.target.value)} className="h-12 w-full rounded-xl border border-neutral-300 px-4" placeholder="کلمه کلیدی" />
              <input value={domain} onChange={(e) => setDomain(e.target.value)} dir="ltr" className="h-12 w-full rounded-xl border border-neutral-300 px-4 text-left" placeholder="example.com" />
              <select value={country} onChange={(e) => setCountry(e.target.value)} className="h-12 w-full rounded-xl border border-neutral-300 bg-white px-4">
                <option>ایران</option><option>امارات متحده عربی</option><option>آلمان</option><option>ایالات متحده</option>
              </select>
              <button className="h-12 w-full rounded-xl bg-neutral-950 font-bold text-white">افزودن</button>
            </form>
            <div className="overflow-hidden rounded-2xl border border-[#d8d1c8] bg-white">
              <div className="border-b border-neutral-200 p-5"><h2 className="font-bold">کلمات ردیابی‌شده</h2></div>
              {rankings.length ? <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm">
                <thead className="bg-neutral-50 text-neutral-500"><tr><th className="p-4 text-right">کلمه</th><th className="p-4 text-right">دامنه</th><th className="p-4 text-right">کشور</th><th className="p-4 text-right">رتبه آزمایشی</th></tr></thead>
                <tbody>{rankings.map((item) => <tr key={item.id} className="border-t border-neutral-100"><td className="p-4 font-semibold">{item.keyword}</td><td className="p-4" dir="ltr">{item.domain}</td><td className="p-4">{item.country}</td><td className="p-4 font-black">{item.position}</td></tr>)}</tbody>
              </table></div> : <p className="p-8 text-center text-sm text-neutral-500">هنوز کلمه‌ای اضافه نشده است.</p>}
            </div>
          </div>
        ) : <article className="mt-8 rounded-2xl border border-[#d8d1c8] bg-white p-8">
          <h2 className="text-xl font-bold">{active}</h2><p className="mt-3 text-sm leading-8 text-neutral-600">این بخش در پیش‌نمایش آنلاین نمایش داده شده است. اتصال داده واقعی در مرحله بعد انجام می‌شود.</p>
        </article>}
      </section>
    </main>
  );
}