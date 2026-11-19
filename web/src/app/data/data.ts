import { LiveAnnouncer } from '@angular/cdk/a11y';
import {
  afterNextRender,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { API_DOCS_URL } from '../core/api-url';
import { Clock } from '../core/clock.service';
import { FileDownload } from '../core/file-download.service';
import { TextKey } from '../core/i18n/translations';
import { Translator } from '../core/i18n/translator.service';
import { LocaleFormat } from '../core/locale-format.service';
import {
  BACKUP_FILE_TYPE,
  BACKUP_MAX_MEGABYTES,
  BackupError,
  BackupErrorCode,
  backupFileName,
  writeBackup,
} from './backup';
import { CONFIRM_DIALOG_TONE } from '../shared/confirm-dialog/confirm-dialog';
import { ConfirmDialogService } from '../shared/confirm-dialog/confirm-dialog.service';
import { TextPipe } from '../shared/pipes/text.pipe';
import { BackupService } from './backup.service';

export const DATA_IDS = {
  exportButton: 'data-export',
  importButton: 'data-import',
  chooseFile: 'data-choose-file',
  importError: 'data-import-error',
} as const;

interface CountItem {
  label: string;
  count: number;
}

/** The Data page: what the device holds, backups, the API and deleting everything. */
@Component({
  imports: [TextPipe],
  selector: 'app-data',
  styleUrl: './data.css',
  templateUrl: './data.html',
})
export class Data {
  private readonly backupService = inject(BackupService);
  private readonly download = inject(FileDownload);
  private readonly format = inject(LocaleFormat);
  private readonly clock = inject(Clock);
  private readonly announcer = inject(LiveAnnouncer);
  private readonly translator = inject(Translator);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');

  protected readonly ids = DATA_IDS;
  protected readonly apiDocsUrl = inject(API_DOCS_URL);
  protected readonly fileType = BACKUP_FILE_TYPE;

  private readonly counts = toSignal(this.backupService.counts());
  protected readonly countItems = computed((): CountItem[] => {
    const counts = this.counts();
    if (!counts) {
      return [];
    }
    const label = (key: TextKey) => this.translator.translate(key);
    return [
      { label: label('data.transactions'), count: counts.transactions },
      { label: label('data.categories'), count: counts.categories },
      { label: label('data.fixedCosts'), count: counts.fixedCosts },
    ];
  });

  private readonly lastBackupDay = toSignal(this.backupService.lastBackup(), {
    initialValue: null,
  });
  protected readonly lastBackup = computed(() => {
    const day = this.lastBackupDay();
    if (!day) {
      return this.translator.translate('data.never');
    }
    return day === this.clock.today()
      ? this.translator.translate('data.today')
      : this.format.longDate(day);
  });

  protected readonly confirmingImport = signal(false);
  protected readonly importError = signal<BackupErrorCode | null>(null);
  protected readonly busy = signal(false);

  protected async exportBackup(): Promise<void> {
    const backup = await firstValueFrom(this.backupService.export());
    this.download.save(
      new Blob([writeBackup(backup)], { type: BACKUP_FILE_TYPE }),
      backupFileName(backup.exportedOn),
    );
    void this.announcer.announce(this.translator.translate('data.exported'));
  }

  protected askImport(): void {
    this.importError.set(null);
    this.confirmingImport.set(true);
    this.focusLater(DATA_IDS.chooseFile);
  }

  protected cancelImport(): void {
    this.confirmingImport.set(false);
    this.focusLater(DATA_IDS.importButton);
  }

  protected chooseFile(): void {
    this.fileInput().nativeElement.click();
  }

  /** Imports the chosen file. A file that isn't a valid backup changes nothing and shows why. */
  protected async importFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }

    this.busy.set(true);
    try {
      await firstValueFrom(this.backupService.import(file));
      void this.announcer.announce(this.translator.translate('data.imported'));
    } catch (error) {
      if (!(error instanceof BackupError)) {
        throw error;
      }
      this.importError.set(error.code);
    } finally {
      this.busy.set(false);
      this.confirmingImport.set(false);
      this.focusLater(DATA_IDS.importButton);
    }
  }

  /** Deletes all the data once the user confirms it in a modal. */
  protected async wipe(): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: this.translator.translate('data.confirmWipeTitle'),
      message: this.translator.translate('data.confirmWipe'),
      confirm: this.translator.translate('data.deleteAll'),
      tone: CONFIRM_DIALOG_TONE.danger,
    });
    if (!confirmed) {
      return;
    }
    await firstValueFrom(this.backupService.wipe());
    this.importError.set(null);
    void this.announcer.announce(this.translator.translate('data.wiped'));
  }

  /** Focuses an element once the view shows it, such as a button that only exists after a change. */
  private focusLater(id: string): void {
    afterNextRender(() => this.host.nativeElement.querySelector<HTMLElement>(`#${id}`)?.focus(), {
      injector: this.injector,
    });
  }

  protected errorText(code: BackupErrorCode): string {
    return this.translator.translate(`backupErrors.${code}`, { size: BACKUP_MAX_MEGABYTES });
  }
}
