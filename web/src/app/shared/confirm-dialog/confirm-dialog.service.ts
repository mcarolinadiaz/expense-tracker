import { Dialog } from '@angular/cdk/dialog';
import { inject, Service } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CONFIRM_DIALOG_IDS, ConfirmDialog, ConfirmDialogData } from './confirm-dialog';

const DIALOG_WIDTH = '28rem';
const DIALOG_MAX_WIDTH = 'calc(100% - 2rem)';

@Service()
export class ConfirmDialogService {
  private readonly dialog = inject(Dialog);

  /**
   * Asks to confirm an action in a modal, and resolves to `true` only if the user confirms.
   * Escape, a click outside and Cancel resolve to `false`. It starts on Cancel, so pressing
   * Enter by mistake never confirms, and gives the focus back to what opened it.
   */
  async confirm(data: ConfirmDialogData): Promise<boolean> {
    const dialogRef = this.dialog.open<boolean>(ConfirmDialog, {
      data,
      role: 'alertdialog',
      ariaLabelledBy: CONFIRM_DIALOG_IDS.title,
      ariaDescribedBy: CONFIRM_DIALOG_IDS.message,
      autoFocus: `#${CONFIRM_DIALOG_IDS.cancel}`,
      backdropClass: 'panel-backdrop',
      width: DIALOG_WIDTH,
      maxWidth: DIALOG_MAX_WIDTH,
    });
    return (await firstValueFrom(dialogRef.closed)) === true;
  }
}
