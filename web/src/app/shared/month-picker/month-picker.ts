import { Component, computed, inject } from '@angular/core';
import { LocaleFormat } from '../../core/locale-format.service';
import { TextPipe } from '../pipes/text.pipe';
import { SelectedMonthService } from './selected-month.service';

@Component({
  imports: [TextPipe],
  selector: 'app-month-picker',
  styleUrl: './month-picker.css',
  templateUrl: './month-picker.html',
})
export class MonthPicker {
  private readonly format = inject(LocaleFormat);

  protected readonly selected = inject(SelectedMonthService);
  protected readonly label = computed(() => this.format.monthName(this.selected.month()));
}
