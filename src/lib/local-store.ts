import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  createHash,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { invitationSchema, validateSelection } from "./model";
import type { Invitation, GuestResponse, SavedResponse } from "./types";

const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
type InvitationRow = {
  id: string;
  owner_id: string;
  payload: string;
  status: Invitation["status"];
  version: number;
  share_token: string | null;
  expires_at: string | null;
  created_at: string;
};
type ResponseRow = {
  id: string;
  invitation_id: string;
  data: string;
  edit_hash: string;
  idempotency_hash: string;
};
export class LocalStore {
  readonly db: DatabaseSync;
  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path, { timeout: 5000 });
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
      CREATE TABLE IF NOT EXISTS local_users(id TEXT PRIMARY KEY,email TEXT UNIQUE,password_hash TEXT,salt TEXT);
      CREATE TABLE IF NOT EXISTS local_sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES local_users(id) ON DELETE CASCADE,expires_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS local_settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS local_invitations(id TEXT PRIMARY KEY,owner_id TEXT NOT NULL REFERENCES local_users(id),payload TEXT NOT NULL,status TEXT NOT NULL,version INTEGER NOT NULL,share_token TEXT UNIQUE,expires_at TEXT,created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS local_responses(id TEXT PRIMARY KEY,invitation_id TEXT UNIQUE NOT NULL REFERENCES local_invitations(id) ON DELETE CASCADE,data TEXT NOT NULL,edit_hash TEXT UNIQUE NOT NULL,idempotency_hash TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS local_limits(key TEXT PRIMARY KEY,count INTEGER NOT NULL,expires_at INTEGER NOT NULL);`);
    this.db
      .prepare("INSERT OR IGNORE INTO local_settings VALUES (?,?)")
      .run("edit_secret", randomBytes(32).toString("base64url"));
  }
  secret() {
    return (
      this.db
        .prepare("SELECT value FROM local_settings WHERE key=?")
        .get("edit_secret") as { value: string }
    ).value;
  }
  private transaction<T>(work: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const result = work();
      this.db.exec("COMMIT");
      return result;
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
  private session(userId: string) {
    const token = randomBytes(32).toString("base64url");
    this.db
      .prepare("DELETE FROM local_sessions WHERE expires_at<=?")
      .run(Date.now());
    this.db
      .prepare("INSERT INTO local_sessions VALUES (?,?,?)")
      .run(digest(token), userId, Date.now() + 30 * 86400000);
    return token;
  }
  signup(email: string, password: string) {
    const canonical = email.trim().toLowerCase(),
      salt = randomBytes(16).toString("hex");
    if (
      this.db.prepare("SELECT id FROM local_users WHERE email=?").get(canonical)
    )
      throw new Error("account_exists");
    const id = randomUUID();
    this.db
      .prepare("INSERT INTO local_users VALUES (?,?,?,?)")
      .run(id, canonical, scryptSync(password, salt, 64).toString("hex"), salt);
    return this.session(id);
  }
  continueOnComputer() {
    const id = randomUUID();
    this.db.prepare("INSERT INTO local_users(id) VALUES (?)").run(id);
    return this.session(id);
  }
  signin(email: string, password: string) {
    const row = this.db
      .prepare("SELECT * FROM local_users WHERE email=?")
      .get(email.trim().toLowerCase()) as
      { id: string; password_hash: string; salt: string } | undefined;
    const candidate = scryptSync(
      password,
      row?.salt || "unknown-local-user",
      64,
    );
    if (
      !row ||
      !timingSafeEqual(candidate, Buffer.from(row.password_hash, "hex"))
    )
      throw new Error("unauthorized");
    return this.session(row.id);
  }
  user(token: string | undefined) {
    if (!token) return null;
    const row = this.db
      .prepare(
        "SELECT user_id FROM local_sessions WHERE token_hash=? AND expires_at>?",
      )
      .get(digest(token), Date.now()) as { user_id: string } | undefined;
    return row ? { id: row.user_id } : null;
  }
  signout(token: string | undefined) {
    if (token)
      this.db
        .prepare("DELETE FROM local_sessions WHERE token_hash=?")
        .run(digest(token));
  }
  private invitation(row: InvitationRow): Invitation {
    return {
      ...JSON.parse(row.payload),
      id: row.id,
      status: row.status,
      version: row.version,
      expires_at: row.expires_at || undefined,
      created_at: row.created_at,
    };
  }
  private usable(row: InvitationRow | undefined) {
    if (
      !row ||
      row.status !== "published" ||
      !row.expires_at ||
      Date.parse(row.expires_at) <= Date.now()
    )
      throw new Error("unavailable");
    return this.invitation(row);
  }
  draft(owner: string, id: string) {
    const row = this.db
      .prepare(
        "SELECT * FROM local_invitations WHERE id=? AND owner_id=? AND status='draft'",
      )
      .get(id, owner) as InvitationRow | undefined;
    return row ? this.invitation(row) : null;
  }
  list(owner: string) {
    const rows = this.db
      .prepare(
        "SELECT * FROM local_invitations WHERE owner_id=? ORDER BY created_at DESC",
      )
      .all(owner) as InvitationRow[];
    const replies = this.db
      .prepare(
        "SELECT r.data FROM local_responses r JOIN local_invitations i ON i.id=r.invitation_id WHERE i.owner_id=?",
      )
      .all(owner) as { data: string }[];
    return {
      invitations: rows.map((row) => ({
        ...this.invitation(row),
        share_token: row.share_token || undefined,
      })),
      responses: replies.map((row) => JSON.parse(row.data) as SavedResponse),
    };
  }
  save(owner: string, input: unknown, publish: boolean, token: string | null) {
    const payload = invitationSchema.parse(input);
    return this.transaction(() => {
      const row = this.db
        .prepare("SELECT * FROM local_invitations WHERE id=?")
        .get(payload.id) as InvitationRow | undefined;
      if (row && (row.owner_id !== owner || row.status !== "draft"))
        throw new Error("invitation_not_editable");
      const expires = publish
        ? new Date(Date.now() + payload.expiry_days * 86400000).toISOString()
        : null;
      this.db
        .prepare(
          `INSERT INTO local_invitations VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,status=excluded.status,version=excluded.version,share_token=excluded.share_token,expires_at=excluded.expires_at`,
        )
        .run(
          payload.id,
          owner,
          JSON.stringify(payload),
          publish ? "published" : "draft",
          row ? row.version + 1 : 1,
          token,
          expires,
          row?.created_at || new Date().toISOString(),
        );
      return payload.id;
    });
  }
  guest(token: string) {
    return this.usable(
      this.db
        .prepare("SELECT * FROM local_invitations WHERE share_token=?")
        .get(token) as InvitationRow | undefined,
    );
  }
  editable(editHash: string) {
    const row = this.db
      .prepare("SELECT * FROM local_responses WHERE edit_hash=?")
      .get(editHash) as ResponseRow | undefined;
    if (!row) throw new Error("unavailable");
    const invitation = this.usable(
      this.db
        .prepare("SELECT * FROM local_invitations WHERE id=?")
        .get(row.invitation_id) as InvitationRow | undefined,
    );
    return { invitation, response: JSON.parse(row.data) as SavedResponse };
  }
  submit(
    token: string | null,
    reply: GuestResponse,
    editHash: string,
    idempotencyHash: string,
    isEdit = false,
  ) {
    return this.transaction(() => {
      const edited = isEdit
        ? (this.db
            .prepare("SELECT * FROM local_responses WHERE edit_hash=?")
            .get(editHash) as ResponseRow | undefined)
        : undefined;
      if (isEdit && !edited) throw new Error("unavailable");
      const row = isEdit
        ? this.db
            .prepare("SELECT * FROM local_invitations WHERE id=?")
            .get(edited!.invitation_id)
        : this.db
            .prepare("SELECT * FROM local_invitations WHERE share_token=?")
            .get(token);
      const inv = this.usable(row as InvitationRow | undefined);
      validateSelection(inv, reply);
      const existing = this.db
        .prepare("SELECT * FROM local_responses WHERE invitation_id=?")
        .get(inv.id) as ResponseRow | undefined;
      if (existing && !isEdit) {
        if (existing.idempotency_hash === idempotencyHash) return existing.id;
        throw new Error("already_responded");
      }
      const previous = existing
        ? (JSON.parse(existing.data) as SavedResponse)
        : null;
      const clean: SavedResponse = {
        version: reply.version,
        choice: reply.choice,
        note: reply.note,
        idempotency_key: "",
        ...(reply.choice === "yes"
          ? {
              date_id: reply.date_id,
              time_id: reply.time_id,
              activity_id: reply.activity_id,
              flower_id: reply.flower_id,
            }
          : reply.choice === "maybe"
            ? { suggested_date: reply.suggested_date }
            : {}),
        id: previous?.id || randomUUID(),
        invitation_id: inv.id,
        created_at: previous?.created_at || new Date().toISOString(),
        snapshot: previous?.snapshot || inv,
      };
      if (existing)
        this.db
          .prepare("UPDATE local_responses SET data=? WHERE id=?")
          .run(JSON.stringify(clean), existing.id);
      else
        this.db
          .prepare("INSERT INTO local_responses VALUES (?,?,?,?,?)")
          .run(
            clean.id,
            inv.id,
            JSON.stringify(clean),
            editHash,
            idempotencyHash,
          );
      return clean.id;
    });
  }
  manage(owner: string, id: string, action: "delete" | "revoke") {
    const result =
      action === "delete"
        ? this.db
            .prepare("DELETE FROM local_invitations WHERE owner_id=? AND id=?")
            .run(owner, id)
        : this.db
            .prepare(
              "UPDATE local_invitations SET status='revoked',share_token=NULL WHERE owner_id=? AND id=?",
            )
            .run(owner, id);
    if (!result.changes) throw new Error("unavailable");
  }
  limit(key: string, max: number) {
    const now = Date.now();
    this.db
      .prepare("DELETE FROM local_limits WHERE expires_at<?")
      .run(now - 86400000);
    const row = this.db
      .prepare(
        `INSERT INTO local_limits VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires_at<=? THEN 1 ELSE count+1 END,expires_at=CASE WHEN expires_at<=? THEN excluded.expires_at ELSE expires_at END RETURNING count`,
      )
      .get(key, now + 60000, now, now) as { count: number };
    return row.count <= max;
  }
  close() {
    this.db.close();
  }
}
const globals = globalThis as typeof globalThis & {
  bloomLocalStore?: LocalStore;
};
export function localStore() {
  return (globals.bloomLocalStore ??= new LocalStore(
    process.env.BLOOMDATE_LOCAL_DB ||
      join(process.cwd(), ".data", "bloomdate.sqlite"),
  ));
}
