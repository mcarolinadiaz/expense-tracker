import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';
import { Translator } from '../../core/i18n/translator.service';
import { NavbarActionsService } from './navbar-actions';

@Component({
  imports: [NgTemplateOutlet],
  selector: 'app-navbar',
  styleUrl: './navbar.css',
  templateUrl: './navbar.html',
})
export class Navbar {
  private readonly router = inject(Router);
  private readonly translator = inject(Translator);
  private readonly titleKey = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.activeRouteTitle()),
    ),
    { initialValue: this.activeRouteTitle() },
  );

  protected readonly actions = inject(NavbarActionsService).template;
  protected readonly title = computed(() => {
    const key = this.titleKey();
    return this.translator.isKey(key) ? this.translator.translate(key) : '';
  });

  private activeRouteTitle(): string | undefined {
    let route = this.router.routerState.snapshot.root;
    while (route.firstChild) {
      route = route.firstChild;
    }
    return route.title;
  }
}
