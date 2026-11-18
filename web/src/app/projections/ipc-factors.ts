import { YearMonth } from '../core/dates';

export const IPC_ESTIMATE = {
  average: 'average',
  custom: 'custom',
} as const;

export type IpcEstimate = (typeof IPC_ESTIMATE)[keyof typeof IPC_ESTIMATE];

/** How many recent months the average estimate may use. */
export const IPC_AVERAGE_MONTHS_OPTIONS = [3, 6, 12] as const;

export const IPC_DEFAULT_AVERAGE_MONTHS = 6;

/** The largest custom monthly rate the API accepts, in percent. */
export const IPC_MAX_CUSTOM_RATE = 50;

/** How the months without official IPC data are estimated. `rate` is plain decimal text, such as `"2.5"`. */
export type IpcEstimateSettings =
  | { estimate: typeof IPC_ESTIMATE.average; averageMonths: number }
  | { estimate: typeof IPC_ESTIMATE.custom; rate: string };

/** What the API needs to project one schedule of increases. It never includes amounts or names. */
export interface IpcFactorsQuery {
  from: YearMonth;
  months: number;
  every: number;
  lastIncrease: YearMonth;
  settings: IpcEstimateSettings;
}

/** The cumulative factor to multiply today's amount by in one month. `factor` is plain decimal text. */
export interface IpcFactorMonth {
  month: YearMonth;
  factor: string;
  increases: boolean;
  estimated: boolean;
}

export interface IpcFactors {
  months: IpcFactorMonth[];
  /** The latest month with official data. */
  lastMonth: YearMonth | null;
  /** The monthly rate used for estimated months, in percent, such as `"2.11"`. */
  monthlyEstimate: string;
  source: string;
}
