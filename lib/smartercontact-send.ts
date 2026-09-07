/**
 * SmarterContact outbound send is NOT implemented in this CRM.
 *
 * V1 assumption: no SC API keys, no auto-SMS from the server.
 *
 * A Grok / Playwright browser agent can:
 * 1. Open the lead deal page and read `[data-sc-draft]` / `[data-sc-phone]`.
 * 2. Paste the draft into SmarterContact and send there.
 * 3. Sync the thread back with `POST /api/messages/import` (see README).
 * 4. Optionally click **Mark sent** (or POST the outbound SMS) so the CRM thread stays complete.
 *
 * Do not add Twilio / SmarterContact send credentials to this process.
 */
export const SMARTERCONTACT_SEND_MODE = "browser-agent" as const;

export const SC_DRAFT_SELECTOR = "[data-sc-draft]";
export const SC_PHONE_SELECTOR = "[data-sc-phone]";
export const SC_COPY_SELECTOR = "[data-sc-copy]";
export const SC_MARK_SENT_SELECTOR = "[data-sc-mark-sent]";

export function smarterContactAgentHooks() {
  return {
    mode: SMARTERCONTACT_SEND_MODE,
    draft: SC_DRAFT_SELECTOR,
    phone: SC_PHONE_SELECTOR,
    copy: SC_COPY_SELECTOR,
    markSent: SC_MARK_SENT_SELECTOR
  };
}
