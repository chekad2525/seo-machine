import { createFileRoute } from "@tanstack/react-router";
import { PreviewAuthPage } from "@/components/preview-auth-page";
export const Route = createFileRoute("/sign-up")({
  head: () => ({ meta: [{ title: "ثبت‌نام | SEO Machine" }] }),
  component: () => <PreviewAuthPage mode="sign-up" />,
});