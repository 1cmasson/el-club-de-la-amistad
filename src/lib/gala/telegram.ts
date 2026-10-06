import { createHmac, timingSafeEqual } from "node:crypto";
import type { GuestPhoto, PhotoStatus, TelegramMessageRef } from "./store";

/*
 * Moderation happens in Telegram, through the club's existing bot
 * (@ClubAmistadHialeah_bot). That bot is long-polled by the Postiz bridge, so
 * this code must never set a webhook or read updates — either would break the
 * bridge. It only *sends*: a photo with URL buttons that open a signed
 * /api/gala/moderate link. A URL-button tap produces no update, so the bridge
 * never sees these messages' buttons at all.
 *
 * Env:
 *   GALA_TELEGRAM_BOT_TOKEN  the bot's token
 *   GALA_TELEGRAM_CHAT_IDS   comma-separated chat ids that get each upload
 *   GALA_SECRET              signs the approve/reject links
 */

export type ModerationAction = "approve" | "reject";

const token = () => process.env.GALA_TELEGRAM_BOT_TOKEN ?? "";
const chatIds = () =>
  (process.env.GALA_TELEGRAM_CHAT_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

function secret() {
  const s = process.env.GALA_SECRET;
  if (!s) throw new Error("GALA_SECRET is not set");
  return s;
}

export function sign(id: string, action: ModerationAction) {
  return createHmac("sha256", secret()).update(`${id}:${action}`).digest("base64url");
}

export function verify(id: string, action: ModerationAction, sig: string) {
  const expected = Buffer.from(sign(id, action));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** The key for the backup review page (/api/gala/review?k=…). */
export const reviewKey = () =>
  createHmac("sha256", secret()).update("review").digest("base64url").slice(0, 24);

export function isReviewKey(k: string | null) {
  if (!k) return false;
  const a = Buffer.from(reviewKey());
  const b = Buffer.from(k);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const moderateUrl = (origin: string, id: string, action: ModerationAction) =>
  `${origin}/api/gala/moderate?id=${id}&a=${action}&s=${sign(id, action)}`;

function card(photo: GuestPhoto, origin: string) {
  const who = photo.name ? `De: ${photo.name}` : "Sin nombre";
  const views: Record<PhotoStatus, { caption: string; buttons: { text: string; url: string }[][] }> = {
    pending: {
      caption: `📸 Nueva foto para la pantalla de la Gala\n${who}`,
      buttons: [
        [{ text: "✅ Aprobar", url: moderateUrl(origin, photo.id, "approve") }],
        [{ text: "❌ Rechazar", url: moderateUrl(origin, photo.id, "reject") }],
      ],
    },
    approved: {
      caption: `✅ Aprobada — ya está en la pantalla\n${who}`,
      buttons: [[{ text: "🗑 Quitar de la pantalla", url: moderateUrl(origin, photo.id, "reject") }]],
    },
    rejected: {
      caption: `❌ Rechazada — no se muestra\n${who}`,
      buttons: [[{ text: "↩️ Aprobar de todos modos", url: moderateUrl(origin, photo.id, "approve") }]],
    },
  };
  const v = views[photo.status];
  return { caption: v.caption, reply_markup: { inline_keyboard: v.buttons } };
}

// Telegram allows about one message a second per chat; past that it answers
// 429 with how long to wait. A burst of guests scanning at once hits that, so
// wait it out a couple of times rather than leave a photo nobody can approve.
const MAX_RETRY_WAIT_S = 4;

async function call(method: string, body: () => BodyInit, json = false) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`https://api.telegram.org/bot${token()}/${method}`, {
      method: "POST",
      headers: json ? { "Content-Type": "application/json" } : undefined,
      body: body(),
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      description?: string;
      parameters?: { retry_after?: number };
      result?: { message_id: number };
    };
    if (res.ok && data.ok) return data.result;
    const wait = data.parameters?.retry_after;
    if (res.status === 429 && wait && wait <= MAX_RETRY_WAIT_S && attempt < 2) {
      await new Promise((r) => setTimeout(r, wait * 1000));
      continue;
    }
    throw new Error(`Telegram ${method} -> ${res.status} ${data.description ?? ""}`);
  }
}

/** Sends the photo to every moderator. Returns the messages it managed to send. */
export async function announce(
  photo: GuestPhoto,
  bytes: ArrayBuffer,
  origin: string,
): Promise<TelegramMessageRef[]> {
  if (!token() || chatIds().length === 0) {
    console.error("Gala Telegram is not configured; photo left pending", photo.id);
    return [];
  }
  const { caption, reply_markup } = card(photo, origin);
  const sent: TelegramMessageRef[] = [];
  for (const chatId of chatIds()) {
    const form = () => {
      const f = new FormData();
      f.append("chat_id", chatId);
      f.append("photo", new Blob([bytes], { type: photo.contentType }), "foto.jpg");
      f.append("caption", caption);
      f.append("reply_markup", JSON.stringify(reply_markup));
      return f;
    };
    try {
      const msg = await call("sendPhoto", form);
      if (msg) sent.push({ chatId, messageId: msg.message_id });
    } catch (err) {
      console.error("Gala Telegram sendPhoto failed", chatId, err);
    }
  }
  return sent;
}

/** Re-labels every moderator's copy so all phones agree on the photo's state. */
export async function refreshCards(photo: GuestPhoto, origin: string) {
  const { caption, reply_markup } = card(photo, origin);
  await Promise.all(
    photo.telegram.map(({ chatId, messageId }) =>
      call(
        "editMessageCaption",
        () => JSON.stringify({ chat_id: chatId, message_id: messageId, caption, reply_markup }),
        true,
      ).catch((err) => {
        if (!/not modified/i.test(String(err))) console.error("Gala Telegram edit failed", err);
      }),
    ),
  );
}
