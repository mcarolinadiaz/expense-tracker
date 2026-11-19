import { Translator } from '../core/i18n/translator.service';
import { CATEGORY_NAME_MAX_LENGTH, CategoryErrorCode } from './category';

/** The message for a broken category rule, in the active language. */
export function categoryErrorText(translator: Translator, code: CategoryErrorCode): string {
  return translator.translate(`categoryErrors.${code}`, { max: CATEGORY_NAME_MAX_LENGTH });
}
