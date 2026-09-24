/** The return shape of every server action (ARCHITECTURE.md §5.2). */
export type ActionErrorCode = "validation" | "unauthorized" | "not_found" | "conflict" | "limit" | "unexpected";

export type ActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: { code: ActionErrorCode; message: string; fields?: Record<string, string[] | undefined> };
    };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail<T = never>(
  code: ActionErrorCode,
  message: string,
  fields?: Record<string, string[] | undefined>,
): ActionResult<T> {
  return { ok: false, error: { code, message, fields } };
}
