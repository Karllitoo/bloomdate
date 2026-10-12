import type { Invitation } from "./types";
export function demoInvitation(): Invitation {
  const id = (n: number) =>
    `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  const date = (days: number) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  };
  return {
    id: id(1),
    sender: "Adam",
    partner: "Alya",
    title: "A little time, just us.",
    message:
      "Between busy days and all the little things, you are still my favourite part. I thought we could slow down, find a cosy corner, and make a little memory together. What do you say?",
    language: "en",
    theme: "blush",
    fun_mode: true,
    timezone: "Asia/Kuala_Lumpur",
    dates: [3, 5, 7].map((n, i) => ({
      id: id(10 + i),
      date: date(n),
      times: [
        { id: id(20 + i * 2), time: "17:00" },
        { id: id(21 + i * 2), time: "19:30" },
      ],
    })),
    activities: [
      { id: id(30), label: "Café date" },
      { id: id(31), label: "Dinner together" },
      { id: id(32), label: "Sunset walk" },
    ],
    flowers: [
      { id: id(40), label: "Tulips" },
      { id: id(41), label: "Roses" },
      { id: id(42), label: "No flowers, just you" },
    ],
    meeting_place: "Somewhere cosy in Kuala Lumpur",
    closing: "A little coffee, a lot of you. ♡",
    allow_suggestion: true,
    expiry_days: 14,
    status: "published",
    version: 1,
  };
}
