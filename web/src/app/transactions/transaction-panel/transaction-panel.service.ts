import { Dialog } from '@angular/cdk/dialog';
import { createGlobalPositionStrategy } from '@angular/cdk/overlay';
import { inject, Injector, Service } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CURRENCY } from '../../core/money';
import { Transaction, TRANSACTION_TYPE } from '../transaction';
import { CategoryService } from '../../categories/category.service';
import { Clock } from '../../core/clock.service';
import {
  TRANSACTION_PANEL_IDS,
  TransactionDefaults,
  TransactionPanel,
  TransactionPanelData,
} from './transaction-panel';

const PANEL_WIDTH = '28rem';
const PANEL_EDGE = '0';

@Service()
export class TransactionPanelService {
  private readonly dialog = inject(Dialog);
  private readonly injector = inject(Injector);
  private readonly categoryService = inject(CategoryService);
  private readonly clock = inject(Clock);

  private lastSaved: Omit<TransactionDefaults, 'date'> | null = null;

  /** Opens the side panel to add a transaction, or to edit the one passed. */
  async open(transaction?: Transaction): Promise<void> {
    const categories = await firstValueFrom(this.categoryService.list());
    const data: TransactionPanelData = {
      transaction,
      categories,
      defaults: {
        type: this.lastSaved?.type ?? TRANSACTION_TYPE.expense,
        currency: this.lastSaved?.currency ?? CURRENCY.ARS,
        categoryId: this.lastSaved?.categoryId ?? categories[0]?.id ?? null,
        date: this.clock.today(),
      },
      onSaved: (saved) => (this.lastSaved = saved),
    };

    this.dialog.open(TransactionPanel, {
      data,
      ariaLabelledBy: TRANSACTION_PANEL_IDS.title,
      autoFocus: `#${TRANSACTION_PANEL_IDS.amount}`,
      backdropClass: 'panel-backdrop',
      width: PANEL_WIDTH,
      maxWidth: '100%',
      height: '100%',
      positionStrategy: createGlobalPositionStrategy(this.injector).end(PANEL_EDGE).top(PANEL_EDGE),
    });
  }
}
