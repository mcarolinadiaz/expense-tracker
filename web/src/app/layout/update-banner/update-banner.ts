import { Component, inject } from '@angular/core';
import { AppUpdate } from '../../core/app-update.service';
import { TextPipe } from '../../shared/pipes/text.pipe';

/** Offers to reload the page once a new version of the app is ready. */
@Component({
  imports: [TextPipe],
  selector: 'app-update-banner',
  styleUrl: './update-banner.css',
  template: `
    <div role="status">
      @if (update.ready()) {
        <div class="update-banner">
          <span>{{ 'update.ready' | text }}</span>
          <button type="button" class="btn btn-primary" (click)="update.reload()">
            {{ 'update.reload' | text }}
          </button>
        </div>
      }
    </div>
  `,
})
export class UpdateBanner {
  protected readonly update = inject(AppUpdate);
}
