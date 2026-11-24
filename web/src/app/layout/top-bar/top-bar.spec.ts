import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AXE_TEST_TIMEOUT_MS, expectNoAxeViolations } from '../../core/axe.testing';
import { AppDb } from '../../core/db/app-db';
import en from '../../core/i18n/en.json';
import { provideTestTranslations } from '../../core/i18n/translations.testing';
import { TopBar } from './top-bar';

describe('TopBar', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideTestTranslations()],
    });
  });

  afterEach(async () => {
    await TestBed.inject(AppDb).delete();
  });

  function drawer(): HTMLElement | null {
    return document.querySelector('[role="dialog"] app-side-bar');
  }

  it(
    'should open the side bar as a drawer and close it again',
    async () => {
      const fixture = TestBed.createComponent(TopBar);
      await fixture.whenStable();
      const open = fixture.nativeElement.querySelector(
        `button[aria-label="${en.openMenu}"]`,
      ) as HTMLButtonElement;

      open.click();

      await vi.waitFor(async () => {
        await fixture.whenStable();
        expect(drawer()?.querySelector('.nav-link')).toBeTruthy();
      });
      expect(drawer()!.querySelectorAll('.nav-link')).toHaveLength(5);
      await expectNoAxeViolations();

      drawer()!.querySelector<HTMLButtonElement>(`button[aria-label="${en.closeMenu}"]`)!.click();
      await fixture.whenStable();

      await vi.waitFor(() => expect(drawer()).toBeNull());
    },
    AXE_TEST_TIMEOUT_MS,
  );
});
