import { createFileRoute } from "@tanstack/react-router";
import { LandingPage } from "@/components/landing-page";
import { buildPageSeo } from "@/lib/seo";

const homeTitle = "OpenSEO | پلتفرم متن‌باز سئو";
const homeDescription =
  "OpenSEO جایگزین متن‌باز Ahrefs و Semrush است؛ با تحقیق کلمات کلیدی، بررسی بک‌لینک، ردیابی رتبه و ممیزی سایت. هزینه بر اساس مصرف است و می‌توانید آن را روی سرور خودتان میزبانی کنید یا از طریق MCP به عامل‌های هوش مصنوعی وصل کنید.";

export const Route = createFileRoute("/_marketing/")({
  head: () => {
    const seo = buildPageSeo({
      title: homeTitle,
      description: homeDescription,
      path: "/",
      imageAlt: "پیش‌نمایش داشبورد تحقیق کلمات کلیدی OpenSEO",
    });

    return {
      ...seo,
      links: [
        ...(seo.links ?? []),
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        {
          rel: "preconnect",
          href: "https://fonts.gstatic.com",
          crossOrigin: "anonymous",
        },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500&family=JetBrains+Mono:wght@400;500&display=swap",
        },
      ],
    };
  },
  component: LandingPage,
});
