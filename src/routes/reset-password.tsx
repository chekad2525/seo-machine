import { useForm } from "@tanstack/react-form";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  AuthPageCard,
  AuthPageShell,
  authRedirectSearchSchema,
} from "@/client/features/auth/AuthPage";
import { getFieldError, getFormError } from "@/client/lib/forms";
import { authClient } from "@/lib/auth-client";
import { isHostedClientAuthMode } from "@/lib/auth-mode";
import { getSignInSearch, normalizeAuthRedirect } from "@/lib/auth-redirect";
import {
  HOSTED_PASSWORD_MAX_LENGTH,
  HOSTED_PASSWORD_MIN_LENGTH,
} from "@/lib/auth-options";
import { z } from "zod";

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(
        HOSTED_PASSWORD_MIN_LENGTH,
        `گذرواژه باید دست‌کم ${HOSTED_PASSWORD_MIN_LENGTH} نویسه باشد.`,
      )
      .max(
        HOSTED_PASSWORD_MAX_LENGTH,
        `گذرواژه باید حداکثر ${HOSTED_PASSWORD_MAX_LENGTH} نویسه باشد.`,
      ),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "گذرواژه‌ها یکسان نیستند.",
    path: ["confirmPassword"],
  });

const resetPasswordSearchSchema = authRedirectSearchSchema.extend({
  error: z.string().optional(),
  token: z.string().optional(),
});

export const Route = createFileRoute("/reset-password")({
  validateSearch: resetPasswordSearchSchema,
  component: ResetPasswordPage,
});

function getResetPasswordErrorMessage(error: string | undefined) {
  switch ((error ?? "").toLowerCase()) {
    case "invalid_token":
      return "این پیوند بازیابی دیگر معتبر نیست. یک پیوند تازه درخواست کنید.";
    case "token_expired":
      return "این پیوند بازیابی منقضی شده است. یک پیوند تازه درخواست کنید.";
    default:
      return error
        ? "این پیوند بازیابی قابل استفاده نیست. یک پیوند تازه درخواست کنید."
        : null;
  }
}

function getResetPasswordPageCopy({
  isHostedMode,
  isComplete,
  routeError,
  hasToken,
}: {
  isHostedMode: boolean;
  isComplete: boolean;
  routeError: string | null;
  hasToken: boolean;
}) {
  if (!isHostedMode) {
    return {
      title: "بازیابی گذرواژه",
      helperText: "بازیابی گذرواژه اکنون در دسترس نیست.",
    };
  }

  if (isComplete) {
    return {
      title: "گذرواژه تغییر کرد",
      helperText: "گذرواژه شما تغییر کرد. اکنون با گذرواژه جدید وارد شوید.",
    };
  }

  if (routeError || !hasToken) {
    return {
      title: "پیوند بازیابی منقضی شده است",
      helperText:
        routeError ||
        "این پیوند بازیابی دیگر معتبر نیست. یک پیوند تازه درخواست کنید.",
    };
  }

  return {
    title: "بازیابی گذرواژه",
    helperText: "یک گذرواژه جدید برای حساب خود انتخاب کنید.",
  };
}

