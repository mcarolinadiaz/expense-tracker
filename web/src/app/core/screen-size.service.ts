import { BreakpointObserver } from '@angular/cdk/layout';
import { inject, Service, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

/** The window widths where a page changes its markup, matching Tailwind's `sm` and `lg`. */
export const SCREEN_QUERY = {
  phone: '(width < 40rem)',
  belowDesktop: '(width < 64rem)',
} as const;

/**
 * Whether the window is a phone or narrower than a desktop, as signals. Use it only when a page
 * needs different markup; layouts that only change their styles use container queries.
 */
@Service()
export class ScreenSize {
  private readonly breakpoints = inject(BreakpointObserver);

  readonly isPhone = this.matches(SCREEN_QUERY.phone);
  readonly isBelowDesktop = this.matches(SCREEN_QUERY.belowDesktop);

  private matches(query: string): Signal<boolean> {
    return toSignal(this.breakpoints.observe(query).pipe(map((state) => state.matches)), {
      initialValue: this.breakpoints.isMatched(query),
    });
  }
}
