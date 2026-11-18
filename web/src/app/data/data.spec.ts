import { ComponentFixture, TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { CategoryService } from '../categories/category.service';
import { AXE_TEST_TIMEOUT_MS, expectNoAxeViolations } from '../core/axe.testing';
import { provideFixedClock } from '../core/clock.testing';
import { APP_TEXT } from '../core/constants/app-text';
import { AppDb } from '../core/db/app-db';
import { FileDownload } from '../core/file-download.service';
import { BACKUP_ERROR, BACKUP_FILE_TYPE, parseBackup } from './backup';
import { CONFIRM_DIALOG_IDS } from '../shared/confirm-dialog/confirm-dialog';
import { BackupService } from './backup.service';
import { Data, DATA_IDS } from './data';

describe('Data', () => {
  let fixture: ComponentFixture<Data>;
  let element: HTMLElement;
  let save: ReturnType<typeof vi.fn<(content: Blob, fileName: string) => void>>;

  beforeEach(() => {
    save = vi.fn();
    TestBed.configureTestingModule({
      providers: [provideFixedClock('2026-11-18'), { provide: FileDownload, useValue: { save } }],
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
        `${APP_TEXT.data.transactions}: 0`,
        `${APP_TEXT.data.categories}: 1`,
        `${APP_TEXT.data.fixedCosts}: 0`,
      ]);
      expect(element.textContent).toContain(`${APP_TEXT.data.lastBackup}: ${APP_TEXT.data.never}`);
      expect(element.querySelector('a')?.getAttribute('href')).toBe(
        'http://127.0.0.1:8000/docs/api',
      );
      await expectNoAxeViolations(element);
    },
    AXE_TEST_TIMEOUT_MS,
  );

  it('should download a backup and remember it was today', async () => {
    await firstValueFrom(TestBed.inject(CategoryService).add('Comida'));
    await render();

    button(APP_TEXT.data.exportBackup).click();

    await settleUntil(() => expect(save).toHaveBeenCalledTimes(1));
    const [content, fileName] = save.mock.calls[0];
    expect(fileName).toBe('expense-tracker-backup-2026-11-18.json');
    expect(parseBackup(await content.text()).categories).toEqual([
      { id: expect.any(Number), name: 'Comida' },
    ]);
    await settleUntil(() =>
      expect(element.textContent).toContain(`${APP_TEXT.data.lastBackup}: ${APP_TEXT.data.today}`),
    );
  });

  it(
    'should ask before importing, and import the chosen backup',
    async () => {
      await firstValueFrom(TestBed.inject(CategoryService).add('Comida'));
      const backup = await firstValueFrom(TestBed.inject(BackupService).export());
      await firstValueFrom(TestBed.inject(CategoryService).add('Viajes'));
      await render();
      expect(counts()[1]).toBe(`${APP_TEXT.data.categories}: 2`);

      button(APP_TEXT.data.importBackup).click();
      await settleUntil(() => expect(element.textContent).toContain(APP_TEXT.data.confirmImport));
      expect(document.activeElement?.id).toBe(DATA_IDS.chooseFile);
      await expectNoAxeViolations(element);

      chooseFile(JSON.stringify(backup));

      await settleUntil(() => expect(counts()[1]).toBe(`${APP_TEXT.data.categories}: 1`));
      expect(element.textContent).not.toContain(APP_TEXT.data.confirmImport);
    },
    AXE_TEST_TIMEOUT_MS,
  );

  it(
    'should explain why a file can not be imported and change nothing',
    async () => {
      await firstValueFrom(TestBed.inject(CategoryService).add('Comida'));
      await render();

      button(APP_TEXT.data.importBackup).click();
      await settleUntil(() => expect(element.textContent).toContain(APP_TEXT.data.confirmImport));
      chooseFile('not a backup');

      await settleUntil(() =>
        expect(element.textContent).toContain(APP_TEXT.backupErrors[BACKUP_ERROR.invalid]),
      );
      expect(counts()[1]).toBe(`${APP_TEXT.data.categories}: 1`);
      await expectNoAxeViolations(element);
    },
    AXE_TEST_TIMEOUT_MS,
  );

  it(
    'should delete everything only after confirming',
    async () => {
      await firstValueFrom(TestBed.inject(CategoryService).add('Comida'));
      await render();

      const wipeButton = button(APP_TEXT.data.deleteAll);
      wipeButton.click();
      await settleUntil(() => expect(dialog()?.textContent).toContain(APP_TEXT.data.confirmWipe));
      expect(dialog()!.closest('[role="alertdialog"]')).not.toBeNull();
      expect(document.activeElement?.id).toBe(CONFIRM_DIALOG_IDS.cancel);
      await expectNoAxeViolations();

      document.querySelector<HTMLButtonElement>(`#${CONFIRM_DIALOG_IDS.cancel}`)!.click();
      await settleUntil(() => expect(dialog()).toBeNull());
      expect(counts()[1]).toBe(`${APP_TEXT.data.categories}: 1`);

      wipeButton.click();
      await settleUntil(() => expect(dialog()).not.toBeNull());
      document.querySelector<HTMLButtonElement>(`#${CONFIRM_DIALOG_IDS.confirm}`)!.click();

      await settleUntil(() => expect(counts()[1]).toBe(`${APP_TEXT.data.categories}: 0`));
      expect(dialog()).toBeNull();
    },
    AXE_TEST_TIMEOUT_MS,
  );
});
