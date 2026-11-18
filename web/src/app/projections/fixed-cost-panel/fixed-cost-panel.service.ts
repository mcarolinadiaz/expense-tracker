import { Dialog } from '@angular/cdk/dialog';
import { createGlobalPositionStrategy } from '@angular/cdk/overlay';
import { inject, Injector, Service } from '@angular/core';
import { Clock } from '../../core/clock.service';
import { Currency } from '../../core/money';
import { FIXED_COST_PANEL_IDS, FixedCostPanel, FixedCostPanelData } from './fixed-cost-panel';

const PANEL_WIDTH = '28rem';
const PANEL_EDGE = '0';

@Service()
export class FixedCostPanelService {
  private readonly dialog = inject(Dialog);
  private readonly injector = inject(Injector);
  private readonly clock = inject(Clock);

  /** Opens the side panel to add a fixed cost, starting in the given currency. */
  open(currency: Currency): void {
    const data: FixedCostPanelData = { currency, currentMonth: this.clock.currentMonth() };

    this.dialog.open(FixedCostPanel, {
      data,
      ariaLabelledBy: FIXED_COST_PANEL_IDS.title,
      autoFocus: `#${FIXED_COST_PANEL_IDS.name}`,
      backdropClass: 'panel-backdrop',
      width: PANEL_WIDTH,
      maxWidth: '100%',
      height: '100%',
      positionStrategy: createGlobalPositionStrategy(this.injector).end(PANEL_EDGE).top(PANEL_EDGE),
    });
  }
}
