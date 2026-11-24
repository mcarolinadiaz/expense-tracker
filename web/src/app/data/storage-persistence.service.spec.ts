import { TestBed } from '@angular/core/testing';
import { STORAGE_MANAGER, STORAGE_STATUS, StoragePersistence } from './storage-persistence.service';

describe('StoragePersistence', () => {
  function create(storage: Partial<StorageManager> | null): StoragePersistence {
    TestBed.configureTestingModule({
      providers: [{ provide: STORAGE_MANAGER, useValue: storage }],
    });
    return TestBed.inject(StoragePersistence);
  }

  it('should be unsupported without a storage manager', async () => {
    const service = create(null);

    await service.request();

    expect(service.status()).toBe(STORAGE_STATUS.unsupported);
  });

  it('should read whether the data is already kept', async () => {
    const service = create({ persisted: () => Promise.resolve(true) });

    expect(service.status()).toBe(STORAGE_STATUS.checking);
    await vi.waitFor(() => expect(service.status()).toBe(STORAGE_STATUS.persisted));
  });

  it('should keep the data when the browser grants it', async () => {
    const service = create({
      persisted: () => Promise.resolve(false),
      persist: () => Promise.resolve(true),
    });
    await vi.waitFor(() => expect(service.status()).toBe(STORAGE_STATUS.notPersisted));

    await service.request();

    expect(service.status()).toBe(STORAGE_STATUS.persisted);
  });

  it('should say when the browser refuses', async () => {
    const service = create({
      persisted: () => Promise.resolve(false),
      persist: () => Promise.resolve(false),
    });

    await service.request();

    expect(service.status()).toBe(STORAGE_STATUS.denied);
  });
});
