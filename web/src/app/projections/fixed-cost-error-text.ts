import { TextParams } from '../core/i18n/translations';
import { Translator } from '../core/i18n/translator.service';
import {
  FIXED_COST_ERROR,
  FIXED_COST_MAX_PERCENT,
  FIXED_COST_NAME_MAX_LENGTH,
  FixedCostErrorCode,
} from './fixed-cost';

const ERROR_PARAMS: Partial<Record<FixedCostErrorCode, TextParams>> = {
  [FIXED_COST_ERROR.nameTooLong]: { max: FIXED_COST_NAME_MAX_LENGTH },
  [FIXED_COST_ERROR.invalidPercent]: { max: FIXED_COST_MAX_PERCENT },
};

/** The message for a broken fixed cost rule, in the active language. */
export function fixedCostErrorText(translator: Translator, code: FixedCostErrorCode): string {
  return translator.translate(`fixedCostErrors.${code}`, ERROR_PARAMS[code]);
}
