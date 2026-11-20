import { CdkScrollable } from '@angular/cdk/scrolling';
import { Component, ElementRef, inject, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { Navbar } from './layout/navbar/navbar';
import { SideBar } from './layout/side-bar/side-bar';
import { UpdateBanner } from './layout/update-banner/update-banner';

@Component({
  imports: [CdkScrollable, Navbar, RouterOutlet, SideBar, UpdateBanner],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  private readonly content = viewChild.required<ElementRef<HTMLElement>>('content');

  constructor() {
    inject(Router)
      .events.pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.content().nativeElement.scrollTop = 0;
      });
  }
}
