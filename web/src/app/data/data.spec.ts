import { ComponentFixture, TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { CategoryService } from '../categories/category.service';
import { AXE_TEST_TIMEOUT_MS, expectNoAxeViolations } from '../core/axe.testing';
import { provideFixedClock } from '../core/clock.testing';
import en from '../core/i18n/en.json';
import { provideTestTranslations } from '../core/i18n/translations.testing';
import { AppDb } from '../core/db/app-db';
import { FileDownload } from '../core/file-download.service';
import { BACKUP_ERROR, BACKUP_FILE_TYPE, parseBackup } from './backup';
import { CONFIRM_DIALOG_IDS } from '../shared/confirm-dialog/confirm-dialog';
import { BackupService } from './backup.service';
import { Data, DATA_IDS } from './data';
import { STORAGE_MANAGER } from './storage-persistence.service';

describe('Data', () => {
  let fixture: ComponentFixture<Data>;
  let element: HTMLElement;
  let save: ReturnType<typeof vi.fn<(content: Blob, fileName: string) => void>>;

  beforeEach(() => {
    save = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideTestTranslations(),
        provideFixedClock('2026-11-18'),
        { provide: FileDownload, useValue: { save } },
      ],
    });
  });

  afterEach(async () => {
    await TestBed.inject(AppDb).delete();
  });

  async function render(): Promise<void> {
    fixture = TestBed.createComponent(Data);
    element = fixture.nativeElement;
    await settleUntil(() => expect(counts()).toHaveLength(3));
  }

  async function settleUntil(assertion: () => void): Promise<void> {
    await vi.waitFor(async () => {
      await new Promise((resolve) => setTimeout(resolve));
      await fixture.whenStable();
      assertion();
    });
  }

  function counts(): string[] {
    return Array.from(element.querySelectorAll('.data-count')).map(
      (item) =>
        `${item.querySelector('dt')?.textContent?.trim()}: ${item.querySelector('dd')?.textContent?.trim()}`,
    );
  }

  function dialog(): HTMLElement | null {
    return document.querySelector('app-confirm-dialog');
  }

  function button(label: string): HTMLButtonElement {
    return Array.from(element.querySelectorAll<HTMLButtonElement>('button')).find(
      (candidate) => candidate.textContent?.trim() === label,
    )!;
  }

  function chooseFile(text: string): void {
    const input = element.querySelector<HTMLInputElement>('input[type="file"]')!;
    const file = new File([text], 'backup.json', { type: BACKUP_FILE_TYPE });
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new Event('change'));
  }

  it(
    'should show what the device holds and that there is no backup yet',
    async () => {
      await firstValueFrom(TestBed.inject(CategoryService).add('Comida'));
      await render();

      expect(counts()).toEqual([
        `${en.data.transactions}: 0`,
        `${en.data.categories}: 1`,
        `${en.data.fixedCosts}: 0`,
      ]);
      expect(element.textContent).toContain(`${en.data.lastBackup}: ${en.data.never}`);
      expect(element.querySelector('a')?.getAttribute('href')).toBe(
        'http://127.0.0.1:8000/docs/api',
      );
      await expectNoAxeViolations(element);
    },
    AXE_TEST_TIMEOUT_MS,
  );

  it(
    'should ask the browser to keep the data and say whether it will',
    async () => {
      const persist = vi.fn(() => Promise.resolve(true));
      TestBed.overrideProvider(STORAGE_MANAGER, {
        useValue: { persisted: () => Promise.resolve(false), persist },
      });
      await render();
      await settleUntil(() => expect(element.textContent).toContain(en.data.storageNotPersisted));
      await expectNoAxeViolations(element);

      button(en.data.keepData).click();

      await settleUntil(() => expect(element.textContent).toContain(en.data.storagePersisted));
      expect(persist).toHaveBeenCalledTimes(1);
      expect(button(en.data.keepData)).toBeUndefined();
    },
    AXE_TEST_TIMEOUT_MS,
  );

  it('should download a backup and remember it was today', async () => {
    await firstValueFrom(TestBed.inject(CategoryService).add('Comida'));
    await render();

    button(en.data.exportBackup).click();

    await settleUntil(() => expect(save).toHaveBeenCalledTimes(1));
    const [content, fileName] = save.mock.calls[0];
    expect(fileName).toBe('expense-tracker-backup-2026-11-18.json');
    expect(parseBackup(await content.text()).categories).toEqual([
      { id: expect.any(Number), name: 'Comida' },
    ]);
    await settleUntil(() =>
      expect(element.textContent).toContain(`${en.data.lastBackup}: ${en.data.today}`),
    );
  });

  it(
    'should ask before importing, and import the chosen backup',
    async () => {
      await firstValueFrom(TestBed.inject(CategoryService).add('Comida'));
      const backup = await firstValueFrom(TestBed.inject(BackupService).export());
      await firstValueFrom(TestBed.inject(CategoryService).add('Viajes'));
      await render();
      expect(counts()[1]).toBe(`${en.data.categories}: 2`);

      button(en.data.importBackup).click();
      await settleUntil(() => expect(element.textContent).toContain(en.data.confirmImport));
      expect(document.activeElement?.id).toBe(DATA_IDS.chooseFile);
      await expectNoAxeViolations(element);

      chooseFile(JSON.stringify(backup));

      await settleUntil(() => expect(counts()[1]).toBe(`${en.data.categories}: 1`));
      expect(element.textContent).not.toContain(en.data.confirmImport);
    },
    AXE_TEST_TIMEOUT_MS,
  );

  it(
    'should explain why a file can not be imported and change nothing',
    async () => {
      await firstValueFrom(TestBed.inject(CategoryService).add('Comida'));
      await render();

      button(en.data.importBackup).click();
      await settleUntil(() => expect(element.textContent).toContain(en.data.confirmImport));
      chooseFile('not a backup');

      await settleUntil(() =>
        expect(element.textContent).toContain(en.backupErrors[BACKUP_ERROR.invalid]),
      );
      expect(counts()[1]).toBe(`${en.data.categories}: 1`);
      await expectNoAxeViolations(element);
    },
    AXE_TEST_TIMEOUT_MS,
  );

  it(
    'should delete everything only after confirming',
    async () => {
      await firstValueFrom(TestBed.inject(CategoryService).add('Comida'));
      await render();

      const wipeButton = button(en.data.deleteAll);
      wipeButton.click();
      await settleUntil(() => expect(dialog()?.textContent).toContain(en.data.confirmWipe));
      expect(dialog()!.closest('[role="alertdialog"]')).not.toBeNull();
      expect(document.activeElement?.id).toBe(CONFIRM_DIALOG_IDS.cancel);
      await expectNoAxeViolations();

      document.querySelector<HTMLButtonElement>(`#${CONFIRM_DIALOG_IDS.cancel}`)!.click();
      await settleUntil(() => expect(dialog()).toBeNull());
      expect(counts()[1]).toBe(`${en.data.categories}: 1`);

      wipeButton.click();
      await settleUntil(() => expect(dialog()).not.toBeNull());
      document.querySelector<HTMLButtonElement>(`#${CONFIRM_DIALOG_IDS.confirm}`)!.click();

      await settleUntil(() => expect(counts()[1]).toBe(`${en.data.categories}: 0`));
      expect(dialog()).toBeNull();
    },
    AXE_TEST_TIMEOUT_MS,
  );
});
