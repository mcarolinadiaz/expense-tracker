import { LiveAnnouncer } from '@angular/cdk/a11y';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, computed, inject, signal, Signal } from '@angular/core';
import { FieldTree, form, FormField, maxLength, submit, validate } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { monthsBetween, YearMonth } from '../../core/dates';
import { TextKey } from '../../core/i18n/translations';
import { Translator } from '../../core/i18n/translator.service';
import { LocaleFormat } from '../../core/locale-format.service';
import { CURRENCIES, Currency } from '../../core/money';
import { TextPipe } from '../../shared/pipes/text.pipe';
import { Select, SelectOption } from '../../shared/select/select';
import {
  FIXED_COST_ERROR,
  FIXED_COST_MAX_PERCENT,
  FIXED_COST_NAME_MAX_LENGTH,
  FixedCostErrorCode,
  FixedCostIncrease,
  INCREASE_EVERY_OPTIONS,
  INCREASE_RULE,
  IncreaseRule,
} from '../fixed-cost';
import { fixedCostErrorText } from '../fixed-cost-error-text';
import { FixedCostService } from '../fixed-cost.service';

export const FIXED_COST_PANEL_IDS = {
  title: 'fixed-cost-panel-title',
  name: 'fixed-cost-name',
  nameError: 'fixed-cost-name-error',
  amount: 'fixed-cost-amount',
  amountError: 'fixed-cost-amount-error',
  currencyLabel: 'fixed-cost-currency-label',
  ruleLabel: 'fixed-cost-rule-label',
  ruleHint: 'fixed-cost-rule-hint',
  value: 'fixed-cost-value',
  valueError: 'fixed-cost-value-error',
  every: 'fixed-cost-every',
  lastIncrease: 'fixed-cost-last-increase',
  lastIncreaseHint: 'fixed-cost-last-increase-hint',
  lastIncreaseError: 'fixed-cost-last-increase-error',
} as const;

const DEFAULT_INCREASE_EVERY = 4;
const AMOUNT_HINT_CENTS = 125050;
const PERCENT_HINT = '8.5';

export interface FixedCostPanelData {
  currency: Currency;
  currentMonth: YearMonth;
}

/** What the user types, before it becomes a fixed cost: amounts and the percentage are still text. */
interface FixedCostFormModel {
  name: string;
  amount: string;
  currency: Currency;
  rule: IncreaseRule;
  percent: string;
  increaseAmount: string;
  every: number;
  lastIncrease: YearMonth;
}

/** The side panel to add a fixed cost. Open it with `FixedCostPanelService`. */
@Component({
  imports: [FormField, Select, TextPipe],
  selector: 'app-fixed-cost-panel',
  host: { class: 'side-panel' },
  templateUrl: './fixed-cost-panel.html',
})
export class FixedCostPanel {
  private readonly dialogRef = inject(DialogRef);
  private readonly data = inject<FixedCostPanelData>(DIALOG_DATA);
  private readonly format = inject(LocaleFormat);
  private readonly fixedCostService = inject(FixedCostService);
  private readonly announcer = inject(LiveAnnouncer);
  private readonly translator = inject(Translator);

  protected readonly ids = FIXED_COST_PANEL_IDS;
  protected readonly rules = Object.values(INCREASE_RULE);
  protected readonly ruleOf = INCREASE_RULE;
  protected readonly currencies = CURRENCIES;
  protected readonly currentMonth = this.data.currentMonth;
  protected readonly everyOptions = computed((): SelectOption<number>[] =>
    INCREASE_EVERY_OPTIONS.map((every) => ({
      value: every,
      label: this.translator.plural('fixedCost.everyOption', every),
    })),
  );
  protected readonly amountHint = computed(() => this.format.formatAmount(AMOUNT_HINT_CENTS));
  protected readonly percentHint = computed(() => this.format.decimal(PERCENT_HINT));

  protected readonly model = signal<FixedCostFormModel>({
    name: '',
    amount: '',
    currency: this.data.currency,
    rule: INCREASE_RULE.ipc,
    percent: '',
    increaseAmount: '',
    every: DEFAULT_INCREASE_EVERY,
    lastIncrease: this.data.currentMonth,
  });

  protected readonly form = form(this.model, (path) => {
    validate(path.name, ({ value }) =>
      value().trim() ? undefined : { kind: FIXED_COST_ERROR.nameRequired },
    );
    maxLength(path.name, FIXED_COST_NAME_MAX_LENGTH, {
      error: { kind: FIXED_COST_ERROR.nameTooLong },
    });
    validate(path.amount, ({ value }) =>
      this.format.parseAmount(value()) === null
        ? { kind: FIXED_COST_ERROR.invalidAmount }
        : undefined,
    );
    validate(path.percent, ({ value, valueOf }) =>
      valueOf(path.rule) === INCREASE_RULE.percent &&
      this.format.parsePercent(value(), FIXED_COST_MAX_PERCENT) === null
        ? { kind: FIXED_COST_ERROR.invalidPercent }
        : undefined,
    );
    validate(path.increaseAmount, ({ value, valueOf }) =>
      valueOf(path.rule) === INCREASE_RULE.amount && this.format.parseAmount(value()) === null
        ? { kind: FIXED_COST_ERROR.invalidIncreaseAmount }
        : undefined,
    );
    validate(path.lastIncrease, ({ value }) =>
      !value() || monthsBetween(value(), this.data.currentMonth) < 0
        ? { kind: FIXED_COST_ERROR.futureLastIncrease }
        : undefined,
    );
  });

  protected readonly nameError = this.errorOf(this.form.name);
  protected readonly amountError = this.errorOf(this.form.amount);
  protected readonly percentError = this.errorOf(this.form.percent);
  protected readonly increaseAmountError = this.errorOf(this.form.increaseAmount);
  protected readonly lastIncreaseError = this.errorOf(this.form.lastIncrease);

  protected close(): void {
    this.dialogRef.close();
  }

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.form, async () => {
      await this.persist();
      return undefined;
    });
  }

  /** The error code of a field once the user has left it, so it doesn't show while typing. */
  private errorOf(field: FieldTree<string>): Signal<FixedCostErrorCode | null> {
    return computed(() =>
      field().touched() ? ((field().errors()[0]?.kind as FixedCostErrorCode) ?? null) : null,
    );
  }

  /** Saves the valid form. The validators already checked that every number parses. */
  private async persist(): Promise<void> {
    const value = this.model();
    await firstValueFrom(
      this.fixedCostService.add({
        name: value.name,
        currency: value.currency,
        amount: this.format.parseAmount(value.amount)!,
        every: value.every,
        lastIncrease: value.lastIncrease,
        increase: this.increase(value),
      }),
    );
    void this.announcer.announce(this.translator.translate('fixedCost.saved'));
    this.close();
  }

  private increase(value: FixedCostFormModel): FixedCostIncrease {
    switch (value.rule) {
      case INCREASE_RULE.percent:
        return {
          rule: INCREASE_RULE.percent,
          percent: this.format.parsePercent(value.percent, FIXED_COST_MAX_PERCENT)!,
        };
      case INCREASE_RULE.amount:
        return {
          rule: INCREASE_RULE.amount,
          amount: this.format.parseAmount(value.increaseAmount)!,
        };
      default:
        return { rule: INCREASE_RULE.ipc };
    }
  }

  protected ruleLabel(rule: IncreaseRule): TextKey {
    return `projections.rules.${rule}`;
  }

  protected errorText(code: FixedCostErrorCode): string {
    return fixedCostErrorText(this.translator, code);
  }
}
