import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import {
  allowAnonymousQuickScan,
  analyzeCropPhoto,
  analyzeCropPhotoWithoutStorage,
  CropPhotoValidationError,
  cropAnalysisResultSchema,
  cropPhotoInputSchema,
} from "./cropAnalysis";
import { createCropCalendarReminder, createCropScanShare, createPasswordCredential, createPasswordResetToken, createPrivateCropScan, deleteUserAccount, getAccountSettings, getActiveCropScanShare, getActivePasswordResetToken, getFarmProfile, getPasswordCredentialByEmail, getUserByEmail, getUserById, listCropAlertThresholds, listCropCalendarReminders, listPrivateCropScans, markPasswordResetTokenUsed, saveAccountSettings, saveCropAlertThreshold, saveFarmProfile, setCropCalendarReminderStatus, updatePasswordCredential, updateUserAvatar, updateUserDisplayName, upsertUser } from "./db";
import { districtLocationSchema, getDistrictMandiPrice, getDistrictWeather, searchWeatherLocations, supportedCropSchema, supportedLanguageSchema, weatherLocationSearchSchema } from "./farmData";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { allowKrishiExpertChat, answerKrishiExpert, krishiExpertInputSchema } from "./krishiExpert";
import { createResetToken, hashPassword, hashResetToken, normalizeEmail, sendPasswordResetEmail, validatePassword, verifyPassword } from "./passwordAuth";
import { sdk } from "./_core/sdk";
import { storagePut } from "./storage";

const shareableScanSchema = cropAnalysisResultSchema.extend({
  scanMode: z.enum(["anonymous", "private"]),
  language: supportedLanguageSchema.default("en"),
  privacyNotice: z.string().min(1).max(300),
  disclaimer: z.string().min(1).max(600),
});

const shareSlugSchema = z.object({ slug: z.string().regex(/^[A-Za-z0-9_-]{8,32}$/) });
const SCAN_SHARE_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
const farmProfileInputSchema = districtLocationSchema.extend({
  cropPreferences: z.array(supportedCropSchema).min(1).max(3),
  cropAreaAllocations: z.string().max(4000).default("{}"),
  language: supportedLanguageSchema,
});
const cropCalendarReminderInputSchema = z.object({
  cropName: supportedCropSchema,
  title: z.string().trim().min(3).max(160),
  details: z.string().trim().max(600).optional(),
  dueAt: z.date(),
});
const cropCalendarReminderStatusSchema = z.object({
  id: z.number().int().positive(),
  status: z.enum(["upcoming", "completed"]),
});
const cropAlertThresholdInputSchema = z.object({
  cropName: supportedCropSchema,
  priceFloor: z.number().int().min(1).max(999999),
  rainChance: z.number().int().min(0).max(100),
  soilMoistureMinimum: z.number().int().min(0).max(100),
});
const emailSchema = z.string().trim().toLowerCase().email().max(320);
const passwordSchema = z.string().min(8).max(128);
const passwordAuthInputSchema = z.object({ email: emailSchema, password: passwordSchema });
const passwordResetRequestSchema = z.object({ email: emailSchema, origin: z.string().url() });
const passwordResetCompletionSchema = z.object({ token: z.string().min(20).max(200), password: passwordSchema });
const accountSettingsSchema = z.object({ scanRetentionDays: z.union([z.literal(30), z.literal(90), z.literal(365), z.literal(0)]), reminderRetentionDays: z.union([z.literal(30), z.literal(90), z.literal(365), z.literal(0)]) });
const displayNameSchema = z.object({
  name: z.string().trim().min(2, "Display name must be at least 2 characters.").max(80, "Display name must be 80 characters or fewer.").refine((value) => !/[\u0000-\u001F\u007F]/.test(value), "Display name contains invalid characters."),
});
const avatarUploadSchema = z.object({ dataUrl: z.string().max(2_900_000) });
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

function parseAvatarDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new TRPCError({ code: "BAD_REQUEST", message: "Choose a JPG, PNG, or WebP image." });
  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length || bytes.length > AVATAR_MAX_BYTES) throw new TRPCError({ code: "BAD_REQUEST", message: "Profile photos must be 2 MB or smaller." });
  return { contentType: match[1], bytes };
}

function withAvatarUrl<T extends { avatarKey?: string | null }>(user: T | null | undefined) {
  return user ? { ...user, avatarUrl: user.avatarKey ? `/storage/${user.avatarKey}` : null } : null;
}

async function setSessionCookie(ctx: { req: any; res: any }, openId: string, name: string) {
  const sessionToken = await sdk.createSessionToken(openId, { name, expiresInMs: 365 * 24 * 60 * 60 * 1000 });
  ctx.res.cookie(COOKIE_NAME, sessionToken, { ...getSessionCookieOptions(ctx.req), maxAge: 365 * 24 * 60 * 60 * 1000 });
}

