import { Category, CATEGORY_NAME_MAX_LENGTH } from '../categories/category';
import { IsoDate } from '../core/dates';
import { parsePercent } from '../core/decimal';
import { APP_LOCALE } from '../core/locale-format.service';
import { CURRENCIES, Currency, MAX_AMOUNT_CENTS } from '../core/money';
import {
  FIXED_COST_MAX_PERCENT,
  FIXED_COST_NAME_MAX_LENGTH,
  FixedCost,
  FixedCostIncrease,
  INCREASE_EVERY_OPTIONS,
  INCREASE_RULE,
} from '../projections/fixed-cost';
import {
  Transaction,
  TRANSACTION_DESCRIPTION_MAX_LENGTH,
  TRANSACTION_TYPE,
  TransactionType,
} from '../transactions/transaction';

/** Marks a file as a backup of this app. */
export const BACKUP_FORMAT = 'expense-tracker-backup';

/** The version of the backup format. Raise it when the stored records change. */
export const BACKUP_VERSION = 1;

/** The largest backup file the app reads, so a wrong file can't freeze the page. */
export const BACKUP_MAX_BYTES = 20 * 1024 * 1024;

export const BACKUP_FILE_TYPE = 'application/json';

/** The name of a backup file exported on a day, such as `expense-tracker-backup-2026-11-18.json`. */
export function backupFileName(day: IsoDate): string {
  return `${BACKUP_FORMAT}-${day}.json`;
}

/** All the user data of the device, as written to a backup file. */
export interface Backup {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  exportedOn: IsoDate;
  categories: Category[];
  transactions: Transaction[];
  fixedCosts: FixedCost[];
}

export const BACKUP_ERROR = {
  invalid: 'invalid',
  newerVersion: 'newerVersion',
  tooLarge: 'tooLarge',
} as const;

export type BackupErrorCode = (typeof BACKUP_ERROR)[keyof typeof BACKUP_ERROR];

/** Why a file can't be imported. The code lets the interface show its own translated message. */
export class BackupError extends Error {
  constructor(readonly code: BackupErrorCode) {
    super(code);
  }
}

const ISO_DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const YEAR_MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const JSON_INDENT = 2;

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isId(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) > 0;
}

function isCents(value: unknown): value is number {
  return isId(value) && (value as number) <= MAX_AMOUNT_CENTS;
}

function isName(value: unknown, maxLength: number): value is string {
  return (
    typeof value === 'string' &&
    value.trim() === value &&
    value.length > 0 &&
    value.length <= maxLength
  );
}

function isOneOf<T>(options: readonly T[], value: unknown): value is T {
  return options.includes(value as T);
}

function isCurrency(value: unknown): value is Currency {
  return isOneOf(CURRENCIES, value);
}

function isMatch(pattern: RegExp, value: unknown): value is string {
  return typeof value === 'string' && pattern.test(value);
}

/** A percentage in the plain decimal text the app stores, such as `"8.5"`. */
function isPercent(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    parsePercent(value, APP_LOCALE.enUS, FIXED_COST_MAX_PERCENT) === value
  );
}

function invalid(): never {
  throw new BackupError(BACKUP_ERROR.invalid);
}

function readCategory(value: unknown): Category {
  if (!isRecord(value) || !isId(value['id']) || !isName(value['name'], CATEGORY_NAME_MAX_LENGTH)) {
    return invalid();
  }
  return { id: value['id'], name: value['name'] };
}

function readTransaction(value: unknown, categoryIds: Set<number>): Transaction {
  if (
    !isRecord(value) ||
    !isId(value['id']) ||
    !isMatch(ISO_DATE, value['date']) ||
    !isOneOf<TransactionType>(Object.values(TRANSACTION_TYPE), value['type']) ||
    !isCurrency(value['currency']) ||
    !isCents(value['amount']) ||
    !isId(value['categoryId']) ||
    !categoryIds.has(value['categoryId']) ||
    typeof value['description'] !== 'string' ||
    value['description'].length > TRANSACTION_DESCRIPTION_MAX_LENGTH
  ) {
    return invalid();
  }
  return {
    id: value['id'],
    date: value['date'],
    type: value['type'],
    currency: value['currency'],
    amount: value['amount'],
    categoryId: value['categoryId'],
    description: value['description'],
  };
}

function readIncrease(value: unknown): FixedCostIncrease {
  if (!isRecord(value)) {
    return invalid();
  }
  switch (value['rule']) {
    case INCREASE_RULE.ipc:
      return { rule: INCREASE_RULE.ipc };
    case INCREASE_RULE.percent:
      return isPercent(value['percent'])
        ? { rule: INCREASE_RULE.percent, percent: value['percent'] }
        : invalid();
    case INCREASE_RULE.amount:
      return isCents(value['amount'])
        ? { rule: INCREASE_RULE.amount, amount: value['amount'] }
        : invalid();
    default:
      return invalid();
  }
}

function readFixedCost(value: unknown): FixedCost {
  if (
    !isRecord(value) ||
    !isId(value['id']) ||
    !isName(value['name'], FIXED_COST_NAME_MAX_LENGTH) ||
    !isCurrency(value['currency']) ||
    !isCents(value['amount']) ||
    !isOneOf<number>(INCREASE_EVERY_OPTIONS, value['every']) ||
    !isMatch(YEAR_MONTH, value['lastIncrease'])
  ) {
    return invalid();
  }
  return {
    id: value['id'],
    name: value['name'],
    currency: value['currency'],
    amount: value['amount'],
    every: value['every'],
    lastIncrease: value['lastIncrease'],
    increase: readIncrease(value['increase']),
  };
}

function readList<T>(value: unknown, read: (item: unknown) => T & { id: number }): T[] {
  if (!Array.isArray(value)) {
    return invalid();
  }
  const items = value.map(read);
  if (new Set(items.map((item) => item.id)).size !== items.length) {
    return invalid();
  }
  return items;
}

/**
 * Reads the text of a backup file. It checks every record, and that each transaction points to a
 * category in the file, and fails with a `BackupError` instead of returning anything doubtful.
 * Only the known fields are kept.
 */
export function parseBackup(text: string): Backup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return invalid();
  }

  if (
    !isRecord(data) ||
    data['format'] !== BACKUP_FORMAT ||
    !Number.isSafeInteger(data['version'])
  ) {
    return invalid();
  }
  if ((data['version'] as number) > BACKUP_VERSION) {
    throw new BackupError(BACKUP_ERROR.newerVersion);
  }
  if (data['version'] !== BACKUP_VERSION || !isMatch(ISO_DATE, data['exportedOn'])) {
    return invalid();
  }

  const categories = readList(data['categories'], readCategory);
  const names = new Set(categories.map((category) => category.name.toLocaleLowerCase()));
  if (names.size !== categories.length) {
    return invalid();
  }
  const categoryIds = new Set(categories.map((category) => category.id));
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedOn: data['exportedOn'],
    categories,
    transactions: readList(data['transactions'], (item) => readTransaction(item, categoryIds)),
    fixedCosts: readList(data['fixedCosts'], readFixedCost),
  };
}

/** The text of a backup file, indented so a person can read it. */
export function writeBackup(backup: Backup): string {
  return JSON.stringify(backup, null, JSON_INDENT);
}
