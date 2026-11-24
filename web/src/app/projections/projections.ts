import { LiveAnnouncer } from '@angular/cdk/a11y';
import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { form, FormField, validate } from '@angular/forms/signals';
import { firstValueFrom, map } from 'rxjs';
import { TEXT_SEPARATOR } from '../core/constants/text-separator';
import { YearMonth } from '../core/dates';
import { TextKey } from '../core/i18n/translations';
import { Translator } from '../core/i18n/translator.service';
import { percentChange } from '../core/decimal';
import { LocaleFormat } from '../core/locale-format.service';
import { ScreenSize } from '../core/screen-size.service';
import { AMOUNT_SIGN, CURRENCIES, CURRENCY, Currency } from '../core/money';
import { NavbarActions } from '../layout/navbar/navbar-actions';
import { AddButton } from '../shared/add-button/add-button';
import { TextPipe } from '../shared/pipes/text.pipe';
import { Select, SelectOption } from '../shared/select/select';
import { Spinner } from '../shared/spinner/spinner';
import { STAT_CARD_TONE } from '../shared/stat-card/stat-card';
import { SummaryBadge, SummaryCards, SummaryFigure } from '../shared/summary-cards/summary-cards';
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
import {
  ChartBar,
  MonthCost,
  MonthView,
  ProjectionMonths,
} from './projection-months/projection-months';
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

interface TableCell {
  month: YearMonth;
  amount: string;
  increases: boolean;
}

interface TableRow {
  id: number;
  name: string;
  rule: string;
  editLabel: string;
  deleteLabel: string;
  cells: TableCell[];
}

