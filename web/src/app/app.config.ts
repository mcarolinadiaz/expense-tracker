import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, TitleStrategy, withComponentInputBinding } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { routes } from './app.routes';
import { acceptLanguageInterceptor } from './core/i18n/accept-language.interceptor';
import { LanguageService } from './core/i18n/language.service';
import { TranslatedTitleStrategy } from './core/i18n/translated-title.strategy';
import { provideTranslations } from './core/i18n/translations';

/** Registers the service worker once the app is stable, or after 30 seconds at the latest. */
const SERVICE_WORKER_REGISTRATION = 'registerWhenStable:30000';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    { provide: TitleStrategy, useClass: TranslatedTitleStrategy },
    provideHttpClient(withFetch(), withInterceptors([acceptLanguageInterceptor])),
    provideTranslations(),
    provideAppInitializer(() => inject(LanguageService).start()),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: SERVICE_WORKER_REGISTRATION,
    }),
  ],
};
