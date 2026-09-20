import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { SearchConsoleConnectionCard } from "@/client/features/gsc/SearchConsoleConnectionCard";
import { AUDIT_ISSUE_TYPES } from "@/shared/audit-issues";

import {
  formatCount,
  formatCtr,
  formatPosition,
} from "@/client/features/search-performance/SearchPerformanceColumns";
import { getSearchPerformanceReport } from "@/serverFunctions/searchPerformance";
import {
  CardShell,
  EmptyCardBody,
  formatDay,
  moreDetailsClass,
  newLost,
  PercentDelta,
  Stat,
} from "@/client/features/dashboard/cardParts";
import type {
  DashboardAuditSummary,
  DashboardBacklinkSummary,
} from "@/server/features/dashboard/services/DashboardService";

// Plain string-keyed view of the registry: issue types from the DB are not
// statically guaranteed to be registry keys.
const issueTitles: Record<string, string | undefined> = Object.fromEntries(
  Object.entries(AUDIT_ISSUE_TYPES).map(([key, value]) => [key, value.title]),
);

export function GscCard({
  projectId,
  connected,
}: {
  projectId: string;
  connected: boolean;
}) {
  const reportQuery = useQuery({
    queryKey: ["dashboardGscReport", projectId],
    queryFn: () =>
      getSearchPerformanceReport({
        data: { projectId, dateRange: "last_28_days" },
      }),
    enabled: connected,
  });

  // Not connected (or a dead grant discovered by the report call): the
  // connection card sells and runs the whole flow itself.
  if (!connected || (reportQuery.data && !reportQuery.data.connected)) {
    return (
      <div id="connect-gsc">
        <SearchConsoleConnectionCard projectId={projectId} />
      </div>
    );
  }

  const report = reportQuery.data;

  return (
    <CardShell
      title="عملکرد جست‌وجو"
      stamp="گوگل سرچ کنسول · ۲۸ روز گذشته"
      action={
        <Link
          to="/p/$projectId/search-performance"
          params={{ projectId }}
          className={moreDetailsClass}
        >
          جزئیات بیشتر
        </Link>
      }
    >
      {reportQuery.isPending ? (
        <div className="grid grid-cols-2 gap-3" aria-busy>
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="skeleton h-20" />
          ))}
        </div>
      ) : reportQuery.isError ? (
        <p className="text-sm text-base-content/60">
          داده‌های سرچ کنسول بارگذاری نشد. کمی بعد دوباره تلاش کنید.
        </p>
      ) : report?.connected ? (
        <div className="grid grid-cols-2 gap-3">
          <Stat
            label="کلیک‌ها"
            value={formatCount(report.totals.clicks)}
            sub={
              <PercentDelta
                current={report.totals.clicks}
                previous={report.prevTotals.clicks}
              />
            }
          />
          <Stat
            label="نمایش‌ها"
            value={formatCount(report.totals.impressions)}
            sub={
              <PercentDelta
                current={report.totals.impressions}
                previous={report.prevTotals.impressions}
              />
            }
          />
          <Stat label="CTR" value={formatCtr(report.totals.ctr)} />
          <Stat
            label="میانگین جایگاه"
            value={formatPosition(report.totals.position)}
          />
        </div>
      ) : null}
    </CardShell>
  );
}

