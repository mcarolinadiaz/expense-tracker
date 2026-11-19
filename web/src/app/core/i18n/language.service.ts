import { DOCUMENT, inject, Service } from '@angular/core';
import { getBrowserLang, TranslocoService } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { AppDb, SETTING_KEY } from '../db/app-db';
import { APP_LOCALES, AppLocale, isAppLocale, LocaleFormat } from '../locale-format.service';
import { DEFAULT_LOCALE } from './translations';

/**
 * Owns the active language. It keeps the translations, the formats of `LocaleFormat` and
 * `<html lang>` in step, and remembers the choice on this device.
 */
@Service()
export class LanguageService {
  private readonly transloco = inject(TranslocoService);
  private readonly localeFormat = inject(LocaleFormat);
  private readonly db = inject(AppDb);
  private readonly document = inject(DOCUMENT);

  readonly language = this.localeFormat.locale;

  /** Starts in the language chosen on this device, or else the browser's, before the app renders. */
  async start(): Promise<void> {
    const saved = await this.db.settings
      .get(SETTING_KEY.language)
      .then((setting) => setting?.value)
      .catch(() => undefined);
    await this.apply(isAppLocale(saved) ? saved : this.browserLocale());
  }

  /** Switches the whole app to `locale` without reloading, and remembers it on this device. */
  async use(locale: AppLocale): Promise<void> {
    await this.apply(locale);
    await this.db.settings.put({ key: SETTING_KEY.language, value: locale });
  }

  private async apply(locale: AppLocale): Promise<void> {
    await firstValueFrom(this.transloco.load(locale));
    this.transloco.setActiveLang(locale);
    this.localeFormat.use(locale);
    this.document.documentElement.lang = locale;
  }

  private browserLocale(): AppLocale {
    const browser = getBrowserLang();
    return (
      APP_LOCALES.find((locale) => new Intl.Locale(locale).language === browser) ?? DEFAULT_LOCALE
    );
  }
}
