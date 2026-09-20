import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Modal } from "@/client/components/Modal";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import { setLastProjectId } from "@/client/lib/active-project";
import {
  DEFAULT_LOCATION_CODE,
  getLanguageCode,
} from "@/client/features/keywords/locations";
import { ProjectMarketFields } from "@/client/features/projects/ProjectMarketFields";
import { createProject } from "@/serverFunctions/projects";

export function CreateProjectModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = React.useState("");
  const [domain, setDomain] = React.useState("");
  const [market, setMarket] = React.useState({
    locationCode: DEFAULT_LOCATION_CODE,
    languageCode: getLanguageCode(DEFAULT_LOCATION_CODE),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createProject({
        data: {
          name: name.trim(),
          domain: domain.trim() || undefined,
          ...market,
        },
      }),
    onSuccess: async (created) => {
      setLastProjectId(created.id);
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      await queryClient.invalidateQueries({
        queryKey: ["dashboardActivation"],
      });
      onClose();
      toast.success("پروژه ساخته شد");
      // Continue setup through the new project’s dashboard.
      void navigate({
        to: "/p/$projectId",
        params: { projectId: created.id },
      });
    },
    onError: (error) =>
      toast.error(getStandardErrorMessage(error, "ساخت پروژه ناموفق بود")),
  });

  const isPending = createMutation.isPending;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (isPending) return;
    if (!name.trim()) {
      toast.error("نام پروژه الزامی است");
      return;
    }
    createMutation.mutate();
  };

  return (
    <Modal
      maxWidth="max-w-md"
      onClose={isPending ? undefined : onClose}
      labelledBy="create-project-title"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <h2 id="create-project-title" className="text-lg font-semibold">
          پروژهٔ جدید
        </h2>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">نام</span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Acme Inc."
            maxLength={120}
            autoFocus
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
            maxLength={255}
            className="input input-bordered w-full"
          />
          <span className="text-xs text-base-content/50">
            پس از ساخت پروژه می‌توانید Search Console را وصل و ردیابی رتبه را تنظیم کنید.
          </span>
        </label>

        <div className="flex flex-col gap-1.5">
          <ProjectMarketFields value={market} onChange={setMarket} />
          <span className="text-xs text-base-content/50">
            داده‌های کلمات کلیدی، نتایج جستجو و دامنه به‌طور پیش‌فرض از این کشور و زبان
            استفاده می‌کنند. بعداً می‌توانید آن‌ها را در تنظیمات پروژه تغییر دهید.
          </span>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            disabled={isPending}
          >
            انصراف
          </button>
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={isPending}
          >
            ساخت پروژه
          </button>
        </div>
      </form>
    </Modal>
  );
}
