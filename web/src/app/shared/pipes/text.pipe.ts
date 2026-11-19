import { inject, Pipe, PipeTransform } from '@angular/core';
import { TextKey, TextParams } from '../../core/i18n/translations';
import { Translator } from '../../core/i18n/translator.service';

/**
 * Translates a text key, as in `{{ 'data.title' | text }}` or `{{ 'projections.ipcNote' | text: {
 * month } }}`. The key is typed, so `strictTemplates` rejects a key that isn't in the files.
 *
 * It's impure so it runs again when the language changes. It only looks a text up, so that is cheap.
 */
@Pipe({ name: 'text', pure: false })
export class TextPipe implements PipeTransform {
  private readonly translator = inject(Translator);

  transform(key: TextKey, params?: TextParams): string {
    return this.translator.translate(key, params);
  }
}
