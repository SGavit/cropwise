import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { interfacePhrases } from "@/lib/interfaceTranslations";
import { appLanguages, type AppLanguage } from "@/lib/dashboardLanguage";
import {
  getForecastSearchStatus,
  weatherVisualKindForCode,
  WeatherConditionVisual,
  WeatherFiveDayForecast,
  WeatherLoadingSkeleton,
  WeatherLocationSearch,
} from "./WeatherExperienceStates";

function translationFor(language: AppLanguage) {
  return (key: keyof typeof interfacePhrases) => interfacePhrases[key][language];
}

describe("WeatherExperienceStates", () => {
  it("renders the animated loading skeleton with localized feedback in every language", () => {
    for (const language of appLanguages) {
      const label = interfacePhrases.weatherLoadingCard[language];
      const markup = renderToStaticMarkup(<WeatherLoadingSkeleton label={label} />);
      expect(markup).toContain("weather-skeleton");
      expect(markup).toContain("weather-skeleton-temperature");
      expect(markup).toContain(label);
    }
  });

  it("models every forecast-location search branch deterministically", () => {
    expect(getForecastSearchStatus({ query: "S", isFetching: false })).toBe("hint");
    expect(getForecastSearchStatus({ query: "Bhatodi", isFetching: true })).toBe("loading");
    expect(getForecastSearchStatus({ query: "Bhatodi", isFetching: false, providerStatus: "unavailable" })).toBe("unavailable");
    expect(getForecastSearchStatus({ query: "Bhatodi", isFetching: false, providerStatus: "available", resultCount: 1 })).toBe("results");
    expect(getForecastSearchStatus({ query: "Bhatodi", isFetching: false, providerStatus: "available", resultCount: 0 })).toBe("empty");
  });

  it("renders localized search loading, results, no-results, and unavailable feedback", () => {
    const onSelect = vi.fn();
    const result = [{ village: "Bhatodi", district: "Bhatodi", state: "Maharashtra" }];

    for (const language of appLanguages) {
      const t = translationFor(language);
      const loading = renderToStaticMarkup(<WeatherLocationSearch query="Bhatodi" onQueryChange={vi.fn()} isFetching providerStatus="available" onSelect={onSelect} t={t} />);
      const available = renderToStaticMarkup(<WeatherLocationSearch query="Bhatodi" onQueryChange={vi.fn()} isFetching={false} providerStatus="available" results={result} onSelect={onSelect} t={t} />);
      const empty = renderToStaticMarkup(<WeatherLocationSearch query="Bhatodi" onQueryChange={vi.fn()} isFetching={false} providerStatus="available" results={[]} onSelect={onSelect} t={t} />);
      const unavailable = renderToStaticMarkup(<WeatherLocationSearch query="Bhatodi" onQueryChange={vi.fn()} isFetching={false} providerStatus="unavailable" onSelect={onSelect} t={t} />);

      expect(loading).toContain(t("weatherSearching"));
      expect(available).toContain("Bhatodi");
      expect(empty).toContain(t("weatherSearchNoResults"));
      expect(unavailable).toContain(t("weatherSearchUnavailable"));
    }
  });

  it("invokes the provided callback when a forecast location result is selected", () => {
    const onSelect = vi.fn();
    const location = { village: "Bhatodi", district: "Bhatodi", state: "Maharashtra" };
    const element = WeatherLocationSearch({
      query: "Bhatodi",
      onQueryChange: vi.fn(),
      isFetching: false,
      providerStatus: "available",
      results: [location],
      onSelect,
      t: translationFor("en"),
    });

    const resultButton = findElement(
      element,
      (node) => node.type === "button" && typeof node.props.onClick === "function",
    );

    expect(resultButton).toBeDefined();
    resultButton?.props.onClick();
    expect(onSelect).toHaveBeenCalledWith(location);
  });

  it("maps Open-Meteo condition codes to the appropriate condition visuals", () => {
    expect(weatherVisualKindForCode(0)).toBe("sun");
    expect(weatherVisualKindForCode(3)).toBe("cloud");
    expect(weatherVisualKindForCode(63)).toBe("rain");
    expect(weatherVisualKindForCode(95)).toBe("storm");
    expect(weatherVisualKindForCode(45)).toBe("fog");
    expect(weatherVisualKindForCode(75)).toBe("snow");
  });

  it("renders accessible condition-aware visual labels", () => {
    const labels = [
      [0, interfacePhrases.weatherVisualClear.en, "sun"],
      [3, interfacePhrases.weatherVisualCloudy.en, "cloud"],
      [63, interfacePhrases.weatherVisualRain.en, "rain"],
      [95, interfacePhrases.weatherVisualStorm.en, "storm"],
      [45, interfacePhrases.weatherVisualFog.en, "fog"],
      [75, interfacePhrases.weatherVisualSnow.en, "snow"],
    ] as const;

    for (const [code, label, kind] of labels) {
      const markup = renderToStaticMarkup(<WeatherConditionVisual conditionCode={code} label={label} />);
      expect(markup).toContain(`aria-label=\"${label}\"`);
      expect(markup).toContain(`weather-condition-${kind}`);
    }
  });

  it("renders five localized forecast tiles with localized labels and accessible weather visuals", () => {
    const forecast = [
      { date: "2026-08-22", conditionCode: 0, high: 31, low: 23, rainChance: 5 },
      { date: "2026-08-23", conditionCode: 3, high: 30, low: 22, rainChance: 20 },
      { date: "2026-08-24", conditionCode: 63, high: 28, low: 22, rainChance: 70 },
      { date: "2026-08-25", conditionCode: 95, high: 27, low: 21, rainChance: 85 },
      { date: "2026-08-26", conditionCode: 45, high: 29, low: 20, rainChance: 30 },
    ];
    const phraseByCode = {
      0: "weatherVisualClear",
      3: "weatherVisualCloudy",
      63: "weatherVisualRain",
      95: "weatherVisualStorm",
      45: "weatherVisualFog",
    } as const;

    for (const language of appLanguages) {
      const markup = renderToStaticMarkup(
        <WeatherFiveDayForecast
          forecast={forecast}
          locale={language === "hi" ? "hi-IN" : language === "mr" ? "mr-IN" : "en-IN"}
          title={interfacePhrases.weatherFiveDay[language]}
          description={interfacePhrases.weatherFiveDayDescription[language]}
          todayLabel={interfacePhrases.weatherToday[language]}
          rainChanceLabel={interfacePhrases.weatherRainChance[language]}
          highLowLabel={interfacePhrases.weatherHighLow[language]}
          conditionLabel={(code) => interfacePhrases[phraseByCode[code as keyof typeof phraseByCode]][language]}
        />,
      );

      expect(markup.match(/weather-five-day-item/g)).toHaveLength(5);
      expect(markup).toContain(interfacePhrases.weatherFiveDay[language]);
      expect(markup).toContain(interfacePhrases.weatherFiveDayDescription[language]);
      expect(markup).toContain(interfacePhrases.weatherToday[language]);
      expect(markup).toContain(interfacePhrases.weatherVisualRain[language]);
      expect(markup).toContain(`aria-label=\"${interfacePhrases.weatherVisualStorm[language]}\"`);
    }
  });
});

type RenderedElement = React.ReactElement<any, any>;

function findElement(node: React.ReactNode, predicate: (element: RenderedElement) => boolean): RenderedElement | undefined {
  if (!React.isValidElement(node)) return undefined;
  const element = node as RenderedElement;
  if (predicate(element)) return element;
  for (const child of React.Children.toArray(element.props.children)) {
    const match = findElement(child, predicate);
    if (match) return match;
  }
  return undefined;
}