function localOpenId(email: string) {
  return `email:${email}`.slice(0, 64);
}

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => withAvatarUrl(opts.ctx.user)),
    register: publicProcedure.input(passwordAuthInputSchema).mutation(async ({ input, ctx }) => {
      const email = normalizeEmail(input.email);
      if (await getPasswordCredentialByEmail(email)) throw new TRPCError({ code: "CONFLICT", message: "An account already exists for this email." });
      const existing = await getUserByEmail(email);
      const user = existing ?? (await (async () => {
        await upsertUser({ openId: localOpenId(email), name: email.split("@")[0], email, loginMethod: "email", lastSignedIn: new Date() });
        return getUserByEmail(email);
      })());
      if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "We could not create your account." });
      await createPasswordCredential({ userId: user.id, email, passwordHash: await hashPassword(input.password) });
      await setSessionCookie(ctx, user.openId, user.name ?? email);
      return { success: true } as const;
    }),
    login: publicProcedure.input(passwordAuthInputSchema).mutation(async ({ input, ctx }) => {
      const email = normalizeEmail(input.email);
      const credential = await getPasswordCredentialByEmail(email);
      if (!credential || !(await verifyPassword(input.password, credential.passwordHash))) throw new TRPCError({ code: "UNAUTHORIZED", message: "Email or password is incorrect." });
      const user = await getUserById(credential.userId);
      if (!user) throw new TRPCError({ code: "UNAUTHORIZED", message: "Email or password is incorrect." });
      await setSessionCookie(ctx, user.openId, user.name ?? email);
      return { success: true } as const;
    }),
    requestPasswordReset: publicProcedure.input(passwordResetRequestSchema).mutation(async ({ input }) => {
      const email = normalizeEmail(input.email);
      const credential = await getPasswordCredentialByEmail(email);
      if (credential) {
        const reset = createResetToken();
        await createPasswordResetToken({ userId: credential.userId, tokenHash: reset.tokenHash, expiresAt: reset.expiresAt });
        const resetUrl = `${input.origin.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(reset.rawToken)}`;
        await sendPasswordResetEmail({ email, resetUrl });
      }
      return { accepted: true } as const;
    }),
    resetPassword: publicProcedure.input(passwordResetCompletionSchema).mutation(async ({ input }) => {
      const active = await getActivePasswordResetToken(hashResetToken(input.token));
      if (!active) throw new TRPCError({ code: "BAD_REQUEST", message: "This reset link is invalid or expired." });
      await updatePasswordCredential(active.userId, await hashPassword(input.password));
      await markPasswordResetTokenUsed(active.id);
      return { success: true } as const;
    }),
    profile: protectedProcedure.query(async ({ ctx }) => {
      const user = await getUserById(ctx.user.id);
      return user ? { id: user.id, name: user.name, email: user.email, loginMethod: user.loginMethod, role: user.role, createdAt: user.createdAt, lastSignedIn: user.lastSignedIn, avatarUrl: user.avatarKey ? `/storage/${user.avatarKey}` : null } : null;
    }),
    updateDisplayName: protectedProcedure.input(displayNameSchema).mutation(({ ctx, input }) => updateUserDisplayName(ctx.user.id, input.name)),
    uploadAvatar: protectedProcedure.input(avatarUploadSchema).mutation(async ({ ctx, input }) => {
      const { contentType, bytes } = parseAvatarDataUrl(input.dataUrl);
      const uploaded = await storagePut(`cropwise/users/${ctx.user.id}/avatar`, bytes, contentType);
      const user = await updateUserAvatar(ctx.user.id, uploaded.key);
      return withAvatarUrl(user);
    }),
    removeAvatar: protectedProcedure.mutation(async ({ ctx }) => {
      const user = await updateUserAvatar(ctx.user.id, null);
      return withAvatarUrl(user);
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  account: router({
    settings: protectedProcedure.query(({ ctx }) => getAccountSettings(ctx.user.id)),
    saveSettings: protectedProcedure.input(accountSettingsSchema).mutation(({ ctx, input }) => saveAccountSettings({ userId: ctx.user.id, ...input })),
    delete: protectedProcedure.mutation(async ({ ctx }) => {
      await deleteUserAccount(ctx.user.id);
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  cropAnalysis: router({
    analyze: protectedProcedure.input(cropPhotoInputSchema).mutation(async ({ input, ctx }) => {
      try {
        const result = await analyzeCropPhoto(input);
        await createPrivateCropScan({
          userId: ctx.user.id,
          cropName: result.cropName,
          localName: result.localName,
          healthStatus: result.healthStatus,
          overview: result.overview,
          imageUrl: result.imageUrl,
          payload: JSON.stringify(result),
        });
        return result;
      } catch (error) {
        if (error instanceof CropPhotoValidationError) {
          throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
        }
        console.error("[Crop analysis] failed", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "We could not analyse this image. Please try a clear, well-lit crop or leaf photo.",
        });
      }
    }),
    quickScan: publicProcedure.input(cropPhotoInputSchema).mutation(async ({ input, ctx }) => {
      const forwardedFor = ctx.req.headers["x-forwarded-for"];
      const clientKey = (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor?.split(",")[0])?.trim()
        || ctx.req.socket.remoteAddress
        || "anonymous";
      if (!allowAnonymousQuickScan(clientKey)) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Quick scan is limited to four photos per hour. Please try again later or sign in for private scans.",
        });
      }
      try {
        return await analyzeCropPhotoWithoutStorage(input);
      } catch (error) {
        if (error instanceof CropPhotoValidationError) {
          throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
        }
        console.error("[Anonymous crop quick scan] failed", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "We could not scan this image. Please try a clear, well-lit crop or leaf photo.",
        });
      }
    }),
  }),

  cropShare: router({
    create: publicProcedure.input(shareableScanSchema).mutation(async ({ input }) => {
      const slug = nanoid(12);
      const expiresAt = new Date(Date.now() + SCAN_SHARE_LIFETIME_MS);
      try {
        await createCropScanShare({ slug, payload: JSON.stringify(input), expiresAt });
        return { slug, expiresAt };
      } catch (error) {
        console.error("[Crop scan share] failed", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "We could not create a share link. Please try again.",
        });
      }
    }),
    get: publicProcedure.input(shareSlugSchema).query(async ({ input }) => {
      const share = await getActiveCropScanShare(input.slug);
      if (!share) throw new TRPCError({ code: "NOT_FOUND", message: "This scan link is unavailable or has expired." });

      const parsed = shareableScanSchema.safeParse(JSON.parse(share.payload));
      if (!parsed.success) throw new TRPCError({ code: "NOT_FOUND", message: "This shared scan is unavailable." });
      return { analysis: parsed.data, createdAt: share.createdAt, expiresAt: share.expiresAt };
    }),
  }),

  farmProfile: router({
    get: protectedProcedure.query(async ({ ctx }) => (await getFarmProfile(ctx.user.id)) ?? null),
    save: protectedProcedure.input(farmProfileInputSchema).mutation(({ input, ctx }) => saveFarmProfile({
      userId: ctx.user.id,
      village: input.village,
      district: input.district,
      state: input.state,
      cropPreferences: JSON.stringify(input.cropPreferences),
      cropAreaAllocations: input.cropAreaAllocations,
      language: input.language,
    })),
  }),

  cropHistory: router({
    list: protectedProcedure.query(({ ctx }) => listPrivateCropScans(ctx.user.id)),
  }),

  cropCalendar: router({
    list: protectedProcedure.query(({ ctx }) => listCropCalendarReminders(ctx.user.id)),
    create: protectedProcedure.input(cropCalendarReminderInputSchema).mutation(({ input, ctx }) => createCropCalendarReminder({
      userId: ctx.user.id,
      cropName: input.cropName,
      title: input.title,
      details: input.details || null,
      dueAt: input.dueAt,
    })),
    setStatus: protectedProcedure.input(cropCalendarReminderStatusSchema).mutation(({ input, ctx }) => setCropCalendarReminderStatus({ ...input, userId: ctx.user.id })),
  }),

  cropAlertThresholds: router({
    list: protectedProcedure.query(({ ctx }) => listCropAlertThresholds(ctx.user.id)),
    save: protectedProcedure.input(cropAlertThresholdInputSchema).mutation(({ input, ctx }) => saveCropAlertThreshold({ ...input, userId: ctx.user.id })),
  }),

  farmData: router({
    weather: publicProcedure.input(districtLocationSchema).query(({ input }) => getDistrictWeather(input)),
    searchWeatherLocations: publicProcedure.input(weatherLocationSearchSchema).query(({ input }) => searchWeatherLocations(input)),
    mandi: publicProcedure.input(districtLocationSchema.extend({ cropName: supportedCropSchema })).query(({ input }) => getDistrictMandiPrice(input, input.cropName)),
  }),

  krishiExpert: router({
    ask: publicProcedure.input(krishiExpertInputSchema).mutation(async ({ input, ctx }) => {
      const forwardedFor = ctx.req.headers["x-forwarded-for"];
      const clientKey = (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor?.split(",")[0])?.trim()
        || ctx.req.socket.remoteAddress
        || "anonymous";
      if (!allowKrishiExpertChat(clientKey)) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Krishi Expert is limited to ten questions per hour. Please try again later." });
      }
      try {
        return await answerKrishiExpert(input);
      } catch (error) {
        console.error("[Krishi Expert] failed", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Krishi Expert could not prepare a reply right now. Please try again shortly." });
      }
    }),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
