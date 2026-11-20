import { TestBed } from '@angular/core/testing';
import { SwUpdate, VersionEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { AppUpdate } from '../../core/app-update.service';
import { AXE_TEST_TIMEOUT_MS, expectNoAxeViolations } from '../../core/axe.testing';
import en from '../../core/i18n/en.json';
import { provideTestTranslations } from '../../core/i18n/translations.testing';
import { UpdateBanner } from './update-banner';

const VERSION = { hash: 'abc' };

describe('UpdateBanner', () => {
  let versionUpdates: Subject<VersionEvent>;
  let reload: ReturnType<typeof vi.spyOn>;

  async function render(isEnabled = true) {
    versionUpdates = new Subject<VersionEvent>();
    TestBed.configureTestingModule({
      providers: [
        provideTestTranslations(),
        { provide: SwUpdate, useValue: { isEnabled, versionUpdates } },
      ],
    });
    reload = vi.spyOn(TestBed.inject(AppUpdate), 'reload').mockImplementation(() => undefined);
    const fixture = TestBed.createComponent(UpdateBanner);
    await fixture.whenStable();
    return fixture;
  }

  it('should show nothing until a new version is ready', async () => {
    const fixture = await render();

    versionUpdates.next({ type: 'VERSION_DETECTED', version: VERSION });
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('button')).toBeNull();
  });

  it(
    'should offer to reload once a new version is ready',
    async () => {
      const fixture = await render();
      const element = fixture.nativeElement as HTMLElement;

      versionUpdates.next({
        type: 'VERSION_READY',
        currentVersion: VERSION,
        latestVersion: VERSION,
      });
      await fixture.whenStable();

      expect(element.textContent).toContain(en.update.ready);
      await expectNoAxeViolations(element);

      element.querySelector<HTMLButtonElement>('button')!.click();
      expect(reload).toHaveBeenCalled();
    },
    AXE_TEST_TIMEOUT_MS,
  );

  it('should ignore updates when the service worker is off', async () => {
    const fixture = await render(false);

    versionUpdates.next({ type: 'VERSION_READY', currentVersion: VERSION, latestVersion: VERSION });
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('button')).toBeNull();
  });
});
