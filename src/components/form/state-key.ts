import type { FormState } from "@/lib/action-result";

const keys = new WeakMap<object, number>();
let counter = 0;

/**
 * A key that changes with every action result. React 19 resets a form after its
 * action runs, which desyncs controlled inputs (radios, selects) from React state.
 * Keying the form body on this remounts it so every field re-reads its default:
 * echoed values after a failure, blanks after a success.
 */
export function stateKey(state: FormState<unknown>): number {
  if (!state) return 0;
  let key = keys.get(state);
  if (key === undefined) {
    key = ++counter;
    keys.set(state, key);
  }
  return key;
}
