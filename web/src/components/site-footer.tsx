import { Link } from "@tanstack/react-router";
import { featureGroups } from "@/lib/feature-pages";

const featureLinks = featureGroups.flatMap((group) =>
  group.pages.map((page) => ({
    label: page.eyebrow,
    href: `/features/${page.slug}`,
  })),
);

export function SiteFooter({ className }: { className?: string }) {
  return (
    <div className={className}>
      <Link to="/" className="text-sm font-semibold text-neutral-900">
        OpenSEO
      </Link>

      <div className="mt-6 grid grid-cols-2 gap-8 md:grid-cols-[repeat(auto-fit,minmax(9rem,1fr))]">
        <div>
          <p className="font-semibold text-neutral-900">امکانات</p>
          <div className="mt-2 flex flex-col gap-1.5">
            {featureLinks.map((link) => (
              <a key={link.href} href={link.href}>
                {link.label}
              </a>
            ))}
            <Link to="/features">همهٔ امکانات</Link>
          </div>
        </div>

        <div>
          <p className="font-semibold text-neutral-900">عامل‌های هوش مصنوعی</p>
          <div className="mt-2 flex flex-col gap-1.5">
            <Link to="/features/mcp">OpenSEO MCP</Link>
            <Link to="/google-search-console-mcp">
              Google Search Console MCP
            </Link>
          </div>
        </div>

        <div>
          <p className="font-semibold text-neutral-900">منابع</p>
          <div className="mt-2 flex flex-col gap-1.5">
            <a href="/docs/mcp">MCP</a>
            <a href="/docs/skills">مهارت‌ها</a>
            <Link to="/library">کتابخانهٔ راهبردها</Link>
            <Link to="/open-source-seo">چرا متن‌باز؟</Link>
            <Link to="/blogs">وبلاگ</Link>
            <a href="/docs">مستندات</a>
          </div>
        </div>

        <div>
          <p className="font-semibold text-neutral-900">ابزارهای رایگان</p>
          <div className="mt-2 flex flex-col gap-1.5">
            <Link to="/backlink-checker">بررسی بک‌لینک</Link>
          </div>
        </div>

        <div>
          <p className="font-semibold text-neutral-900">شرکت</p>
          <div className="mt-2 flex flex-col gap-1.5">
            <Link to="/support">پشتیبانی</Link>
            <Link to="/roadmap">نقشهٔ راه</Link>
            <Link to="/pricing">تعرفه‌ها</Link>
            <a
              href="https://github.com/every-app/open-seo"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
            <a
              href="https://discord.gg/c9uGs3cFXr"
              target="_blank"
              rel="noopener noreferrer"
            >
              Discord
            </a>
            <Link to="/privacy">حریم خصوصی</Link>
            <Link to="/terms-and-conditions">شرایط استفاده</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
