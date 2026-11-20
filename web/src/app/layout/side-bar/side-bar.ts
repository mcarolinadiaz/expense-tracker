import { NgOptimizedImage } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TextPipe } from '../../shared/pipes/text.pipe';
import { APP_NAV_LINKS } from '../../core/constants/app-page-routes';
import { LanguageService } from '../../core/i18n/language.service';
import { APP_LOCALES, AppLocale, LANGUAGE_NAME } from '../../core/locale-format.service';

@Component({
  imports: [NgOptimizedImage, RouterLink, RouterLinkActive, TextPipe],
  selector: 'app-side-bar',
  styleUrl: './side-bar.css',
  templateUrl: './side-bar.html',
})
export class SideBar {
  private readonly languageService = inject(LanguageService);

  protected readonly links = APP_NAV_LINKS;
  protected readonly locales = APP_LOCALES;
  protected readonly languageNames = LANGUAGE_NAME;
  protected readonly language = this.languageService.language;

  protected chooseLanguage(locale: AppLocale): void {
    void this.languageService.use(locale);
  }
}
