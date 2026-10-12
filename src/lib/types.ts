export type Language = "en" | "ms";
export type DateOption = {
  id: string;
  date: string;
  times: { id: string; time: string }[];
};
export type Option = { id: string; label: string };
export type Invitation = {
  id: string;
  sender: string;
  partner: string;
  title: string;
  message: string;
  language: Language;
  theme: "blush" | "midnight" | "lavender";
  fun_mode: boolean;
  timezone: "Asia/Kuala_Lumpur";
  dates: DateOption[];
  activities: Option[];
  flowers: Option[];
  meeting_place: string;
  closing: string;
  allow_suggestion: boolean;
  expiry_days: number;
  status: "draft" | "published" | "revoked";
  version: number;
  expires_at?: string;
  share_token?: string;
  responded?: boolean;
  created_at?: string;
};
export type GuestResponse = {
  id?: string;
  invitation_id?: string;
  version: number;
  choice: "yes" | "maybe" | "no";
  date_id?: string;
  time_id?: string;
  activity_id?: string;
  flower_id?: string;
  suggested_date?: string;
  note: string;
  idempotency_key: string;
};
export type SavedResponse = GuestResponse & {
  id: string;
  created_at: string;
  snapshot: Invitation;
};
