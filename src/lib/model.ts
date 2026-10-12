import { z } from "zod";
import type { Invitation, GuestResponse } from "./types";
const uuid = z.uuid();
const label = z.string().trim().min(1).max(80);
export const invitationSchema = z
  .object({
    id: uuid,
    sender: z.string().trim().min(1).max(60),
    partner: z.string().trim().min(1).max(60),
    title: z.string().trim().min(1).max(120),
    message: z.string().trim().min(1).max(2000),
    language: z.enum(["en", "ms"]),
    theme: z.enum(["blush", "midnight", "lavender"]),
    fun_mode: z.boolean(),
    timezone: z.literal("Asia/Kuala_Lumpur"),
    dates: z
      .array(
        z.object({
          id: uuid,
          date: z.iso.date(),
          times: z
            .array(
              z.object({
                id: uuid,
                time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
              }),
            )
            .min(1)
            .max(12),
        }),
      )
      .min(1)
      .max(20),
    activities: z
      .array(z.object({ id: uuid, label }))
      .min(1)
      .max(12),
    flowers: z.array(z.object({ id: uuid, label })).max(12),
    meeting_place: z.string().trim().max(200),
    closing: z.string().trim().max(500),
    allow_suggestion: z.boolean(),
    expiry_days: z.number().int().min(1).max(90),
  })
  .superRefine((v, ctx) => {
    const ids = [
      ...v.dates.flatMap((d) => [d.id, ...d.times.map((t) => t.id)]),
      ...v.activities.map((a) => a.id),
      ...v.flowers.map((f) => f.id),
    ];
    if (new Set(ids).size !== ids.length)
      ctx.addIssue({
        code: "custom",
        message: "Every option must have a unique ID.",
      });
    if (new Set(v.dates.map((d) => d.date)).size !== v.dates.length)
      ctx.addIssue({ code: "custom", message: "Choose each date only once." });
    for (const d of v.dates) {
      if (new Set(d.times.map((t) => t.time)).size !== d.times.length)
        ctx.addIssue({
          code: "custom",
          message: "Choose each time only once.",
        });
      if (
        d.times.some(
          (t) =>
            new Date(`${d.date}T${t.time}:00+08:00`).getTime() <= Date.now(),
        )
      )
        ctx.addIssue({
          code: "custom",
          message: "Please choose future dates and times.",
        });
    }
  });
export const responseSchema = z.object({
  version: z.number().int().positive(),
  choice: z.enum(["yes", "maybe", "no"]),
  date_id: uuid.optional(),
  time_id: uuid.optional(),
  activity_id: uuid.optional(),
  flower_id: uuid.optional(),
  suggested_date: z.iso.date().optional(),
  note: z.string().trim().max(1000),
  idempotency_key: uuid,
});
export const messages = [
  { en: "Are you sure? 🥺", ms: "🥺 Eh tunggu...", growth: 1.1 },
  { en: "Maybe give me one chance? 🌹", ms: "😭 Bagi peluang...", growth: 1.2 },
  {
    en: "I planned this with you in mind 💌",
    ms: "🌹 Satu date je...",
    growth: 1.35,
  },
  {
    en: "Okay okay... last question 😇",
    ms: "☕ Saya belanja kopi...",
    growth: 1.5,
  },
  {
    en: "💍 Not a proposal just yet!",
    ms: "💍 Eh bukan proposal lagi ni!",
    growth: 1.7,
  },
];
export const MAX_ESCAPES = 4;
export function optionLabel(label: string | undefined, lang: string) {
  if (!label) return "";
  const ms: Record<string, string> = {
    "Dinner together": "Makan malam bersama",
    "Café date": "Janji temu kafe",
    "Movie night": "Malam filem",
    Picnic: "Berkelah",
    "Flower garden visit": "Taman bunga",
    "Sunset walk": "Berjalan waktu senja",
    "Surprise me": "Kejutkan saya",
    Roses: "Ros",
    Tulips: "Tulip",
    Sunflowers: "Bunga matahari",
    Lilies: "Lili",
    "No flowers, just you": "Tanpa bunga, hanya awak",
  };
  return lang === "ms" ? ms[label] || label : label;
}
export function playfulState(attempt: number) {
  const bounded = Math.max(0, Math.min(10, attempt));
  return {
    attempt: bounded,
    canMove: bounded < MAX_ESCAPES,
    growth: bounded ? messages[Math.min(bounded - 1, 4)].growth : 1,
    showWarning: bounded === 10,
  };
}
export function todayKL() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export function formatDate(date: string, lang = "en") {
  return new Intl.DateTimeFormat(lang === "ms" ? "ms-MY" : "en-GB", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kuala_Lumpur",
  }).format(new Date(`${date}T12:00:00+08:00`));
}
export function timeLabel(time: string) {
  const [h, m] = time.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}
export function validateSelection(inv: Invitation, r: GuestResponse) {
  if (r.version !== inv.version)
    throw new Error("This invitation changed. Please refresh before replying.");
  if (r.choice === "yes") {
    const date = inv.dates.find((d) => d.id === r.date_id);
    if (!date || !date.times.some((t) => t.id === r.time_id))
      throw new Error("Choose an available date and its matching time.");
    const time = date.times.find((t) => t.id === r.time_id)!;
    if (new Date(`${date.date}T${time.time}:00+08:00`).getTime() <= Date.now())
      throw new Error("That time has passed. Please choose another.");
    if (!inv.activities.some((a) => a.id === r.activity_id))
      throw new Error("Choose an available activity.");
    if (r.flower_id && !inv.flowers.some((f) => f.id === r.flower_id))
      throw new Error("Choose an available flower preference.");
  }
  if (
    r.choice === "maybe" &&
    (!inv.allow_suggestion ||
      !r.suggested_date ||
      r.suggested_date <= todayKL())
  )
    throw new Error("Please suggest a future date.");
}
