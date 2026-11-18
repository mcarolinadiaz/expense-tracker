import { Component } from '@angular/core';

/**
 * A spinning ring that shows something is loading. It's hidden from screen readers, so place it
 * next to a visible or `role="status"` text that says what is loading. With reduced motion it
 * stays still.
 */
@Component({
  selector: 'app-spinner',
  host: { class: 'spinner', 'aria-hidden': 'true' },
  template: '',
})
export class Spinner {}
