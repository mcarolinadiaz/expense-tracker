import { NgOptimizedImage } from '@angular/common';
import { Component, inject, InjectionToken } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TextPipe } from '../../shared/pipes/text.pipe';
import { APP_AUTHOR } from '../../core/constants/app-author';
import { APP_NAV_LINKS } from '../../core/constants/app-page-routes';
import { LanguageService } from '../../core/i18n/language.service';
import { APP_LOCALES, AppLocale, LANGUAGE_NAME } from '../../core/locale-format.service';

/** The drawer that holds the side bar on narrow screens. */
export interface SideBarDrawer {
  close(): void;
}

/**
 * Provided only when the side bar opens as a drawer. It's a token of its own, rather than CDK's
 * `DialogRef`, so the side bar doesn't pull the dialog code into the initial bundle.
 */
export const SIDE_BAR_DRAWER = new InjectionToken<SideBarDrawer>('SIDE_BAR_DRAWER');

@Component({
  imports: [NgOptimizedImage, RouterLink, RouterLinkActive, TextPipe],
  selector: 'app-side-bar',
  styleUrl: './side-bar.css',
  templateUrl: './side-bar.html',
})
export class SideBar {
  private readonly languageService = inject(LanguageService);

  /** The drawer that holds the side bar on narrow screens, or `null` when it's part of the page. */
  protected readonly drawer = inject(SIDE_BAR_DRAWER, { optional: true });

  protected readonly links = APP_NAV_LINKS;
  protected readonly author = APP_AUTHOR;
  protected readonly locales = APP_LOCALES;
  protected readonly languageNames = LANGUAGE_NAME;
  protected readonly language = this.languageService.language;

  protected chooseLanguage(locale: AppLocale): void {
    void this.languageService.use(locale);
  }
}
