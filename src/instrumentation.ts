import type { Instrumentation } from "next";

/**
 * Server-side error reporting (ARCHITECTURE.md §10, SR-8). Off unless SENTRY_DSN is
 * set, so local, CI and preview builds send nothing by default. Errors only: no
 * tracing, no session replay, no client SDK.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || !process.env.SENTRY_DSN) return;
  const [Sentry, { scrubBreadcrumb, scrubEvent }] = await Promise.all([
    import("@sentry/nextjs"),
    import("@/server/observability/scrub"),
  ]);
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    release: process.env.VERCEL_GIT_COMMIT_SHA,
    tracesSampleRate: 0,
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      databaseQueryData: false,
      stackFrameVariables: false,
      genAI: { inputs: false, outputs: false },
    },
    beforeSend: scrubEvent,
    beforeBreadcrumb: scrubBreadcrumb,
  });
}

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (!process.env.SENTRY_DSN) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(error, request, context);
};
