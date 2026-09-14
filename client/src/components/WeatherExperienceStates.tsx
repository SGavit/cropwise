import * as React from "react";
import { ChevronRight, Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSun, Loader2, MapPin, Search, Snowflake, Sun } from "lucide-react";
import type { FarmLocation } from "@/lib/farmLocation";
import type { InterfacePhrase } from "@/lib/interfaceTranslations";

export type ForecastSearchStatus = "hint" | "loading" | "unavailable" | "results" | "empty";

export function getForecastSearchStatus({
  query,
  isFetching,
  providerStatus,
  resultCount,
}: {
  query: string;
  isFetching: boolean;
  providerStatus?: "available" | "unavailable";
  resultCount?: number;
}): ForecastSearchStatus {
  if (query.trim().length < 2) return "hint";
  if (isFetching) return "loading";
  if (providerStatus === "unavailable") return "unavailable";
  if ((resultCount ?? 0) > 0) return "results";
  return "empty";
}

export function WeatherLoadingSkeleton({ label }: { label: string }) {
  return (
    <div className="weather-skeleton" role="status" aria-live="polite" aria-label={label}>
      <div className="weather-skeleton-main">
        <span className="weather-skeleton-temperature" />
        <div>
          <span className="weather-skeleton-line medium" />
          <span className="weather-skeleton-line short" />
        </div>
      </div>
      <div className="weather-skeleton-meta"><span /><span /></div>
      <div className="weather-skeleton-forecast"><span /><span /><span /><span /><span /></div>
      <p>{label}</p>
    </div>
  );
}

export type WeatherForecastDay = {
  date: string;
  conditionCode: number;
  high: number;
  low: number;
  rainChance: number;
};

export type WeatherVisualKind = "sun" | "cloud" | "rain" | "storm" | "fog" | "snow";

export function weatherVisualKindForCode(code: number): WeatherVisualKind {
  if ([45, 48].includes(code)) return "fog";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "snow";
  if ([95, 96, 99].includes(code)) return "storm";
  if ([1, 2].includes(code)) return "sun";
  if (code === 3) return "cloud";
  return "sun";
}

export function WeatherConditionVisual({ conditionCode, label, compact = false }: { conditionCode: number; label: string; compact?: boolean }) {
  const kind = weatherVisualKindForCode(conditionCode);
  const Icon = kind === "sun" ? (conditionCode === 0 ? Sun : CloudSun) : kind === "cloud" ? Cloud : kind === "rain" ? CloudRain : kind === "storm" ? CloudLightning : kind === "fog" ? CloudFog : Snowflake;
  return <span className={`weather-condition-visual weather-condition-${kind} ${compact ? "is-compact" : ""}`} role="img" aria-label={label}><Icon aria-hidden="true" /></span>;
}

export function WeatherFiveDayForecast({
  forecast,
  locale,
  title,
  description,
  todayLabel,
  rainChanceLabel,
  highLowLabel,
  conditionLabel,
}: {
  forecast: WeatherForecastDay[];
  locale: string;
  title: string;
  description: string;
  todayLabel: string;
  rainChanceLabel: string;
  highLowLabel: string;
  conditionLabel: (code: number) => string;
}) {
  return <section className="weather-five-day" aria-labelledby="weather-five-day-title">
    <div className="weather-five-day-head"><div><h2 id="weather-five-day-title">{title}</h2><p>{description}</p></div><CloudDrizzle aria-hidden="true" /></div>
    <div className="weather-five-day-list">
      {forecast.slice(0, 5).map((day, index) => {
        const date = new Date(`${day.date}T12:00:00`);
        const dayName = index === 0 ? todayLabel : new Intl.DateTimeFormat(locale, { weekday: "short" }).format(date);
        const condition = conditionLabel(day.conditionCode);
        return <article className="weather-five-day-item" key={day.date}>
          <span className="weather-day-name">{dayName}</span>
          <WeatherConditionVisual conditionCode={day.conditionCode} label={condition} compact />
          <span className="weather-day-condition">{condition}</span>
          <span className="weather-day-temperature" aria-label={`${highLowLabel}: ${day.high}°, ${day.low}°`}><b>{day.high}°</b><small>{day.low}°</small></span>
          <span className="weather-day-rain"><CloudDrizzle size={13} aria-hidden="true" /> {day.rainChance}% <span className="visually-hidden">{rainChanceLabel}</span></span>
        </article>;
      })}
    </div>
  </section>;
}

type Translation = (key: InterfacePhrase) => string;

export function WeatherLocationSearch({
  query,
  onQueryChange,
  isFetching,
  providerStatus,
  results,
  onSelect,
  t,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  isFetching: boolean;
  providerStatus?: "available" | "unavailable";
  results?: FarmLocation[];
  onSelect: (location: FarmLocation) => void;
  t: Translation;
}) {
  const state = getForecastSearchStatus({ query, isFetching, providerStatus, resultCount: results?.length });

  return (
    <section className="weather-location-search" aria-labelledby="weather-location-search-title">
      <div>
        <h3 id="weather-location-search-title">{t("weatherSearchTitle")}</h3>
        <p>{t("weatherSearchDescription")}</p>
      </div>
      <label>
        {t("weatherSearchInput")}
        <div className="weather-location-search-input">
          <Search size={16} />
          <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder={t("weatherSearchPlaceholder")} autoComplete="off" />
        </div>
      </label>
      {state === "hint" && <p className="weather-search-hint">{t("weatherSearchHint")}</p>}
      {state === "loading" && <p className="weather-search-hint"><Loader2 className="spin" size={14} /> {t("weatherSearching")}</p>}
      {state === "unavailable" && <p className="location-fallback-note">{t("weatherSearchUnavailable")}</p>}
      {state === "empty" && <p className="location-fallback-note">{t("weatherSearchNoResults")}</p>}
      {state === "results" && <div className="weather-location-results" aria-label={t("weatherSearchResults")}>
        {results?.map((location) => (
          <button key={`${location.village}-${location.district}-${location.state}`} type="button" onClick={() => onSelect(location)}>
            <MapPin size={15} />
            <span><b>{location.village}</b><small>{location.district}, {location.state}</small></span>
            <ChevronRight size={15} />
          </button>
        ))}
      </div>}
    </section>
  );
}
