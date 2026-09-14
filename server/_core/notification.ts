import { TRPCError } from "@trpc/server";
import { ENV } from "./env";

export type NotificationPayload = { title: string; content: string };
export async function notifyOwner(payload: NotificationPayload): Promise<boolean> {
  const title = payload.title.trim();
  const content = payload.content.trim();
  if (!title || !content) throw new TRPCError({ code: "BAD_REQUEST", message: "Notification title and content are required." });
  if (!ENV.resendApiKey || !ENV.resendFromEmail || !ENV.ownerOpenId) return false;
  const ownerEmail = ENV.ownerOpenId.startsWith("email:") ? ENV.ownerOpenId.slice(6) : ENV.ownerOpenId;
  if (!ownerEmail.includes("@")) return false;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { Authorization: `Bearer ${ENV.resendApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: ENV.resendFromEmail, to: [ownerEmail], subject: title, text: content }),
  });
  return response.ok;
}
