import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { appLanguages } from "./dashboardLanguage";
import { interfacePhrases } from "./interfaceTranslations";

describe("CropWise interface language coverage", () => {
  it("provides non-empty English, Hindi, and Marathi copy for every shared interface phrase", () => {
    expect(Object.keys(interfacePhrases).length).toBeGreaterThan(100);

    for (const [key, phrase] of Object.entries(interfacePhrases)) {
      for (const language of appLanguages) {
        expect(phrase[language], `${key} is missing ${language} copy`).toBeTypeOf("string");
        expect(phrase[language].trim(), `${key} has empty ${language} copy`).not.toHaveLength(0);
      }
    }
  });

  it("provides explicit localized copy for the five-day forecast labels and weather visual names", () => {
    const forecastKeys = [
      "weatherFiveDay",
      "weatherFiveDayDescription",
      "weatherToday",
      "weatherRainChance",
      "weatherHighLow",
      "weatherVisualClear",
      "weatherVisualCloudy",
      "weatherVisualRain",
      "weatherVisualStorm",
      "weatherVisualFog",
      "weatherVisualSnow",
    ] as const;

    for (const key of forecastKeys) {
      for (const language of appLanguages) {
        expect(interfacePhrases[key][language], `${key} needs ${language} forecast copy`).not.toHaveLength(0);
      }
    }
  });

  it("connects each user-facing route and global recovery UI to the shared language context", () => {
    const sourceFiles = [
      "pages/Home.tsx",
      "pages/SharedScan.tsx",
      "pages/NotFound.tsx",
      "App.tsx",
    ];

    for (const file of sourceFiles) {
      const source = readFileSync(resolve(__dirname, "..", file), "utf8");
      expect(source, `${file} should consume app-wide language state`).toContain("useLanguage");
    }
  });

  it("provides localized Crop Wealth Watch and Krishi Expert workspace copy", () => {
    const workspaceKeys = [
      "workspaceCropPlanTitle",
      "workspaceWealthWatchTitle",
      "workspaceExpertTitle",
      "expertSafetyNote",
      "expertReplyError",
      "expertChatPlaceholder",
      "expertChatEmpty",
      "expertPromptOne",
      "expertPromptTwo",
      "expertPromptThree",
    ] as const;

    for (const key of workspaceKeys) {
      for (const language of appLanguages) {
        expect(interfacePhrases[key][language], `${key} needs ${language} workspace copy`).not.toHaveLength(0);
      }
    }
  });

  it("provides explicit localized copy for crop reminders, alert settings, and crop-library planning guidance", () => {
    const planningKeys = [
      "cropCalendarWorkspaceTitle",
      "cropCalendarAddTask",
      "cropCalendarDueDate",
      "cropCalendarOpenNotice",
      "wealthThresholdTitle",
      "wealthThresholdPriceFloor",
      "wealthThresholdRain",
      "wealthThresholdSoil",
      "cropLibraryTitle",
      "cropLibrarySowingWindow",
      "cropLibraryWaterPlanning",
      "cropLibrarySoilTypes",
      "cropLibraryMaizeSowing",
      "cropLibraryGroundnutSowing",
      "cropLibrarySoybeanSowing",
      "cropLibraryCheckLocal",
    ] as const;

    for (const key of planningKeys) {
      for (const language of appLanguages) {
        expect(interfacePhrases[key][language], `${key} needs ${language} planning copy`).not.toHaveLength(0);
      }
    }
  });

  it("provides complete localized farmer crop profiles for purpose, field care, water, harvest, and vigilance", () => {
    const profileKeys = [
      "cropProfileTitle",
      "cropProfileOpen",
      "cropProfilePurpose",
      "cropProfileClimate",
      "cropProfileEstablishment",
      "cropProfileSeed",
      "cropProfileNutrition",
      "cropProfileWater",
      "cropProfileHarvest",
      "cropProfileVigilance",
      "cropProfileCaution",
      "cropProfileMaizePurpose",
      "cropProfileGroundnutPurpose",
      "cropProfileSoybeanPurpose",
    ] as const;

    for (const key of profileKeys) {
      for (const language of appLanguages) {
        expect(interfacePhrases[key][language], `${key} needs ${language} crop-profile copy`).not.toHaveLength(0);
      }
    }
  });

  it("routes representative dashboard overlays, validation feedback, and public recovery copy through translations", () => {
    const home = readFileSync(resolve(__dirname, "..", "pages/Home.tsx"), "utf8");
    const workspaces = readFileSync(resolve(__dirname, "..", "components/WorkspaceViews.tsx"), "utf8");
    const sharedScan = readFileSync(resolve(__dirname, "..", "pages/SharedScan.tsx"), "utf8");
    const notFound = readFileSync(resolve(__dirname, "..", "pages/NotFound.tsx"), "utf8");

    [
      't("whatsapp")',
      't("expertLanguages")',
      'placeholder={t("villageExample")}',
      'placeholder={t("districtExample")}',
      'placeholder={t("stateExample")}',
      'setPhotoError(t("analysisFailed"))',
      'setPhotoError(t("scanFailed"))',
      'toast.error(t("shareFailed"))',
      "localizedCropName",
      "weatherPhraseByCode",
      '"X-CropWise-Language": language',
      't("scanNarrativeLanguageNotice")',
      "weatherIsUnavailable",
      't("weatherUnavailable")',
      "weatherIsFetching",
      "WeatherLoadingSkeleton",
      "WeatherConditionVisual",
      "WeatherFiveDayForecast",
      "WeatherLocationSearch",
      "searchWeatherLocations.useQuery",
      "forecastLocationQuery",
      "selectForecastLocation",
      't("weatherFiveDay")',
      't("weatherFiveDayDescription")',
      't("weatherToday")',
      't("weatherRainChance")',
      't("weatherHighLow")',
      "copy.farmProfile",
      "copy.scanHistory",
      "copy.switchAccount",
      "copy.signInOrSwitch",
      "copy.signOut",
      't("signOutTitle")',
      't("signOutDescription")',
      't("staySignedIn")',
      "new Intl.DateTimeFormat",
      "currentHeroDate",
      "CropPlanWorkspace",
      "CropWealthWatchWorkspace",
      "KrishiExpertWorkspace",
      "workspace-content",
      'navigateWorkspace("crop-plan")',
    ].forEach((token) => expect(home, `Home should translate ${token}`).toContain(token));

    [
      "AIChatBox",
      "trpc.krishiExpert.ask.useMutation",
      't("expertChatPlaceholder")',
      't("expertSafetyNote")',
      't("workspaceWealthWatchTitle")',
      "trpc.cropCalendar.create.useMutation",
      "trpc.cropAlertThresholds.save.useMutation",
      't("cropCalendarWorkspaceTitle")',
      't("wealthThresholdTitle")',
      't("cropLibraryTitle")',
      "cropLibraryReference",
      "cropProfileReference",
      "CropLibraryProfile",
      "cropProfilePurpose",
      "cropProfileWater",
      "cropProfileHarvest",
      "cropProfileVigilance",
    ].forEach((token) => expect(workspaces, `Workspace views should include ${token}`).toContain(token));

    expect(home).not.toContain("weatherQuery.isError");

    expect(sharedScan).toContain('t("unavailableScanTitle")');
    expect(sharedScan).toContain('t("scanCopied")');
    expect(sharedScan).toContain('analysis.language !== language');
    expect(sharedScan).toContain('t("scanNarrativeLanguageNotice")');
    expect(notFound).toContain('t("pageNotFound")');
    expect(notFound).toContain('t("goHome")');
  });
});
