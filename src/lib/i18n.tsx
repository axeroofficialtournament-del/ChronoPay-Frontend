"use client";

/**
 * Internationalisation scaffolding for ChronoPay.
 *
 * This module provides:
 * - A typed message registry backed by `messages/<locale>.json` files.
 * - A React context + `useMessages()` hook for accessing strings.
 * - Locale-aware `Intl.NumberFormat` / `Intl.DateTimeFormat` helpers
 *   that read the active locale from context.
 *
 * No provider lock-in — all helpers accept an explicit `locale` fallback
 * so they work outside the React tree if needed.
 */

import {
  createContext,
  useContext,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import enMessages from "../../messages/en.json";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

/** Deep key path through a nested messages object (e.g. "dashboard.title"). */
type Join<K, P> = K extends string
  ? P extends string
    ? `${K}${"" extends P ? "" : "."}${P}`
    : never
  : never;

type Paths<T> = T extends object
  ? {
      [K in keyof T]-?: K extends string
        ? T[K] extends Record<string, unknown>
          ? `${K}` | Join<K, Paths<T[K]>>
          : `${K}`
        : never;
    }[keyof T]
  : "";

/** The union of every valid dot-separated message key. */
export type MessageKey = Paths<typeof enMessages>;

/** The flat record used at runtime for dot-lookup. */
type FlatMessages = Record<string, string>;

/* -------------------------------------------------------------------------- */
/*  Supported locales                                                         */
/* -------------------------------------------------------------------------- */

export const SUPPORTED_LOCALES = [
  "en",
  "es",
  "fr",
  "de",
  "ar",
  "he",
  "hi",
] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = "en";

export const LOCALE_DIR: Record<SupportedLocale, "ltr" | "rtl"> = {
  en: "ltr",
  es: "ltr",
  fr: "ltr",
  de: "ltr",
  ar: "rtl",
  he: "rtl",
  hi: "ltr",
};

export const LOCALE_LABELS: Record<SupportedLocale, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  ar: "العربية",
  he: "עברית",
  hi: "हिन्दी",
};

/* -------------------------------------------------------------------------- */
/*  Flatten helper                                                            */
/* -------------------------------------------------------------------------- */

function flatten(obj: Record<string, unknown>, prefix = ""): FlatMessages {
  const result: FlatMessages = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      result[fullKey] = value;
    } else if (typeof value === "object" && value !== null) {
      Object.assign(result, flatten(value as Record<string, unknown>, fullKey));
    }
  }
  return result;
}

/* -------------------------------------------------------------------------- */
/*  Registry – maps locale code → flat string record                          */
/* -------------------------------------------------------------------------- */

const enFlat = flatten(enMessages);

/** Currently only `en` ships full strings; add new locale imports here. */
const registry: Record<string, FlatMessages> = {
  en: enFlat,
};

/**
 * Return the flat string map for a locale, falling back to `en` if the
 * requested locale is not yet loaded.
 */
export function getMessages(locale: string): FlatMessages {
  return registry[locale] ?? registry.en;
}

/* -------------------------------------------------------------------------- */
/*  Resolve a dot key against a flat map                                       */
/* -------------------------------------------------------------------------- */

/**
 * Resolve a dot-separated key like `"dashboard.title"` against a flat map.
 * Returns `undefined` when the key is missing (never throws).
 */
export function resolveKey(
  flat: FlatMessages,
  key: string,
): string | undefined {
  // Fast path: exact match in flat map.
  if (key in flat) return flat[key];

  // Slow path: walk a nested object by dot segments (for un-flattened maps).
  const segments = key.split(".");
  let current: unknown = flat;
  for (const seg of segments) {
    if (current === null || current === undefined || typeof current !== "object")
      return undefined;
    current = (current as Record<string, unknown>)[seg];
  }
  return typeof current === "string" ? current : undefined;
}

/* -------------------------------------------------------------------------- */
/*  Context                                                                   */
/* -------------------------------------------------------------------------- */

interface I18nContextValue {
  /** Active BCP-47 locale code (e.g. `"en"`, `"ar"`). */
  locale: SupportedLocale;
  /** Text-direction attribute value for the active locale. */
  dir: "ltr" | "rtl";
  /** Flat string map for the active locale. */
  messages: FlatMessages;
}

