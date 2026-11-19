import { inject, Pipe, PipeTransform } from '@angular/core';
import { PluralKey, TextParams } from '../../core/i18n/translations';
import { Translator } from '../../core/i18n/translator.service';

/**
 * Translates a plural text for a count, as in `{{ 'activity.count' | plural: total }}`.
 *
 * It's impure so it runs again when the language changes.
 */
@Pipe({ name: 'plural', pure: false })
export class PluralPipe implements PipeTransform {
  private readonly translator = inject(Translator);

  transform(key: PluralKey, count: number, params?: TextParams): string {
    return this.translator.plural(key, count, params);
  }
}
