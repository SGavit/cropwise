import { and, asc, desc, eq, isNull, lt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { accountSettings, cropAlertThresholds, cropCalendarReminders, cropScanShares, farmProfiles, InsertAccountSetting, InsertCropAlertThreshold, InsertCropCalendarReminder, InsertFarmProfile, InsertPrivateCropScan, InsertUser, passwordCredentials, PasswordResetToken, passwordResetTokens, privateCropScans, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return rows[0];
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function createCropScanShare(input: { slug: string; payload: string; expiresAt: Date }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available for sharing scan results.");

  await db.insert(cropScanShares).values(input);
  return input;
}

export async function getActiveCropScanShare(slug: string) {
  const db = await getDb();
  if (!db) return undefined;

  const results = await db.select().from(cropScanShares).where(eq(cropScanShares.slug, slug)).limit(1);
  const share = results[0];
  if (!share || share.expiresAt.getTime() <= Date.now()) return undefined;
  return share;
}

export async function getFarmProfile(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const profiles = await db.select().from(farmProfiles).where(eq(farmProfiles.userId, userId)).limit(1);
  return profiles[0] ?? null;
}

export async function saveFarmProfile(profile: InsertFarmProfile) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available for farm profiles.");
  await db.insert(farmProfiles).values(profile).onDuplicateKeyUpdate({
    set: {
      village: profile.village,
      district: profile.district,
      state: profile.state,
      cropPreferences: profile.cropPreferences,
      cropAreaAllocations: profile.cropAreaAllocations ?? null,
      language: profile.language,
    },
  });
  return getFarmProfile(profile.userId);
}

export async function createPrivateCropScan(scan: InsertPrivateCropScan) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available for private crop scan history.");
  await db.insert(privateCropScans).values(scan);
}

export async function listPrivateCropScans(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: privateCropScans.id,
    cropName: privateCropScans.cropName,
    localName: privateCropScans.localName,
    healthStatus: privateCropScans.healthStatus,
    overview: privateCropScans.overview,
    imageUrl: privateCropScans.imageUrl,
    createdAt: privateCropScans.createdAt,
  }).from(privateCropScans).where(eq(privateCropScans.userId, userId)).orderBy(desc(privateCropScans.createdAt)).limit(24);
}

export async function listCropCalendarReminders(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(cropCalendarReminders).where(eq(cropCalendarReminders.userId, userId)).orderBy(asc(cropCalendarReminders.dueAt)).limit(80);
}

export async function createCropCalendarReminder(reminder: InsertCropCalendarReminder) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available for crop-calendar reminders.");
  await db.insert(cropCalendarReminders).values(reminder);
  return listCropCalendarReminders(reminder.userId);
}

export async function setCropCalendarReminderStatus(input: { userId: number; id: number; status: "upcoming" | "completed" }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available for crop-calendar reminders.");
  await db.update(cropCalendarReminders).set({ status: input.status }).where(and(eq(cropCalendarReminders.id, input.id), eq(cropCalendarReminders.userId, input.userId)));
  return listCropCalendarReminders(input.userId);
}

export async function listCropAlertThresholds(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(cropAlertThresholds).where(eq(cropAlertThresholds.userId, userId)).orderBy(asc(cropAlertThresholds.cropName));
}

export async function saveCropAlertThreshold(threshold: InsertCropAlertThreshold) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available for Crop Wealth Watch settings.");
  await db.insert(cropAlertThresholds).values(threshold).onDuplicateKeyUpdate({
    set: {
      priceFloor: threshold.priceFloor,
      rainChance: threshold.rainChance,
      soilMoistureMinimum: threshold.soilMoistureMinimum,
    },
  });
  return listCropAlertThresholds(threshold.userId);
}


export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0];
}

export async function updateUserDisplayName(userId: number, name: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available for profile updates.");
  await db.update(users).set({ name }).where(eq(users.id, userId));
  return getUserById(userId);
}

export async function updateUserAvatar(userId: number, avatarKey: string | null) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available for profile updates.");
  await db.update(users).set({ avatarKey }).where(eq(users.id, userId));
  return getUserById(userId);
}

export async function getPasswordCredentialByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(passwordCredentials).where(eq(passwordCredentials.email, email)).limit(1);
  return rows[0];
}

export async function createPasswordCredential(input: { userId: number; email: string; passwordHash: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available for password credentials.");
  await db.insert(passwordCredentials).values(input);
  return getPasswordCredentialByEmail(input.email);
}

export async function createPasswordResetToken(input: { userId: number; tokenHash: string; expiresAt: Date }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available for password reset.");
  await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(and(eq(passwordResetTokens.userId, input.userId), isNull(passwordResetTokens.usedAt)));
  await db.insert(passwordResetTokens).values(input);
  return input;
}

export async function getActivePasswordResetToken(tokenHash: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(passwordResetTokens).where(and(eq(passwordResetTokens.tokenHash, tokenHash), isNull(passwordResetTokens.usedAt))).limit(1);
  const token = rows[0];
  if (!token || token.expiresAt.getTime() <= Date.now()) return undefined;
  return token;
}

export async function markPasswordResetTokenUsed(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available for password reset.");
  await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, id));
}

export async function updatePasswordCredential(userId: number, passwordHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available for password credentials.");
  await db.update(passwordCredentials).set({ passwordHash }).where(eq(passwordCredentials.userId, userId));
}

export async function getAccountSettings(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(accountSettings).where(eq(accountSettings.userId, userId)).limit(1);
  return rows[0] ?? null;
}

export async function saveAccountSettings(input: InsertAccountSetting) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available for account settings.");
  await db.insert(accountSettings).values(input).onDuplicateKeyUpdate({
    set: {
      scanRetentionDays: input.scanRetentionDays,
      reminderRetentionDays: input.reminderRetentionDays,
    },
  });
  return getAccountSettings(input.userId);
}

export async function deleteUserAccount(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available for account deletion.");
  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
  await db.delete(passwordCredentials).where(eq(passwordCredentials.userId, userId));
  await db.delete(accountSettings).where(eq(accountSettings.userId, userId));
  await db.delete(cropAlertThresholds).where(eq(cropAlertThresholds.userId, userId));
  await db.delete(cropCalendarReminders).where(eq(cropCalendarReminders.userId, userId));
  await db.delete(privateCropScans).where(eq(privateCropScans.userId, userId));
  await db.delete(farmProfiles).where(eq(farmProfiles.userId, userId));
  await db.delete(users).where(eq(users.id, userId));
}

export async function purgeExpiredPrivateData(now = new Date()) {
  const db = await getDb();
  if (!db) return;
  const settings = await db.select().from(accountSettings);
  for (const setting of settings) {
    const scanCutoff = new Date(now.getTime() - setting.scanRetentionDays * 24 * 60 * 60 * 1000);
    const reminderCutoff = new Date(now.getTime() - setting.reminderRetentionDays * 24 * 60 * 60 * 1000);
    await db.delete(privateCropScans).where(and(eq(privateCropScans.userId, setting.userId), lt(privateCropScans.createdAt, scanCutoff)));
    await db.delete(cropCalendarReminders).where(and(eq(cropCalendarReminders.userId, setting.userId), lt(cropCalendarReminders.createdAt, reminderCutoff)));
  }
}
