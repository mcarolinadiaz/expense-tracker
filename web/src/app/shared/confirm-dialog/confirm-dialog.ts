import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, inject } from '@angular/core';
import { APP_TEXT } from '../../core/constants/app-text';

export const CONFIRM_DIALOG_IDS = {
  title: 'confirm-dialog-title',
  message: 'confirm-dialog-message',
  cancel: 'confirm-dialog-cancel',
  confirm: 'confirm-dialog-confirm',
} as const;

export const CONFIRM_DIALOG_TONE = {
  primary: 'primary',
  danger: 'danger',
} as const;

export type ConfirmDialogTone = (typeof CONFIRM_DIALOG_TONE)[keyof typeof CONFIRM_DIALOG_TONE];

export interface ConfirmDialogData {
  title: string;
  message: string;
  /** The label of the button that confirms, such as "Delete all data". */
  confirm: string;
  /** `danger` for an action that deletes something and can't be undone. */
  tone: ConfirmDialogTone;
}

/** A modal that asks to confirm an action. Open it with `ConfirmDialogService`. */
@Component({
  selector: 'app-confirm-dialog',
  styleUrl: './confirm-dialog.css',
  template: `
    <h2 class="confirm-dialog-title" [id]="ids.title">{{ data.title }}</h2>
    <p class="confirm-dialog-message" [id]="ids.message">{{ data.message }}</p>
    <div class="confirm-dialog-actions">
      <button type="button" class="btn btn-secondary" [id]="ids.cancel" (click)="close(false)">
        {{ text.actions.cancel }}
      </button>
      <button
        type="button"
        class="btn"
        [class.btn-danger]="data.tone === tones.danger"
        [class.btn-primary]="data.tone === tones.primary"
        [id]="ids.confirm"
        (click)="close(true)"
      >
        {{ data.confirm }}
      </button>
    </div>
  `,
})
export class ConfirmDialog {
  private readonly dialogRef = inject<DialogRef<boolean>>(DialogRef);

  protected readonly data = inject<ConfirmDialogData>(DIALOG_DATA);
  protected readonly text = APP_TEXT;
  protected readonly ids = CONFIRM_DIALOG_IDS;
  protected readonly tones = CONFIRM_DIALOG_TONE;

  protected close(confirmed: boolean): void {
    this.dialogRef.close(confirmed);
  }
}
