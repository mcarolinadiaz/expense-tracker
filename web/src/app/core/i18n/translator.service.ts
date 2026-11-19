import { inject, Service } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import { LocaleFormat } from '../locale-format.service';
import { PLURAL_FORM, PluralKey, TextKey, TextParams } from './translations';

/**
 * Translates text in the active language. Templates use it through the `text` and `plural` pipes.
 * Reading it from a template or `computed()` updates the text when the language changes.
 */
@Service()
export class Translator {
  private readonly transloco = inject(TranslocoService);
  private readonly format = inject(LocaleFormat);

  /** The active language. Change it with `LanguageService`. */
  readonly language = toSignal(this.transloco.langChanges$, { requireSync: true });

  /** The text of `key`, filling its `{{ name }}` placeholders from `params`. */
  translate(key: TextKey, params?: TextParams): string {
    return this.transloco.translate(key, params, this.language());
  }

  /** The `one` or `other` form of `key` for `count`, which fills its `{{ count }}` placeholder. */
  plural(key: PluralKey, count: number, params?: TextParams): string {
    const language = this.language();
    const form =
      new Intl.PluralRules(language).select(count) === PLURAL_FORM.one
        ? PLURAL_FORM.one
        : PLURAL_FORM.other;
    return this.transloco.translate(
      `${key}.${form}`,
      { ...params, count: this.format.integer(count) },
      language,
    );
  }

  /** Whether a text known only at runtime, such as a route title, is a key of the files. */
  isKey(value: string | undefined): value is TextKey {
    return value !== undefined && value in this.transloco.getTranslation(this.language());
  }
}
