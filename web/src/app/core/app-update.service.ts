import { DOCUMENT, inject, Service } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { EMPTY, filter, map } from 'rxjs';

/**
 * Tells when the service worker has downloaded a new version of the app, and switches to it by
 * reloading the page. Without a service worker, as in development, no version is ever ready.
 */
@Service()
export class AppUpdate {
  private readonly updates = inject(SwUpdate, { optional: true });
  private readonly document = inject(DOCUMENT);

  /** Whether a new version is downloaded and waiting for a reload. */
  readonly ready = toSignal(
    (this.updates?.isEnabled ? this.updates.versionUpdates : EMPTY).pipe(
      filter((event): event is VersionReadyEvent => event.type === 'VERSION_READY'),
      map(() => true),
    ),
    { initialValue: false },
  );

  /** Reloads the page, so the new version starts. */
  reload(): void {
    this.document.location.reload();
  }
}
