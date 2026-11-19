import { EnvironmentProviders, Injectable, isDevMode } from '@angular/core';
import {
  provideTransloco,
  Translation,
  TranslocoConfig,
  TranslocoLoader,
} from '@jsverse/transloco';
import { APP_LOCALE, APP_LOCALES, AppLocale, isAppLocale } from '../locale-format.service';
import type en from './en.json';

/** The language used when neither this device nor the browser chose a supported one. */
export const DEFAULT_LOCALE: AppLocale = APP_LOCALE.enUS;

/**
 * The forms a plural text has in the translation files. Both languages only need these two:
 * `Intl.PluralRules` categories other than `one`, such as Spanish `many`, use `other`.
 */
export const PLURAL_FORM = {
  one: 'one',
  other: 'other',
} as const;

export type PluralForm = (typeof PLURAL_FORM)[keyof typeof PLURAL_FORM];

type KeyPaths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${KeyPaths<T[K]>}`;
}[keyof T & string];

type PluralPaths<T> = {
  [K in keyof T & string]: T[K] extends string
    ? never
    : T[K] extends Record<PluralForm, string>
      ? K
      : `${K}.${PluralPaths<T[K]>}`;
}[keyof T & string];

/** Every text key, such as `pages.overview`, taken from the English file. */
export type TextKey = KeyPaths<typeof en>;

/** Every plural text, such as `activity.count`, which holds a `one` and an `other` form. */
export type PluralKey = PluralPaths<typeof en>;

/**
 * Marks a text key kept outside a template, such as a route title or an error message per code. It
 * keeps the key's own type, so a typed map like `satisfies Record<ErrorCode, TextKey>` still checks it.
 */
export function textKey<K extends TextKey>(key: K): K {
  return key;
}

/** Values for the `{{ name }}` placeholders of a text. */
export type TextParams = Record<string, string | number>;

/** The Transloco settings shared by the app and its tests. */
export const TRANSLOCO_SETTINGS = {
  availableLangs: [...APP_LOCALES],
  defaultLang: DEFAULT_LOCALE,
  reRenderOnLangChange: true,
} satisfies Partial<TranslocoConfig>;

const TRANSLATION_FILES = {
  [APP_LOCALE.esAR]: () => import('./es.json'),
  [APP_LOCALE.enUS]: () => import('./en.json'),
} satisfies Record<AppLocale, () => Promise<{ default: Translation }>>;

/** Loads each language's file on demand, as its own chunk, so it also works offline. */
@Injectable()
export class TranslationLoader implements TranslocoLoader {
  async getTranslation(lang: string): Promise<Translation> {
    const file = await TRANSLATION_FILES[isAppLocale(lang) ? lang : DEFAULT_LOCALE]();
    return file.default;
  }
}

/** Transloco with the app's languages and translation files. */
export function provideTranslations(): EnvironmentProviders[] {
  return provideTransloco({
    config: { ...TRANSLOCO_SETTINGS, prodMode: !isDevMode() },
    loader: TranslationLoader,
  });
}
