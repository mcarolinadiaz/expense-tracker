import { NgOptimizedImage } from '@angular/common';
import { Component, inject, Injector } from '@angular/core';
import { Translator } from '../../core/i18n/translator.service';
import { TextPipe } from '../../shared/pipes/text.pipe';

/** The bar above the content on narrow screens, with a button that opens the side bar as a drawer. */
@Component({
  imports: [NgOptimizedImage, TextPipe],
  selector: 'app-top-bar',
  styleUrl: './top-bar.css',
  template: `
    <header class="top-bar">
      <button
        type="button"
        class="btn btn-ghost btn-icon"
        [attr.aria-label]="'openMenu' | text"
        aria-haspopup="dialog"
        (click)="openMenu()"
      >
        <svg
          class="top-bar-icon"
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <img ngSrc="icons/sloth-mascot.svg" alt="" width="38" height="36" />
      <span class="top-bar-name">{{ 'appName' | text }}</span>
    </header>
  `,
})
export class TopBar {
  private readonly injector = inject(Injector);
  private readonly translator = inject(Translator);

  protected async openMenu(): Promise<void> {
    const { openMenuDrawer } = await import('./menu-drawer');
    openMenuDrawer(this.injector, this.translator.translate('mainNavigation'));
  }
}
