import { NextResponse } from "next/server";

const apiBase =
  process.env.API_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3001/api/v1";

export async function POST(request: Request) {
  const body = await request.json();

  const response = await fetch(`${apiBase}/auth/phone/request`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const data = await response.json().catch(() => ({
    message: "Unable to process request",
  }));

  return NextResponse.json(data, { status: response.status });
}
