import { Component } from '@angular/core';
import { APP_TEXT } from '../core/constants/app-text';
import { NavbarActions } from '../navbar/navbar-actions';

@Component({
  imports: [NavbarActions],
  selector: 'app-transactions',
  styleUrl: './transactions.css',
  templateUrl: './transactions.html',
})
export class Transactions {
  protected readonly actionText = APP_TEXT.actions;
}