@Component({
  imports: [
    AddButton,
    FormField,
    NavbarActions,
    ProjectionMonths,
    Select,
    Spinner,
    SummaryCards,
    TextPipe,
  ],
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
  private readonly translator = inject(Translator);
  protected readonly isBelowDesktop = inject(ScreenSize).isBelowDesktop;
  protected readonly ids = PROJECTIONS_IDS;
  protected readonly currencies = CURRENCIES;
  protected readonly estimates = Object.values(IPC_ESTIMATE);
  protected readonly estimateOf = IPC_ESTIMATE;
  protected readonly averageMonthsOptions = computed((): SelectOption<number>[] =>
    IPC_AVERAGE_MONTHS_OPTIONS.map((months) => ({
      value: months,
      label: this.translator.plural('projections.monthsCount', months),
    })),
  );
  protected readonly customRateParams = { max: IPC_MAX_CUSTOM_RATE };
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

  /** Whether any cost of the currency increases by IPC, the only costs the estimate changes. */
  protected readonly hasIpcCosts = computed(() =>
    (this.current()?.rows ?? []).some(({ cost }) => cost.increase.rule === INCREASE_RULE.ipc),
  );
  protected readonly ipcDown = computed(
    () => this.hasIpcCosts() && this.current()?.ipc.status === IPC_STATUS.unavailable,
  );
  protected readonly hasRows = computed(() => (this.current()?.rows.length ?? 0) > 0);
  protected readonly isEmpty = computed(() => this.current()?.rows.length === 0);
  protected readonly emptyTitle = computed(() =>
    this.translator.translate('projections.emptyTitle', { currency: this.currency() }),
  );

  protected readonly cards = computed((): SummaryFigure[] => {
    const totals = this.current()?.totals ?? [];
    const figure = (key: TextKey, offset: number): SummaryFigure => ({
      label: this.translator.translate(key),
      amount: totals[offset],
      tone: STAT_CARD_TONE.neutral,
    });
    return [
      figure('projections.now', SUMMARY_OFFSET.now),
      figure('projections.inSixMonths', SUMMARY_OFFSET.half),
      figure('projections.inTwelveMonths', SUMMARY_OFFSET.year),
    ];
  });

  protected readonly increaseBadge = computed((): SummaryBadge => ({
    label: this.translator.translate('projections.increase'),
    value: this.increase(),
  }));

  private readonly increase = computed(() => {
    const totals = this.current()?.totals ?? [];
    const change = percentChange(
      totals[SUMMARY_OFFSET.now],
      totals[SUMMARY_OFFSET.year],
      INCREASE_DECIMALS,
    );
    if (change === null) {
      return this.translator.translate('projections.noValue');
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
      source: lastMonth
        ? this.translator.translate('projections.ipcSource', {
            source: ipc.source,
            month: lastMonth,
          })
        : null,
      note: lastMonth
        ? this.translator.translate('projections.ipcNote', { month: lastMonth })
        : null,
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
      editLabel: this.translator.translate('projections.editCost', { name: cost.name }),
      deleteLabel: this.translator.translate('projections.deleteCost', { name: cost.name }),
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
    const amounts = this.totals();
    const largest = Math.max(...totals, 1);
    return this.monthLabels().map(({ month, label }, index) => ({
      month,
      label,
      description: this.translator.translate('projections.monthTotalLabel', {
        month: this.format.monthName(month),
        amount: amounts[index]?.amount ?? '',
      }),
      height: (totals[index] / largest) * FULL_BAR_PERCENT,
    }));
  });

  /** Each projected month with its costs, for the month-by-month view below desktop. */
  protected readonly monthViews = computed((): MonthView[] => {
    const projection = this.current();
    const rows = this.rows();
    const totals = this.totals();
    return (projection?.months ?? []).map((month, index) => ({
      name: this.format.monthName(month),
      total: totals[index]?.amount ?? '',
      costs: projection!.rows.map(({ cost, cells }, position): MonthCost => {
        const cell = cells[index];
        const previous = cells[index - 1];
        const rise = cell.increases && previous ? cell.amount - previous.amount : 0;
        return {
          id: cost.id,
          name: rows[position].name,
          rule: rows[position].rule,
          editLabel: rows[position].editLabel,
          deleteLabel: rows[position].deleteLabel,
          amount: this.format.money(cell.amount, cost.currency),
          increase: rise > 0 ? this.format.money(rise, cost.currency, AMOUNT_SIGN.plus) : null,
        };
      }),
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

  protected edit(id: number): void {
    const cost = this.current()?.rows.find((row) => row.cost.id === id)?.cost;
    if (cost) {
      this.panel.open(cost.currency, cost);
    }
  }

  protected async remove(id: number): Promise<void> {
    await firstValueFrom(this.fixedCostService.remove(id));
    void this.announcer.announce(this.translator.translate('projections.deleted'));
  }

  private parseRate(text: string): string | null {
    return this.format.parsePercent(text, IPC_MAX_CUSTOM_RATE);
  }

  /** The current estimate, to start the custom rate from a sensible value. */
  private suggestedRate(): string {
    const ipc = this.current()?.ipc;
    return ipc?.status === IPC_STATUS.available ? this.format.decimal(ipc.monthlyEstimate) : '';
  }

  /** How a cost increases, such as "IPC every 4 months – last: Aug 26". */
  private ruleLabel(cost: FixedCost, ipcDown: boolean): string {
    const { increase } = cost;
    let head: string;
    switch (increase.rule) {
      case INCREASE_RULE.percent:
        head = `${AMOUNT_SIGN.plus} ${this.format.percent(increase.percent)}`;
        break;
      case INCREASE_RULE.amount:
        head = this.format.money(increase.amount, cost.currency, AMOUNT_SIGN.plus);
        break;
      default:
        head = this.translator.translate('projections.rules.ipc');
    }
    const last =
      increase.rule === INCREASE_RULE.ipc && ipcDown
        ? this.translator.translate('projections.ipcPending')
        : this.translator.translate('projections.lastIncrease', {
            month: this.format.shortMonth(cost.lastIncrease),
          });
    const every = this.translator.plural('projections.every', cost.every);
    return [`${head} ${every}`, last].join(TEXT_SEPARATOR);
  }

  protected estimateLabel(estimate: IpcEstimate): TextKey {
    return `projections.estimates.${estimate}`;
  }
}
