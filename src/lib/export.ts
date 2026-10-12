import type { Invitation, GuestResponse } from "./types";
import { formatDate, timeLabel } from "./model";
export function planDetails(inv: Invitation, r: GuestResponse) {
  const d = inv.dates.find((d) => d.id === r.date_id);
  const t = d?.times.find((t) => t.id === r.time_id);
  return {
    date: d?.date,
    time: t?.time,
    activity: inv.activities.find((a) => a.id === r.activity_id)?.label,
    flower: inv.flowers.find((f) => f.id === r.flower_id)?.label,
  };
}
function escapeICS(s: string) {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}
function stamp(date: Date) {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}
// Fold at 75 UTF-8 octets as required by RFC 5545 (including continuation spaces).
function fold(s: string) {
  let out = "",
    line = "";
  for (const c of s) {
    if (new TextEncoder().encode(line + c).length > 75) {
      out += line + "\r\n";
      line = " ";
    }
    line += c;
  }
  return out + line;
}
export function calendarICS(inv: Invitation, r: GuestResponse) {
  const p = planDetails(inv, r);
  if (r.choice !== "yes" || !p.date || !p.time)
    throw new Error("A confirmed date and time are required.");
  const start = new Date(`${p.date}T${p.time}:00+08:00`);
  return (
    [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//BloomDate//A Beautiful Date//EN",
      "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      `UID:${inv.id}@bloomdate.app`,
      `DTSTAMP:${stamp(new Date())}`,
      `DTSTART:${stamp(start)}`,
      `DTEND:${stamp(new Date(start.getTime() + 2 * 3600000))}`,
      `SUMMARY:${escapeICS(`${inv.sender} & ${inv.partner} — ${p.activity}`)}`,
      `LOCATION:${escapeICS(inv.meeting_place)}`,
      `DESCRIPTION:${escapeICS(`Planned in Asia/Kuala_Lumpur. ${r.note}`)}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ]
      .map(fold)
      .join("\r\n") + "\r\n"
  );
}
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function downloadCalendar(inv: Invitation, r: GuestResponse) {
  download(
    new Blob([calendarICS(inv, r)], { type: "text/calendar;charset=utf-8" }),
    "our-date.ics",
  );
}
export async function downloadCard(inv: Invitation, r: GuestResponse) {
  await document.fonts.ready;
  const p = planDetails(inv, r);
  if (r.choice !== "yes" || !p.date || !p.time)
    throw new Error("A confirmed plan is required.");
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  const c = canvas.getContext("2d");
  if (!c) throw new Error("Canvas is unavailable.");
  const blocks = [
    {
      text: `${inv.sender} & ${inv.partner}`,
      font: "48px Georgia",
      color: "#672d42",
    },
    {
      text: formatDate(p.date, inv.language),
      font: "32px sans-serif",
      color: "#35292e",
    },
    {
      text: `${timeLabel(p.time)} · Asia/Kuala_Lumpur`,
      font: "28px sans-serif",
      color: "#35292e",
    },
    { text: p.activity || "", font: "34px Georgia", color: "#672d42" },
    {
      text: p.flower ? `Flower preference: ${p.flower}` : "",
      font: "26px sans-serif",
      color: "#35292e",
    },
    { text: inv.meeting_place, font: "26px sans-serif", color: "#35292e" },
    { text: r.note, font: "25px Georgia", color: "#672d42" },
  ]
    .filter((b) => b.text)
    .map((b) => {
      c.font = b.font;
      const lines: string[] = [];
      let line = "";
      // Character wrapping also handles long unbroken custom labels and messages.
      for (const char of b.text) {
        if (char === "\n" || c.measureText(line + char).width > 860) {
          lines.push(line.trim());
          line = "";
          if (char === "\n") continue;
        }
        line += char;
      }
      if (line) lines.push(line.trim());
      return { ...b, lines };
    });
  canvas.height = Math.max(
    1350,
    360 + blocks.reduce((n, b) => n + b.lines.length * 52 + 24, 0) + 160,
  );
  c.fillStyle = "#fff9f2";
  c.fillRect(0, 0, 1080, canvas.height);
  c.strokeStyle = "#dabcc5";
  c.lineWidth = 2;
  c.strokeRect(45, 45, 990, canvas.height - 90);
  c.textAlign = "center";
  c.fillStyle = "#b94d6d";
  c.font = "24px sans-serif";
  c.fillText("B L O O M D A T E", 540, 140);
  c.font = "70px Georgia";
  c.fillText("A beautiful date.", 540, 270);
  let y = 360;
  for (const b of blocks) {
    c.font = b.font;
    c.fillStyle = b.color;
    for (const line of b.lines) {
      c.fillText(line, 540, y);
      y += 52;
    }
    y += 24;
  }
  c.font = "22px sans-serif";
  c.fillStyle = "#b94d6d";
  c.fillText(
    "A little invitation. A beautiful memory.",
    540,
    canvas.height - 100,
  );
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Could not create the card."))),
      "image/png",
    ),
  );
  download(blob, "our-date.png");
}
