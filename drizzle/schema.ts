import { int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  /** Storage key for the account avatar; image bytes remain in S3-backed storage. */
  avatarKey: varchar("avatarKey", { length: 2048 }),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/** Local email/password credentials are separate from external OAuth identity data. */
export const passwordCredentials = mysqlTable("passwordCredentials", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: text("passwordHash").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PasswordCredential = typeof passwordCredentials.$inferSelect;
export type InsertPasswordCredential = typeof passwordCredentials.$inferInsert;

/** Single-use, expiring reset-token hashes; raw tokens are never persisted. */
export const passwordResetTokens = mysqlTable("passwordResetTokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  tokenHash: varchar("tokenHash", { length: 128 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;

/** Per-user data-retention preferences for private CropWise records. */
export const accountSettings = mysqlTable("accountSettings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  scanRetentionDays: int("scanRetentionDays").default(365).notNull(),
  reminderRetentionDays: int("reminderRetentionDays").default(365).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AccountSetting = typeof accountSettings.$inferSelect;
export type InsertAccountSetting = typeof accountSettings.$inferInsert;

/**
 * A deliberately shared, text-only crop scan summary. Source photos are never
 * placed in this table, so sharing a result does not expose the uploaded image.
 */
export const cropScanShares = mysqlTable("cropScanShares", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 32 }).notNull().unique(),
  payload: text("payload").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
});

export type CropScanShare = typeof cropScanShares.$inferSelect;

/**
 * Private farm settings for a signed-in grower. This record is never exposed
 * through the public scan-sharing route.
 */
export const farmProfiles = mysqlTable("farmProfiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  village: varchar("village", { length: 80 }).notNull(),
  district: varchar("district", { length: 80 }).notNull(),
  state: varchar("state", { length: 80 }).notNull(),
  cropPreferences: text("cropPreferences").notNull(),
  /** JSON-encoded normalized crop-plan allocation and total farm area. */
  cropAreaAllocations: text("cropAreaAllocations"),
  language: mysqlEnum("language", ["en", "hi", "mr"]).default("en").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("farmProfiles_userId_unique").on(table.userId)]);

export type FarmProfile = typeof farmProfiles.$inferSelect;
export type InsertFarmProfile = typeof farmProfiles.$inferInsert;

/**
 * A signed-in user’s private scan record. The public-share system stores a
 * separate text-only snapshot; private history remains scoped to userId.
 */
export const privateCropScans = mysqlTable("privateCropScans", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  cropName: varchar("cropName", { length: 80 }).notNull(),
  localName: varchar("localName", { length: 80 }).notNull(),
  healthStatus: mysqlEnum("healthStatus", ["healthy", "attention", "uncertain"]).notNull(),
  overview: text("overview").notNull(),
  imageUrl: varchar("imageUrl", { length: 2048 }),
  payload: text("payload").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PrivateCropScan = typeof privateCropScans.$inferSelect;
export type InsertPrivateCropScan = typeof privateCropScans.$inferInsert;

/**
 * In-app farming tasks owned by one farmer. These are intentionally surfaced
 * when the farmer next opens CropWise; no background push or SMS is implied.
 */
export const cropCalendarReminders = mysqlTable("cropCalendarReminders", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  cropName: varchar("cropName", { length: 80 }).notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  details: text("details"),
  dueAt: timestamp("dueAt").notNull(),
  status: mysqlEnum("status", ["upcoming", "completed"]).default("upcoming").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CropCalendarReminder = typeof cropCalendarReminders.$inferSelect;
export type InsertCropCalendarReminder = typeof cropCalendarReminders.$inferInsert;

/**
 * Per-crop guardrails a farmer chooses for the Wealth Watch view. These are
 * private preferences, not market forecasts or automated trading instructions.
 */
export const cropAlertThresholds = mysqlTable("cropAlertThresholds", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  cropName: varchar("cropName", { length: 80 }).notNull(),
  priceFloor: int("priceFloor").notNull(),
  rainChance: int("rainChance").notNull(),
  soilMoistureMinimum: int("soilMoistureMinimum").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("cropAlertThresholds_user_crop_unique").on(table.userId, table.cropName)]);

export type CropAlertThreshold = typeof cropAlertThresholds.$inferSelect;
export type InsertCropAlertThreshold = typeof cropAlertThresholds.$inferInsert;
