import { Provider, signal } from '@angular/core';
import { ScreenSize } from './screen-size.service';

/** Makes tests render the phone markup, since jsdom has no media queries. */
export function providePhoneScreen(): Provider {
  return {
    provide: ScreenSize,
    useValue: { isPhone: signal(true), isBelowDesktop: signal(true) },
  };
}
