import { LiveAnnouncer } from '@angular/cdk/a11y';
import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { form, FormField, validate } from '@angular/forms/signals';
import { firstValueFrom, map } from 'rxjs';
import { APP_TEXT } from '../core/constants/app-text';
import { YearMonth } from '../core/dates';
import { percentChange } from '../core/decimal';
import { LocaleFormat } from '../core/locale-format.service';
import { AMOUNT_SIGN, Cents, CURRENCIES, CURRENCY, Currency } from '../core/money';
import { NavbarActions } from '../layout/navbar/navbar-actions';
import { Select, SelectOption } from '../shared/select/select';
import { Spinner } from '../shared/spinner/spinner';
import { STAT_CARD_TONE, StatCard } from '../shared/stat-card/stat-card';
import { FixedCost, INCREASE_RULE } from './fixed-cost';
import { FixedCostPanelService } from './fixed-cost-panel/fixed-cost-panel.service';
import { FixedCostService } from './fixed-cost.service';
import {
  IPC_AVERAGE_MONTHS_OPTIONS,
  IPC_DEFAULT_AVERAGE_MONTHS,
  IPC_ESTIMATE,
  IPC_MAX_CUSTOM_RATE,
  IpcEstimate,
  IpcEstimateSettings,
} from './ipc-factors';
import { IPC_STATUS, Projection, PROJECTION_MONTHS } from './projection';
import { ProjectionService } from './projection.service';

export const PROJECTIONS_IDS = {
  ipcTitle: 'ipc-estimate-title',
  estimateLabel: 'ipc-estimate-label',
  averageMonths: 'ipc-average-months',
  customRate: 'ipc-custom-rate',
  customRateError: 'ipc-custom-rate-error',
  tableTitle: 'projection-table-title',
  emptyTitle: 'projection-empty-title',
} as const;

/** The months after the current one that the summary cards show. */
const SUMMARY_OFFSET = { now: 0, half: 6, year: PROJECTION_MONTHS - 1 } as const;
const INCREASE_DECIMALS = 1;
const FULL_BAR_PERCENT = 100;
const RULE_SEPARATOR = ' · ';
const INVALID_RATE = 'invalidRate';

const DEFAULT_SETTINGS: IpcEstimateSettings = {
  estimate: IPC_ESTIMATE.average,
  averageMonths: IPC_DEFAULT_AVERAGE_MONTHS,
};

interface EstimateFormModel {
  estimate: IpcEstimate;
  averageMonths: number;
  customRate: string;
}

interface ShownProjection {
  currency: Currency;
  projection: Projection;
}

interface SummaryCard {
  label: string;
  amount: Cents;
}

interface TableCell {
  month: YearMonth;
  amount: string;
  increases: boolean;
}

interface TableRow {
  id: number;
  name: string;
  rule: string;
  deleteLabel: string;
  cells: TableCell[];
}

interface ChartBar {
  month: YearMonth;
  label: string;
  height: number;
}

@Component({
  imports: [FormField, NavbarActions, Select, Spinner, StatCard],
  selector: 'app-projections',
  styleUrl: './projections.css',
  templateUrl: './projections.html',
})
export class Projections {
  private readonly projectionService = inject(ProjectionService);
  private readonly fixedCostService = inject(FixedCostService);
  private readonly panel = inject(FixedCostPanelService);
  private readonly format = inject(LocaleFormat);
  private readonly announcer = inject(LiveAnnouncer);

  protected readonly text = APP_TEXT;
  protected readonly ids = PROJECTIONS_IDS;
  protected readonly currencies = CURRENCIES;
  protected readonly estimates = Object.values(IPC_ESTIMATE);
  protected readonly estimateOf = IPC_ESTIMATE;
  protected readonly neutralTone = STAT_CARD_TONE.neutral;
  protected readonly averageMonthsOptions: SelectOption<number>[] = IPC_AVERAGE_MONTHS_OPTIONS.map(
    (months) => ({ value: months, label: APP_TEXT.projections.monthsCount(months) }),
  );
  protected readonly currency = signal<Currency>(CURRENCY.ARS);

  protected readonly estimateModel = signal<EstimateFormModel>({
    estimate: DEFAULT_SETTINGS.estimate,
    averageMonths: IPC_DEFAULT_AVERAGE_MONTHS,
    customRate: '',
  });
  protected readonly estimateForm = form(this.estimateModel, (path) => {
    validate(path.customRate, ({ value, valueOf }) =>
      valueOf(path.estimate) === IPC_ESTIMATE.custom && this.parseRate(value()) === null
        ? { kind: INVALID_RATE }
        : undefined,
    );
  });
  protected readonly rateError = computed(
    () => this.estimateForm.customRate().invalid() && this.estimateForm.customRate().touched(),
  );

  private readonly chosenSettings = computed((): IpcEstimateSettings | null => {
    const { estimate, averageMonths, customRate } = this.estimateModel();
    if (estimate === IPC_ESTIMATE.average) {
      return { estimate, averageMonths };
    }
    const rate = this.parseRate(customRate);
    return rate === null ? null : { estimate, rate };
  });

  /** The last valid estimate settings, so a custom rate being typed keeps the previous projection. */
  private readonly settings = linkedSignal<IpcEstimateSettings | null, IpcEstimateSettings>({
    source: this.chosenSettings,
    computation: (chosen, previous) => chosen ?? previous?.value ?? DEFAULT_SETTINGS,
  });

  private readonly projection = rxResource({
    params: () => ({ currency: this.currency(), settings: this.settings() }),
    stream: ({ params }) =>
      this.projectionService
        .project(params.currency, params.settings)
        .pipe(map((projection): ShownProjection => ({ currency: params.currency, projection }))),
  });

