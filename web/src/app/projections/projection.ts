import { YearMonth } from '../core/dates';
import { Cents } from '../core/money';
import { FixedCost } from './fixed-cost';

/** How many months a projection covers: the current month and the next 12. */
export const PROJECTION_MONTHS = 13;

export interface ProjectionCell {
  month: YearMonth;
  amount: Cents;
  increases: boolean;
  /** True when the amount uses an estimated IPC, because there is no official data for that month yet. */
  estimated: boolean;
}

export interface ProjectionRow {
  cost: FixedCost;
  cells: ProjectionCell[];
}

export const IPC_STATUS = {
  available: 'available',
  unavailable: 'unavailable',
} as const;

/** Whether the IPC data could be read. While it can't, costs that increase by IPC stay the same. */
export type IpcStatus =
  | {
      status: typeof IPC_STATUS.available;
      lastMonth: YearMonth | null;
      monthlyEstimate: string;
      source: string;
    }
  | { status: typeof IPC_STATUS.unavailable };

/** The fixed costs of one currency, month by month. */
export interface Projection {
  months: YearMonth[];
  rows: ProjectionRow[];
  totals: Cents[];
  ipc: IpcStatus;
}
