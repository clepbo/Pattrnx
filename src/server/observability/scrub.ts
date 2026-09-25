import type { Breadcrumb, ErrorEvent } from "@sentry/nextjs";

/**
 * Strips everything that could carry personal or behavioral content from an error
 * event before it leaves the server (ARCHITECTURE.md §10, security review SR-8).
 * What's kept: the exception type, message and stack (without local variables),
 * the request method and path (no query string), release, environment and the
 * opaque user id. Belt and braces: the SDK is also configured not to collect this.
 */
export function scrubEvent(event: ErrorEvent): ErrorEvent {
  const { request, user, breadcrumbs, exception, contexts } = event;
  const nextjs = contexts?.nextjs;
  return {
    ...event,
    extra: undefined,
    // The Next.js context repeats the request path, query string included.
    contexts: nextjs
      ? { ...contexts, nextjs: { ...nextjs, request_path: stripQuery(nextjs.request_path as string | undefined) } }
      : contexts,
    request: request ? { method: request.method, url: stripQuery(request.url) } : undefined,
    user: user?.id ? { id: user.id } : undefined,
    breadcrumbs: breadcrumbs?.map(scrubBreadcrumb),
    exception: exception && {
      ...exception,
      values: exception.values?.map((value) => ({
        ...value,
        stacktrace: value.stacktrace && {
          ...value.stacktrace,
          frames: value.stacktrace.frames?.map((frame) => ({ ...frame, vars: undefined })),
        },
      })),
    },
  };
}

/** Keeps a breadcrumb's category, level and timing; never its message, payload or query string. */
export function scrubBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb {
  const { data } = breadcrumb;
  const url = typeof data?.url === "string" ? stripQuery(data.url) : undefined;
  const method = typeof data?.method === "string" ? data.method : undefined;
  const statusCode = typeof data?.status_code === "number" ? data.status_code : undefined;
  return { ...breadcrumb, message: undefined, data: url ? { url, method, status_code: statusCode } : undefined };
}

function stripQuery(url: string | undefined): string | undefined {
  return url?.split(/[?#]/, 1)[0];
}