  /**
   * The projection on screen. While a new one loads for the same currency, such as after changing
   * the estimate, it keeps the previous one, so the page doesn't empty. A new currency starts empty.
   */
  private readonly shown = linkedSignal<ShownProjection | undefined, ShownProjection | null>({
    source: () => (this.projection.hasValue() ? this.projection.value() : undefined),
    computation: (next, previous) => {
      const currency = this.currency();
      if (next?.currency === currency) {
        return next;
      }
      return previous?.value?.currency === currency ? previous.value : null;
    },
  });

  private readonly current = computed(() => this.shown()?.projection ?? null);

  protected readonly loading = this.projection.isLoading;
  protected readonly firstLoad = computed(() => this.loading() && !this.current());

  protected readonly ipcDown = computed(
    () => this.current()?.ipc.status === IPC_STATUS.unavailable,
  );
  protected readonly hasRows = computed(() => (this.current()?.rows.length ?? 0) > 0);
  protected readonly isEmpty = computed(() => this.current()?.rows.length === 0);
  protected readonly emptyTitle = computed(() => APP_TEXT.projections.emptyTitle(this.currency()));

  protected readonly cards = computed((): SummaryCard[] => {
    const totals = this.current()?.totals ?? [];
    return [
      { label: APP_TEXT.projections.now, amount: totals[SUMMARY_OFFSET.now] },
      { label: APP_TEXT.projections.inSixMonths, amount: totals[SUMMARY_OFFSET.half] },
      { label: APP_TEXT.projections.inTwelveMonths, amount: totals[SUMMARY_OFFSET.year] },
    ];
  });

  protected readonly increase = computed(() => {
    const totals = this.current()?.totals ?? [];
    const change = percentChange(
      totals[SUMMARY_OFFSET.now],
      totals[SUMMARY_OFFSET.year],
      INCREASE_DECIMALS,
    );
    if (change === null) {
      return APP_TEXT.projections.noValue;
    }
    return change.startsWith('-')
      ? `${AMOUNT_SIGN.minus} ${this.format.percent(change.slice(1))}`
      : `${AMOUNT_SIGN.plus} ${this.format.percent(change)}`;
  });

  protected readonly ipcDetails = computed(() => {
    const ipc = this.current()?.ipc;
    if (ipc?.status !== IPC_STATUS.available) {
      return null;
    }
    const lastMonth = ipc.lastMonth ? this.format.monthName(ipc.lastMonth) : null;
    return {
      rate: this.format.percent(ipc.monthlyEstimate),
      source: lastMonth ? APP_TEXT.projections.ipcSource(ipc.source, lastMonth) : null,
      note: lastMonth ? APP_TEXT.projections.ipcNote(lastMonth) : null,
    };
  });

  protected readonly monthLabels = computed(() =>
    (this.current()?.months ?? []).map((month) => ({
      month,
      label: this.format.shortMonth(month),
    })),
  );

  protected readonly rows = computed((): TableRow[] => {
    const ipcDown = this.ipcDown();
    return (this.current()?.rows ?? []).map(({ cost, cells }) => ({
      id: cost.id,
      name: cost.name,
      rule: this.ruleLabel(cost, ipcDown),
      deleteLabel: APP_TEXT.projections.deleteCost(cost.name),
      cells: cells.map((cell) => ({
        month: cell.month,
        amount: this.format.money(cell.amount, cost.currency),
        increases: cell.increases,
      })),
    }));
  });

  protected readonly totals = computed(() => {
    const currency = this.currency();
    return (this.current()?.totals ?? []).map((total, index) => ({
      index,
      amount: this.format.money(total, currency),
    }));
  });

  protected readonly bars = computed((): ChartBar[] => {
    const totals = this.current()?.totals ?? [];
    const largest = Math.max(...totals, 1);
    return this.monthLabels().map(({ month, label }, index) => ({
      month,
      label,
      height: (totals[index] / largest) * FULL_BAR_PERCENT,
    }));
  });

  protected pickEstimate(estimate: IpcEstimate): void {
    const suggested = this.suggestedRate();
    this.estimateModel.update((model) => ({
      ...model,
      estimate,
      customRate: model.customRate || suggested,
    }));
  }

  protected retry(): void {
    this.projection.reload();
  }

  protected addFixedCost(): void {
    this.panel.open(this.currency());
  }

  protected async remove(id: number): Promise<void> {
    await firstValueFrom(this.fixedCostService.remove(id));
    void this.announcer.announce(APP_TEXT.projections.deleted);
  }

  private parseRate(text: string): string | null {
    return this.format.parsePercent(text, IPC_MAX_CUSTOM_RATE);
  }

  /** The current estimate, to start the custom rate from a sensible value. */
  private suggestedRate(): string {
    const ipc = this.current()?.ipc;
    return ipc?.status === IPC_STATUS.available ? this.format.decimal(ipc.monthlyEstimate) : '';
  }

  /** How a cost increases, such as "IPC every 4 months · last: Aug 26". */
  private ruleLabel(cost: FixedCost, ipcDown: boolean): string {
    const { increase } = cost;
    const text = APP_TEXT.projections;
    let head: string;
    switch (increase.rule) {
      case INCREASE_RULE.percent:
        head = `${AMOUNT_SIGN.plus} ${this.format.percent(increase.percent)}`;
        break;
      case INCREASE_RULE.amount:
        head = this.format.money(increase.amount, cost.currency, AMOUNT_SIGN.plus);
        break;
      default:
        head = text.rules[INCREASE_RULE.ipc];
    }
    const last =
      increase.rule === INCREASE_RULE.ipc && ipcDown
        ? text.ipcPending
        : text.lastIncrease(this.format.shortMonth(cost.lastIncrease));
    return [`${head} ${text.every(cost.every)}`, last].join(RULE_SEPARATOR);
  }
}
