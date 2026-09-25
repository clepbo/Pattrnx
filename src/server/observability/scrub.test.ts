import type { ErrorEvent } from "@sentry/nextjs";
import { describe, expect, it } from "vitest";

import { scrubBreadcrumb, scrubEvent } from "./scrub";

const SECRET = "slept 4h, skipped gym";

function eventWithEverything(): ErrorEvent {
  return {
    type: undefined,
    message: "task update failed",
    environment: "production",
    release: "abc123",
    user: { id: "user-1", email: "a@example.com", ip_address: "1.2.3.4", username: "ada" },
    request: {
      method: "POST",
      url: "https://pattrnx.app/log?note=secret#frag",
      data: { note: SECRET },
      cookies: { "sb-access-token": "jwt" },
      headers: { cookie: "sb=jwt", "user-agent": "x" },
      query_string: "note=secret",
    },
    extra: { payload: SECRET },
    contexts: { nextjs: { request_path: "/log?note=secret", route_type: "render" } },
    breadcrumbs: [
      { category: "console", message: SECRET, level: "log", timestamp: 1 },
      {
        category: "fetch",
        type: "http",
        timestamp: 2,
        data: { url: "https://x.supabase.co/rest/v1/activities?note=eq.secret", method: "POST", status_code: 400, body: SECRET },
      },
    ],
    exception: {
      values: [
        {
          type: "Error",
          value: "upsert: 23514",
          stacktrace: { frames: [{ filename: "services/activities.ts", lineno: 10, vars: { input: SECRET } }] },
        },
      ],
    },
  };
}

describe("scrubEvent", () => {
  const scrubbed = scrubEvent(eventWithEverything());

  it("drops every field that could carry user content", () => {
    expect(JSON.stringify(scrubbed)).not.toContain("secret");
    expect(JSON.stringify(scrubbed)).not.toContain(SECRET);
    expect(JSON.stringify(scrubbed)).not.toContain("a@example.com");
    expect(JSON.stringify(scrubbed)).not.toContain("1.2.3.4");
    expect(JSON.stringify(scrubbed)).not.toContain("jwt");
  });

  it("keeps what's needed to debug", () => {
    expect(scrubbed.request).toEqual({ method: "POST", url: "https://pattrnx.app/log" });
    expect(scrubbed.user).toEqual({ id: "user-1" });
    expect(scrubbed.contexts?.nextjs).toEqual({ request_path: "/log", route_type: "render" });
    expect(scrubbed.release).toBe("abc123");
    expect(scrubbed.environment).toBe("production");
    expect(scrubbed.exception?.values?.[0]).toMatchObject({
      type: "Error",
      value: "upsert: 23514",
      stacktrace: { frames: [{ filename: "services/activities.ts", lineno: 10, vars: undefined }] },
    });
    expect(scrubbed.breadcrumbs?.[1]?.data).toEqual({
      url: "https://x.supabase.co/rest/v1/activities",
      method: "POST",
      status_code: 400,
    });
  });

  it("handles a minimal event", () => {
    expect(scrubEvent({ type: undefined })).toEqual({
      type: undefined,
      extra: undefined,
      contexts: undefined,
      request: undefined,
      user: undefined,
      breadcrumbs: undefined,
      exception: undefined,
    });
  });
});

describe("scrubBreadcrumb", () => {
  it("drops messages and non-URL data", () => {
    expect(scrubBreadcrumb({ category: "ui", message: SECRET, data: { value: SECRET } })).toEqual({ category: "ui", message: undefined, data: undefined });
  });
});
