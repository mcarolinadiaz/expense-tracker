import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { APP_NAV_LINKS } from '../../core/constants/app-page-routes';
import { APP_TEXT } from '../../core/constants/app-text';

@Component({
  imports: [RouterLink, RouterLinkActive],
  selector: 'app-side-bar',
  styleUrl: './side-bar.css',
  templateUrl: './side-bar.html',
})
export class SideBar {
  protected readonly text = APP_TEXT;
  protected readonly links = APP_NAV_LINKS;
}
