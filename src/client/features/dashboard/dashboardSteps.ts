import { Bot, FolderPlus, Globe, Search, Users } from "lucide-react";
import type { DashboardActivation } from "@/server/features/dashboard/services/DashboardService";
import type { DashboardSetupStep } from "@/types/schemas/dashboard";

export const setupSteps: {
  id: DashboardSetupStep;
  label: string;
  detail: string;
  icon: typeof Globe;
}[] = [
  {
    id: "domain",
    label: "وب‌سایت خود را اضافه کنید",
    detail: "وب‌سایت و کشور این پروژه را تعیین کنید.",
    icon: Globe,
  },
  {
    id: "project",
    label: "روی چند وب‌سایت کار می‌کنید؟",
    detail:
      "پروژهٔ دیگری بسازید یا از عامل هوش مصنوعی بخواهید فهرست سایت‌ها را آماده کند.",
    icon: FolderPlus,
  },
  {
    id: "competitor",
    label: "یک رقیب را بررسی کنید",
    detail: "موضوع‌ها و لینک‌های ارزشمند را پیدا کنید.",
    icon: Search,
  },
  {
    id: "mcp",
    label: "عامل هوش مصنوعی خود را وصل کنید",
    detail: "از OpenSEO در Claude یا عامل دلخواهتان استفاده کنید.",
    icon: Bot,
  },
  {
    id: "gsc",
    label: "Search Console را وصل کنید",
    detail: "کلیک‌ها و عبارت‌های جستجوی واقعی خود را ببینید.",
    icon: Search,
  },
  {
    id: "team",
    label: "هم‌تیمی دعوت کنید",
    detail: "کار را به اشتراک بگذارید یا فعلاً به‌تنهایی ادامه دهید.",
    icon: Users,
  },
];

export function getStepStatus(
  activation: DashboardActivation,
  step: DashboardSetupStep,
): "done" | "skipped" | "todo" {
  const completed: Record<DashboardSetupStep, boolean> = {
    domain: activation.domain !== null,
    project: activation.hasMultipleProjects,
    competitor: activation.competitorClickedAt !== null,
    mcp:
      activation.mcp.authorizedAt !== null ||
      activation.mcp.firstToolCallAt !== null,
    gsc: activation.gsc.connected,
    team: activation.hasTeammate,
  };
  if (completed[step]) return "done";
  // Preserve previous MCP dismissals without treating them as authorization.
  if (
    activation.dismissedSteps.includes(step) ||
    (step === "mcp" && activation.mcp.cardDismissedAt !== null)
  )
    return "skipped";
  return "todo";
}
