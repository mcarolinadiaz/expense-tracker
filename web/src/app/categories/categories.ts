import { Component } from '@angular/core';
import { APP_TEXT } from '../core/constants/app-text';
import { NavbarActions } from '../navbar/navbar-actions';

@Component({
  imports: [NavbarActions],
  selector: 'app-categories',
  styleUrl: './categories.css',
  templateUrl: './categories.html',
})
export class Categories {
  protected readonly actionText = APP_TEXT.actions;
}
