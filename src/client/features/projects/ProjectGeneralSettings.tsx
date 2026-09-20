import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ProjectMarketFields } from "@/client/features/projects/ProjectMarketFields";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import {
  clearLastProjectId,
  getLastProjectId,
} from "@/client/lib/active-project";
import {
  archiveProject,
  getProjects,
  updateProject,
} from "@/serverFunctions/projects";
import type { ProjectSummary } from "./types";

export function ProjectGeneralSettings({ projectId }: { projectId: string }) {
  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: () => getProjects(),
  });
  const projects = projectsQuery.data ?? [];
  const project = projects.find((entry) => entry.id === projectId) ?? null;

  if (!project) {
    return (
      <div className="flex justify-center py-10">
        <span className="loading loading-spinner loading-md" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* key resets the form's local state when switching between projects */}
      <GeneralSection key={project.id} project={project} />
      <DangerSection project={project} canArchive={projects.length > 1} />
    </div>
  );
}

function GeneralSection({ project }: { project: ProjectSummary }) {
  const queryClient = useQueryClient();
  const [name, setName] = React.useState(project.name);
  const [domain, setDomain] = React.useState(project.domain ?? "");
  const [market, setMarket] = React.useState({
    locationCode: project.locationCode,
    languageCode: project.languageCode,
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      updateProject({
        data: {
          projectId: project.id,
          name: name.trim(),
          domain: domain.trim() || undefined,
          ...market,
        },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("پروژه به‌روزرسانی شد");
    },
    onError: (error) =>
      toast.error(
        getStandardErrorMessage(error, "به‌روزرسانی پروژه ناموفق بود"),
      ),
  });

  const isDirty =
    name.trim() !== project.name ||
    (domain.trim() || "") !== (project.domain ?? "") ||
    market.locationCode !== project.locationCode ||
    market.languageCode !== project.languageCode;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (updateMutation.isPending) return;
    if (!name.trim()) {
      toast.error("نام پروژه الزامی است");
      return;
    }
    updateMutation.mutate();
  };

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium text-base-content/50">عمومی</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">نام</span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={120}
            className="input input-bordered w-full"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">
            دامنه <span className="text-base-content/50">(اختیاری)</span>
          </span>
          <input
            type="text"
            value={domain}
            onChange={(event) => setDomain(event.target.value)}
            placeholder="example.com"
            dir="ltr"
            maxLength={255}
            className="input input-bordered w-full"
          />
        </label>

        <div className="flex flex-col gap-1.5">
          <ProjectMarketFields value={market} onChange={setMarket} />
          <span className="text-xs text-base-content/50">
            داده‌های کلمات کلیدی، نتایج جست‌وجو و دامنه از این کشور و زبان
            استفاده می‌کنند، مگر اینکه در درخواست گزینهٔ دیگری تعیین شود.
          </span>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={updateMutation.isPending || !isDirty}
          >
            ذخیرهٔ تغییرات
          </button>
        </div>
      </form>
    </section>
  );
}

function DangerSection({
  project,
  canArchive,
}: {
  project: ProjectSummary;
  canArchive: boolean;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = React.useState(false);

  const archiveMutation = useMutation({
    mutationFn: () => archiveProject({ data: { projectId: project.id } }),
    onSuccess: async () => {
      if (getLastProjectId() === project.id) clearLastProjectId();
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("پروژه بایگانی شد");
      // Re-resolve to a remaining project via the landing redirect.
      void navigate({ to: "/" });
    },
    onError: (error) =>
      toast.error(getStandardErrorMessage(error, "بایگانی پروژه ناموفق بود")),
  });

  return (
    <section className="space-y-3 border-t border-base-300 pt-8">
      <h2 className="text-sm font-medium text-base-content/50">
        بایگانی پروژه
      </h2>

      {confirming ? (
        <div className="space-y-3">
          <p className="text-sm text-base-content/70">
            با بایگانی پروژهٔ{" "}
            <span className="font-medium text-base-content">
              {project.name}
            </span>{" "}
            ، پروژه از فضای کاری شما حذف می‌شود و ردیابی رتبهٔ زمان‌بندی‌شدهٔ آن
            متوقف می‌شود. بعداً می‌توانید آن را از صفحهٔ پروژه‌ها بازیابی کنید.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-error btn-sm"
              onClick={() => archiveMutation.mutate()}
              disabled={archiveMutation.isPending}
            >
              بله، پروژه بایگانی شود
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setConfirming(false)}
              disabled={archiveMutation.isPending}
            >
              انصراف
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-base-content/60">
            {canArchive
              ? "برای حذف پروژه از سازمان، آن را بایگانی کنید."
              : "تنها پروژهٔ سازمان را نمی‌توان بایگانی کرد."}
          </p>
          <button
            type="button"
            className="btn btn-outline btn-error btn-sm shrink-0"
            onClick={() => setConfirming(true)}
            disabled={!canArchive}
          >
            بایگانی پروژه
          </button>
        </div>
      )}
    </section>
  );
}
