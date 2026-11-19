import { EnvironmentProviders, importProvidersFrom } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { APP_LOCALE } from '../locale-format.service';
import en from './en.json';
import es from './es.json';
import { TRANSLOCO_SETTINGS } from './translations';

/** Both languages, loaded before the test starts, in English. Warns about missing keys. */
export function provideTestTranslations(): EnvironmentProviders {
  return importProvidersFrom(
    TranslocoTestingModule.forRoot({
      langs: { [APP_LOCALE.enUS]: en, [APP_LOCALE.esAR]: es },
      preloadLangs: true,
      translocoConfig: { ...TRANSLOCO_SETTINGS, missingHandler: { logMissingKey: true } },
    }),
  );
}
