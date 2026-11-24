import { Dialog } from '@angular/cdk/dialog';
import { createGlobalPositionStrategy } from '@angular/cdk/overlay';
import { Injector } from '@angular/core';
import { SIDE_BAR_DRAWER, SideBar } from '../side-bar/side-bar';

const DRAWER = {
  width: '16.5rem',
  edge: '0',
} as const;

/**
 * Opens the side bar as a drawer from the start edge. `TopBar` imports this file on demand, so the
 * CDK dialog and overlay code load only when the menu first opens.
 */
export function openMenuDrawer(injector: Injector, ariaLabel: string): void {
  injector.get(Dialog).open(SideBar, {
    providers: (drawer) => [{ provide: SIDE_BAR_DRAWER, useValue: drawer }],
    ariaLabel,
    backdropClass: 'panel-backdrop',
    width: DRAWER.width,
    maxWidth: '100%',
    height: '100%',
    positionStrategy: createGlobalPositionStrategy(injector).start(DRAWER.edge).top(DRAWER.edge),
  });
}
