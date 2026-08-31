"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";

export default function SignInPanel() {
  const [phone, setPhone] = useState("+98");
  const [code, setCode] = useState("");
  const [phase, setPhase] = useState<"phone" | "code">("phone");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function requestCode(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/phone/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.message || "ارسال کد ناموفق بود.");
        return;
      }

      setPhase("code");
      setMessage("کد ورود ارسال شد.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const result = await signIn("phone-otp", {
      phone,
      code,
      redirect: false,
      redirectTo: "/dashboard",
    });

    setLoading(false);

    if (result?.error) {
      setMessage("کد واردشده معتبر نیست یا منقضی شده است.");
      return;
    }

    window.location.href = "/dashboard";
  }

  return (
    <div className="login-card">
      <div className="login-heading">
        <span className="eyebrow">WELCOME BACK</span>
        <h2>ورود به حساب</h2>
        <p>روش ورود موردنظر را انتخاب کنید.</p>
      </div>

      <button
        className="google-button"
        type="button"
        onClick={() => signIn("google", { redirectTo: "/dashboard" })}
      >
        <span className="google-icon">G</span>
        ادامه با Google
      </button>

      <div className="divider">
        <span>یا</span>
      </div>

      {phase === "phone" ? (
        <form onSubmit={requestCode} className="login-form">
          <label htmlFor="phone">شماره موبایل</label>
          <input
            id="phone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            inputMode="tel"
            placeholder="+989121234567"
            required
          />
          <button className="btn btn-primary full" disabled={loading}>
            {loading ? "در حال ارسال..." : "ارسال کد ورود"}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="login-form">
          <label htmlFor="code">کد ۶ رقمی</label>
          <input
            id="code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            placeholder="123456"
            autoFocus
            required
          />
          <button className="btn btn-primary full" disabled={loading}>
            {loading ? "در حال بررسی..." : "ورود"}
          </button>
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setPhase("phone");
              setCode("");
              setMessage("");
            }}
          >
            تغییر شماره موبایل
          </button>
        </form>
      )}

      {message ? <div className="auth-message">{message}</div> : null}

      <p className="privacy-note">
        کلیدهای Google و سرویس پیامک فقط سمت سرور نگهداری می‌شوند.
      </p>
    </div>
  );
}
