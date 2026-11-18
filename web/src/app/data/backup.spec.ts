import { CURRENCY } from '../core/money';
import { INCREASE_RULE } from '../projections/fixed-cost';
import { TRANSACTION_TYPE } from '../transactions/transaction';
import {
  Backup,
  BACKUP_ERROR,
  BACKUP_FORMAT,
  BACKUP_VERSION,
  BackupError,
  backupFileName,
  parseBackup,
  writeBackup,
} from './backup';

const backup: Backup = {
  format: BACKUP_FORMAT,
  version: BACKUP_VERSION,
  exportedOn: '2026-11-18',
  categories: [{ id: 1, name: 'Comida' }],
  transactions: [
    {
      id: 7,
      date: '2026-11-06',
      type: TRANSACTION_TYPE.expense,
      currency: CURRENCY.ARS,
      amount: 125050,
      categoryId: 1,
      description: 'Taxi',
    },
  ],
  fixedCosts: [
    {
      id: 3,
      name: 'Alquiler',
      currency: CURRENCY.ARS,
      amount: 62000000,
      every: 4,
      lastIncrease: '2026-08',
      increase: { rule: INCREASE_RULE.percent, percent: '8.5' },
    },
  ],
};

function errorOf(text: string): string | undefined {
  try {
    parseBackup(text);
  } catch (error) {
    return error instanceof BackupError ? error.code : 'unexpected';
  }
  return undefined;
}

function withChange(change: (data: Record<string, unknown>) => void): string {
  const data = JSON.parse(writeBackup(backup)) as Record<string, unknown>;
  change(data);
  return JSON.stringify(data);
}

describe('backup', () => {
  it('should read back what it writes', () => {
    expect(parseBackup(writeBackup(backup))).toEqual(backup);
  });

  it('should name the file after the day', () => {
    expect(backupFileName('2026-11-18')).toBe('expense-tracker-backup-2026-11-18.json');
  });

  it('should drop fields it does not know', () => {
    const text = withChange((data) => {
      data['extra'] = true;
      (data['categories'] as Record<string, unknown>[])[0]['color'] = 'red';
    });

    expect(parseBackup(text)).toEqual(backup);
  });

  it('should reject files that are not a valid backup', () => {
    const invalidFiles = [
      'not json',
      '[]',
      withChange((data) => (data['format'] = 'other-app')),
      withChange((data) => delete data['transactions']),
      withChange(
        (data) => ((data['transactions'] as Record<string, unknown>[])[0]['categoryId'] = 99),
      ),
      withChange(
        (data) => ((data['transactions'] as Record<string, unknown>[])[0]['amount'] = 12.5),
      ),
      withChange(
        (data) => ((data['transactions'] as Record<string, unknown>[])[0]['date'] = '2026-13-01'),
      ),
      withChange(
        (data) => ((data['transactions'] as Record<string, unknown>[])[0]['currency'] = 'EUR'),
      ),
      withChange((data) => (data['categories'] as unknown[]).push({ id: 2, name: 'comida' })),
      withChange((data) => (data['categories'] as unknown[]).push({ id: 1, name: 'Viajes' })),
      withChange((data) => ((data['fixedCosts'] as Record<string, unknown>[])[0]['every'] = 5)),
      withChange(
        (data) =>
          ((data['fixedCosts'] as Record<string, unknown>[])[0]['increase'] = {
            rule: INCREASE_RULE.percent,
            percent: '150',
          }),
      ),
    ];

    for (const text of invalidFiles) {
      expect(errorOf(text), text).toBe(BACKUP_ERROR.invalid);
    }
  });

  it('should ask to update the app for a backup from a newer version', () => {
    expect(errorOf(withChange((data) => (data['version'] = BACKUP_VERSION + 1)))).toBe(
      BACKUP_ERROR.newerVersion,
    );
  });
});
