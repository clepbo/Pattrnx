import { MAILPIT_URL } from "./local-supabase";

type MailpitSearch = { messages: { ID: string }[] };
type MailpitMessage = { HTML: string };

/** Polls the local Mailpit inbox and returns the first link in the newest email to `to`. */
export async function latestEmailLink(to: string, timeoutMs = 15_000): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const search = (await (
      await fetch(`${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`)
    ).json()) as MailpitSearch;
    const id = search.messages?.[0]?.ID;
    if (id) {
      const message = (await (await fetch(`${MAILPIT_URL}/api/v1/message/${id}`)).json()) as MailpitMessage;
      const href = /href="([^"]+)"/.exec(message.HTML)?.[1];
      if (href) return href.replaceAll("&amp;", "&");
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`No email for ${to} within ${timeoutMs}ms`);
}
