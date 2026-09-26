import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { AgentSetupPanel, AGENT_SETUP_DESCRIPTION } from "./AgentSetupPanel";
import { getAgentSetupPrompt } from "./agentSetupPrompt";
import { captureClientEvent } from "@/client/lib/posthog";

export function AgentSetup({
  onIntentChange,
  initialIntent,
  onComplete,
  onBack,
  disabled = false,
}: {
  onIntentChange?: (intent: "yes" | "no") => void;
  initialIntent?: "yes" | "no" | "";
  onComplete?: (intent: "yes" | "no") => void;
  onBack?: () => void;
  disabled?: boolean;
}) {
  const [intent, setIntent] = useState(initialIntent ?? "");
  const prompt = getAgentSetupPrompt(
    typeof window === "undefined"
      ? "https://seo-machine-api-lyart.vercel.app"
      : window.location.origin,
  );
  const Heading = onComplete ? "h1" : "h2";
  const chooseIntent = (answer: "yes" | "no") => {
    if (answer === "yes" || !onComplete) setIntent(answer);
    onIntentChange?.(answer);
    captureClientEvent("onboarding:agent_intent", { answer });
    if (answer === "no") onComplete?.("no");
  };

  return (
    <fieldset disabled={disabled}>
      <div className="mb-8">
        <Heading className="text-2xl font-semibold tracking-tight">
          {intent === "yes"
            ? "عامل خود را راه‌اندازی کنید"
            : "از عامل هوش مصنوعی استفاده می‌کنید؟"}
        </Heading>
        <p className="mt-3 text-pretty text-sm leading-relaxed text-base-content/60">
          {intent === "yes"
            ? AGENT_SETUP_DESCRIPTION
            : "مانند Claude، نسخه دسکتاپ ChatGPT یا Grok Bot."}
        </p>
      </div>
      {intent === "yes" ? (
        <>
          <AgentSetupPanel
            prompt={prompt}
            onCopy={() => captureClientEvent("onboarding:setup_prompt_copy")}
          />
          <div className="mt-7 flex items-center justify-between gap-3 border-t border-base-300 pt-5">
            <button
              type="button"
              className="flex min-h-10 items-center gap-1.5 text-xs text-base-content/60 hover:text-base-content"
              onClick={() => setIntent("")}
            >
              <ArrowRight className="size-3.5" /> بازگشت
            </button>
            {onComplete && (
              <button
                type="button"
                className="btn btn-ghost btn-sm gap-2"
                onClick={() => onComplete("yes")}
              >
                رفتن به داشبورد <ArrowLeft className="size-4" />
              </button>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            {onBack && (
              <button
                type="button"
                className="flex min-h-10 items-center gap-1.5 text-xs text-base-content/60 hover:text-base-content"
                onClick={onBack}
              >
                <ArrowRight className="size-3.5" /> بازگشت
              </button>
            )}
            <div className="ml-auto flex gap-3">
              <button
                type="button"
                className="btn btn-outline min-w-16"
                aria-pressed={onComplete ? undefined : intent === "no"}
                onClick={() => chooseIntent("no")}
              >
                خیر
              </button>
              <button
                type="button"
                className="btn btn-primary min-w-24"
                onClick={() => chooseIntent("yes")}
              >
                بله <ArrowLeft className="size-4" />
              </button>
            </div>
          </div>
          {intent === "no" && (
            <p className="mt-4 text-sm text-base-content/60">
              می‌توانید از داشبورد به‌تنهایی استفاده کنید و هر زمان خواستید از
              بخش راه‌اندازی عامل، یک عامل متصل کنید.
            </p>
          )}
        </>
      )}
    </fieldset>
  );
}
