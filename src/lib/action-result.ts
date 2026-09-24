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

/**
 * State for forms driven by `useActionState`. Failures echo back non-secret inputs
 * so the form can re-fill them (React resets uncontrolled forms after an action).
 */
export type FormState<T = null> = (ActionResult<T> & { values?: Record<string, string> }) | null;

const SECRET_FIELDS = new Set(["password", "confirmPassword"]);

export function formFields(formData: FormData, names: readonly string[]): Record<string, string> {
  return Object.fromEntries(names.map((name) => [name, String(formData.get(name) ?? "")]));
}

export function echoValues<T>(state: FormState<T>, raw: Record<string, string>): FormState<T> {
  if (!state || state.ok) return state;
  return { ...state, values: Object.fromEntries(Object.entries(raw).filter(([key]) => !SECRET_FIELDS.has(key))) };
}

/** Field errors from a Zod failure, in the shape `ActionResult` carries. */
export function validationFailure<T = never>(fieldErrors: Record<string, string[] | undefined>): ActionResult<T> {
  return fail("validation", "Check the highlighted fields.", fieldErrors);
}
