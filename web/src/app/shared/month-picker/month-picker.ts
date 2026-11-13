import { Component, computed, inject, LOCALE_ID } from '@angular/core';
import { APP_TEXT } from '../../core/constants/app-text';
import { fromIsoDate } from '../../core/dates';
import { SelectedMonthService } from '../services/selected-month.service';

@Component({
  selector: 'app-month-picker',
  styleUrl: './month-picker.css',
  templateUrl: './month-picker.html',
})
export class MonthPicker {
  private readonly locale = inject(LOCALE_ID);

  protected readonly selected = inject(SelectedMonthService);
  protected readonly text = APP_TEXT.month;
  protected readonly label = computed(() => {
    const label = new Intl.DateTimeFormat(this.locale, { month: 'long', year: 'numeric' }).format(
      fromIsoDate(this.selected.month()),
    );
    // Spanish writes month names in lower case, but the label starts a line.
    return label.charAt(0).toLocaleUpperCase(this.locale) + label.slice(1);
  });
}
