import { Component, computed, inject } from '@angular/core';
import { APP_TEXT } from '../../core/constants/app-text';
import { LocaleFormat } from '../../core/locale-format.service';
import { SelectedMonthService } from './selected-month.service';

@Component({
  selector: 'app-month-picker',
  styleUrl: './month-picker.css',
  templateUrl: './month-picker.html',
})
export class MonthPicker {
  private readonly format = inject(LocaleFormat);

  protected readonly selected = inject(SelectedMonthService);
  protected readonly text = APP_TEXT.month;
  protected readonly label = computed(() => this.format.monthName(this.selected.month()));
}