export function AuditHealthCard({
  projectId,
  audit,
}: {
  projectId: string;
  audit: DashboardAuditSummary | null;
}) {
  if (!audit) {
    return (
      <CardShell title="ممیزی سایت">
        <EmptyCardBody
          message="سایت خود را برای یافتن پیوندهای خراب، برچسب‌های ناقص و مشکلات نمایه‌سازی بررسی کنید."
          cta={
            <Link
              to="/p/$projectId/audit"
              params={{ projectId }}
              className="btn btn-primary btn-sm"
            >
              شروع ممیزی
            </Link>
          }
        />
      </CardShell>
    );
  }

  return (
    <CardShell
      title="ممیزی سایت"
      stamp={`ممیزی سایت · ${
        audit.status === "completed"
          ? `${audit.pagesCrawled} صفحه بررسی شد · ${formatDay(audit.startedAt)}`
          : audit.status === "running"
            ? "بررسی در حال انجام است"
            : "آخرین بررسی ناموفق بود"
      }`}
      action={
        <Link
          to="/p/$projectId/audit"
          params={{ projectId }}
          className={moreDetailsClass}
        >
          جزئیات بیشتر
        </Link>
      }
    >
      {audit.topIssues.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-base-content/70">
          <Check className="size-4 text-success" />
          مشکلی پیدا نشد؛ وضعیت سایت مناسب است.
        </div>
      ) : (
        <ul className="space-y-2">
          {audit.topIssues.map((issue) => (
            <li
              key={issue.issueType}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className={`size-2 shrink-0 rounded-full ${
                    issue.severity === "critical"
                      ? "bg-error"
                      : issue.severity === "warning"
                        ? "bg-warning"
                        : "bg-base-content/30"
                  }`}
                />
                <span className="truncate">
                  {issueTitles[issue.issueType] ?? issue.issueType}
                </span>
              </span>
              <span className="shrink-0 tabular-nums text-base-content/60">
                {issue.count} صفحه
              </span>
            </li>
          ))}
          {audit.totalIssueTypes > audit.topIssues.length ? (
            <li className="text-xs text-base-content/50">
              {audit.totalIssueTypes - audit.topIssues.length} مشکل دیگر
            </li>
          ) : null}
        </ul>
      )}
    </CardShell>
  );
}

export function BacklinkPulseCard({
  projectId,
  backlinks,
  refreshing,
}: {
  projectId: string;
  backlinks: DashboardBacklinkSummary | null;
  refreshing: boolean;
}) {
  if (!backlinks && refreshing) {
    return (
      <CardShell title="وضعیت بک‌لینک‌ها" stamp="در حال ثبت نخستین گزارش…">
        <div className="grid grid-cols-2 gap-3" aria-busy>
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="skeleton h-20" />
          ))}
        </div>
      </CardShell>
    );
  }

  if (!backlinks) {
    return (
      <CardShell title="وضعیت بک‌لینک‌ها">
        <p className="text-sm text-base-content/60">
          پیوندهای ورودی به دامنهٔ شما ثبت می‌شوند؛ نیازی به تنظیمات نیست.
        </p>
      </CardShell>
    );
  }

  return (
    <CardShell
      title="وضعیت بک‌لینک‌ها"
      stamp={`بک‌لینک‌ها · گزارش ${formatDay(backlinks.capturedAt)}${
        refreshing ? " · در حال به‌روزرسانی…" : ""
      }`}
      action={
        <Link
          to="/p/$projectId/backlinks"
          params={{ projectId }}
          search={{ target: backlinks.domain, scope: "domain" }}
          className={moreDetailsClass}
        >
          جزئیات بیشتر
        </Link>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Stat
          label="دامنه‌های ارجاع‌دهنده"
          value={
            backlinks.referringDomains === null
              ? "—"
              : backlinks.referringDomains.toLocaleString()
          }
        />
        <Stat
          label="بک‌لینک‌ها"
          value={
            backlinks.backlinks === null
              ? "—"
              : backlinks.backlinks.toLocaleString()
          }
        />
        <Stat
          label="پیوندهای جدید"
          value={`▲ ${newLost(backlinks.newBacklinks)}`}
          tone={
            backlinks.newBacklinks && backlinks.newBacklinks > 0
              ? "success"
              : undefined
          }
        />
        <Stat
          label="پیوندهای ازدست‌رفته"
          value={`▼ ${newLost(backlinks.lostBacklinks)}`}
          tone={
            backlinks.lostBacklinks && backlinks.lostBacklinks > 0
              ? "error"
              : undefined
          }
        />
      </div>
    </CardShell>
  );
}