function ResetPasswordPage() {
  const search = Route.useSearch();
  const redirectTo = normalizeAuthRedirect(search.redirect);
  const isHostedMode = isHostedClientAuthMode();
  const routeError = getResetPasswordErrorMessage(search.error);
  const token = typeof search.token === "string" ? search.token : null;
  const form = useForm({
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
    validators: {
      onSubmit: resetPasswordSchema,
    },
    onSubmit: async ({ formApi, value }) => {
      if (!token) {
        formApi.setErrorMap({
          onSubmit: {
            form: "این پیوند بازیابی دیگر معتبر نیست. یک پیوند تازه درخواست کنید.",
            fields: {},
          },
        });
        return;
      }

      try {
        const result = await authClient.resetPassword({
          newPassword: value.password,
          token,
        });

        if (result.error) {
          formApi.setErrorMap({
            onSubmit: {
              form: "این پیوند بازیابی دیگر معتبر نیست. یک پیوند تازه درخواست کنید.",
              fields: {},
            },
          });
          return;
        }
      } catch {
        formApi.setErrorMap({
          onSubmit: {
            form: "در حال حاضر تغییر گذرواژه ممکن نیست. دوباره تلاش کنید.",
            fields: {},
          },
        });
      }
    },
  });

  return (
    <AuthPageShell>
      <form.Subscribe
        selector={(state) => ({
          isComplete: state.isSubmitSuccessful && !state.errorMap.onSubmit,
          submitError: state.errorMap.onSubmit,
          isSubmitting: state.isSubmitting,
        })}
      >
        {({ isComplete, submitError, isSubmitting }) => {
          const errorMessage = getFormError(submitError);
          const pageCopy = getResetPasswordPageCopy({
            isHostedMode,
            isComplete,
            routeError,
            hasToken: !!token,
          });

          return (
            <AuthPageCard
              title={pageCopy.title}
              helperText={pageCopy.helperText}
              footer={
                <p className="text-sm">
                  <Link
                    to="/sign-in"
                    search={getSignInSearch(redirectTo)}
                    className="text-base-content/50 hover:text-base-content transition-colors"
                  >
                    ورود
                  </Link>
                </p>
              }
            >
              {!isHostedMode ? null : isComplete ? (
                <a
                  href={
                    redirectTo === "/"
                      ? "/sign-in"
                      : `/sign-in?redirect=${encodeURIComponent(redirectTo)}`
                  }
                  className="btn btn-soft w-full"
                >
                  ادامه و ورود
                </a>
              ) : routeError || !token ? (
                <Link
                  to="/forgot-password"
                  search={getSignInSearch(redirectTo)}
                  className="btn btn-soft w-full"
                >
                  درخواست پیوند بازیابی جدید
                </Link>
              ) : (
                <form
                  className="space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void form.handleSubmit();
                  }}
                >
                  <form.Field name="password">
                    {(field) => {
                      const error = getFieldError(field.state.meta.errors);

                      return (
                        <div>
                          <input
                            type="password"
                            className="input input-bordered w-full"
                            placeholder="گذرواژه جدید..."
                            value={field.state.value}
                            onChange={(event) =>
                              field.handleChange(event.target.value)
                            }
                            autoComplete="new-password"
                            minLength={HOSTED_PASSWORD_MIN_LENGTH}
                            maxLength={HOSTED_PASSWORD_MAX_LENGTH}
                            required
                          />
                          {error ? (
                            <p className="mt-1 text-sm text-error">{error}</p>
                          ) : null}
                        </div>
                      );
                    }}
                  </form.Field>

                  <form.Field name="confirmPassword">
                    {(field) => {
                      const error = getFieldError(field.state.meta.errors);

                      return (
                        <div>
                          <input
                            type="password"
                            className="input input-bordered w-full"
                            placeholder="تکرار گذرواژه جدید..."
                            value={field.state.value}
                            onChange={(event) =>
                              field.handleChange(event.target.value)
                            }
                            autoComplete="new-password"
                            minLength={HOSTED_PASSWORD_MIN_LENGTH}
                            maxLength={HOSTED_PASSWORD_MAX_LENGTH}
                            required
                          />
                          {error ? (
                            <p className="mt-1 text-sm text-error">{error}</p>
                          ) : null}
                        </div>
                      );
                    }}
                  </form.Field>

                  {errorMessage ? (
                    <p className="text-sm text-error">{errorMessage}</p>
                  ) : null}
                  <button
                    className="btn btn-soft w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "در حال تغییر گذرواژه..." : "تغییر گذرواژه"}
                  </button>
                </form>
              )}
            </AuthPageCard>
          );
        }}
      </form.Subscribe>
    </AuthPageShell>
  );
}