const I18nContext = createContext<I18nContextValue>({
  locale: DEFAULT_LOCALE,
  dir: "ltr",
  messages: enFlat,
});

/* -------------------------------------------------------------------------- */
/*  Provider                                                                  */
/* -------------------------------------------------------------------------- */

export interface I18nProviderProps {
  locale?: SupportedLocale;
  children: ReactNode;
}

/**
 * Wraps part of the tree with locale context. Defaults to `"en"`.
 *
 * Usage in `layout.tsx`:
 * ```tsx
 * <I18nProvider locale="en">{children}</I18nProvider>
 * ```
 */
export function I18nProvider({
  locale = DEFAULT_LOCALE,
  children,
}: I18nProviderProps) {
  const value = useMemo<I18nContextValue>(() => {
    const dir = LOCALE_DIR[locale] ?? "ltr";
    const messages = getMessages(locale);
    return { locale, dir, messages };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/* -------------------------------------------------------------------------- */
/*  useMessages hook                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Access the typed message registry for the active locale.
 *
 * ```tsx
 * const t = useMessages();
 * <h1>{t("dashboard.title")}</h1>
 * ```
 */
export function useMessages(): (key: MessageKey) => string {
  const { messages } = useContext(I18nContext);

  return useCallback(
    (key: MessageKey): string => {
      const val = resolveKey(messages, key);
      if (val === undefined) {
        // Return the key itself as a visible fallback so missing translations
        // are easy to spot during development.
        if (process.env.NODE_ENV !== "production") {
          console.warn(`[i18n] Missing message for key "${key}"`);
        }
        return key;
      }
      return val;
    },
    [messages],
  );
}

/* -------------------------------------------------------------------------- */
/*  useLocale hook                                                            */
/* -------------------------------------------------------------------------- */

/** Return the current locale and text-direction. */
export function useLocale(): { locale: SupportedLocale; dir: "ltr" | "rtl" } {
  const { locale, dir } = useContext(I18nContext);
  return { locale, dir };
}

/* -------------------------------------------------------------------------- */
/*  Intl formatters                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Format a number using the active locale.
 *
 * ```tsx
 * const fmt = useNumberFormatter();
 * <span>{fmt(1234567.89)}</span>  // "1,234,567.89"
 * ```
 */
export function useNumberFormatter(
  options?: Intl.NumberFormatOptions,
): (value: number) => string {
  const { locale } = useContext(I18nContext);
  return useMemo(() => {
    const fmt = new Intl.NumberFormat(locale, options);
    return (value: number) => fmt.format(value);
  }, [locale, options]);
}

/**
 * Format a currency value using the active locale.
 *
 * ```tsx
 * const fmtCurrency = useCurrencyFormatter();
 * <span>{fmtCurrency(49.99, "USD")}</span>  // "$49.99"
 * ```
 */
export function useCurrencyFormatter(
  currency: string = "USD",
  options?: Intl.NumberFormatOptions,
): (value: number) => string {
  const { locale } = useContext(I18nContext);
  return useMemo(() => {
    const fmt = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      ...options,
    });
    return (value: number) => fmt.format(value);
  }, [locale, currency, options]);
}

/**
 * Format a date using the active locale.
 *
 * ```tsx
 * const fmtDate = useDateFormatter();
 * <time>{fmtDate(new Date())}</time>
 * ```
 */
export function useDateFormatter(
  options?: Intl.DateTimeFormatOptions,
): (date: Date | number | string) => string {
  const { locale } = useContext(I18nContext);
  return useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale, options);
    return (date: Date | number | string) => fmt.format(new Date(date));
  }, [locale, options]);
}

/* -------------------------------------------------------------------------- */
/*  Standalone formatters (outside React tree)                                */
/* -------------------------------------------------------------------------- */

/**
 * Format a number without a React context. Falls back to the given locale.
 */
export function formatNumberStandalone(
  value: number,
  locale: string = "en",
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(locale, options).format(value);
}

/**
 * Format currency without a React context.
 */
export function formatCurrencyStandalone(
  value: number,
  currency: string = "USD",
  locale: string = "en",
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency, ...options }).format(value);
}

/**
 * Format a date without a React context.
 */
export function formatDateStandalone(
  date: Date | number | string,
  locale: string = "en",
  options?: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat(locale, options).format(new Date(date));
}
