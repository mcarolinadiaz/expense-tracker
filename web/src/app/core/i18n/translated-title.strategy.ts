import { effect, inject, Injectable, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { Translator } from './translator.service';

/** Route titles are text keys. This writes the page title in the active language. */
@Injectable()
export class TranslatedTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly translator = inject(Translator);
  private readonly titleKey = signal<string | undefined>(undefined);

  constructor() {
    super();
    effect(() => {
      const key = this.titleKey();
      if (this.translator.isKey(key)) {
        this.title.setTitle(this.translator.translate(key));
      }
    });
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.titleKey.set(this.buildTitle(snapshot));
  }
}
