import { describe, expect, it } from "vitest";
import { appLanguages, languageCopy, languageLabels, personalizeDashboardCopy } from "./dashboardLanguage";

describe("CropWise dashboard language catalogue", () => {
  it("provides English, Hindi, and Marathi labels for core farmer tasks", () => {
    expect(appLanguages).toEqual(["en", "hi", "mr"]);
    for (const language of appLanguages) {
      expect(languageLabels[language]).not.toHaveLength(0);
      expect(languageCopy[language].weather).not.toHaveLength(0);
      expect(languageCopy[language].farmProfile).not.toHaveLength(0);
      expect(languageCopy[language].scanHistory).not.toHaveLength(0);
      expect(languageCopy[language].village).not.toHaveLength(0);
    }
  });

  it("personalizes the greeting without losing the selected language", () => {
    expect(personalizeDashboardCopy(languageCopy.en.goodMorning, "Asha Patil")).toBe("Good morning, Asha Patil");
    expect(personalizeDashboardCopy(languageCopy.hi.goodMorning, "Asha Patil")).toBe("सुप्रभात, Asha Patil");
    expect(personalizeDashboardCopy(languageCopy.mr.goodMorning, "Asha Patil")).toBe("शुभ सकाळ, Asha Patil");
  });
});
