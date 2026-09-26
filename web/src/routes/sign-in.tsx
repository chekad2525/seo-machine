import { createFileRoute } from "@tanstack/react-router";
import { PreviewAuthPage } from "@/components/preview-auth-page";
export const Route = createFileRoute("/sign-in")({
  head: () => ({ meta: [{ title: "ورود | SEO Machine" }] }),
  component: () => <PreviewAuthPage mode="sign-in" />,
});