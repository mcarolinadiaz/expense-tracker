import { DOCUMENT, inject, InjectionToken, Service, signal } from '@angular/core';

/** Whether the browser keeps the app's data when it runs out of space. */
export const STORAGE_STATUS = {
  checking: 'checking',
  unsupported: 'unsupported',
  persisted: 'persisted',
  notPersisted: 'notPersisted',
  denied: 'denied',
} as const;

export type StorageStatus = (typeof STORAGE_STATUS)[keyof typeof STORAGE_STATUS];

/** The browser's storage manager, or `null` where it doesn't exist, as in jsdom. */
export const STORAGE_MANAGER = new InjectionToken<StorageManager | null>('STORAGE_MANAGER', {
  providedIn: 'root',
  factory: () => inject(DOCUMENT).defaultView?.navigator.storage ?? null,
});

/**
 * Asks the browser to keep the app's data, so it isn't deleted when the device runs out of space.
 * Browsers decide on their own: some ask the user, others grant it to installed apps.
 */
@Service()
export class StoragePersistence {
  private readonly storage = inject(STORAGE_MANAGER);
  private readonly state = signal<StorageStatus>(
    this.storage ? STORAGE_STATUS.checking : STORAGE_STATUS.unsupported,
  );

  /** The current status, which starts as `checking` until the browser answers. */
  readonly status = this.state.asReadonly();

  constructor() {
    void this.storage
      ?.persisted()
      .then((persisted) =>
        this.state.set(persisted ? STORAGE_STATUS.persisted : STORAGE_STATUS.notPersisted),
      );
  }

  /** Asks the browser to keep the data. A refusal sets the status to `denied`. */
  async request(): Promise<void> {
    if (!this.storage) {
      return;
    }
    const granted = await this.storage.persist();
    this.state.set(granted ? STORAGE_STATUS.persisted : STORAGE_STATUS.denied);
  }
}
