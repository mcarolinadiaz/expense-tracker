import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { APP_PAGE_ROUTES } from '../../core/constants/app-page-routes';
import { AppDb, SETTING_KEY } from '../../core/db/app-db';
import { LanguageService } from '../../core/i18n/language.service';
import { provideTestTranslations } from '../../core/i18n/translations.testing';
import { Translator } from '../../core/i18n/translator.service';
import { APP_LOCALE } from '../../core/locale-format.service';
import { AXE_TEST_TIMEOUT_MS, expectNoAxeViolations } from '../../core/axe.testing';
import { SideBar } from './side-bar';

describe('SideBar', () => {
  let component: SideBar;
  let fixture: ComponentFixture<SideBar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SideBar],
      providers: [provideRouter([]), provideTestTranslations()],
    }).compileComponents();

    fixture = TestBed.createComponent(SideBar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(async () => {
    await TestBed.inject(AppDb).delete();
  });

  function labels(): (string | undefined)[] {
    return Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('a, button')).map(
      (item) => item.textContent?.trim(),
    );
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render one link per page route, using its title and path', () => {
    const anchors = Array.from<HTMLAnchorElement>(fixture.nativeElement.querySelectorAll('a'));

    const translator = TestBed.inject(Translator);

    expect(anchors.map((a) => a.textContent?.trim())).toEqual(
      APP_PAGE_ROUTES.map((r) => translator.translate(r.title)),
    );
    expect(anchors.map((a) => a.getAttribute('href'))).toEqual(
      APP_PAGE_ROUTES.map((r) => `/${r.path}`),
    );
  });

  it(
    'should switch the whole app to the chosen language and remember it',
    async () => {
      const spanish = fixture.nativeElement.querySelector(`button[lang="${APP_LOCALE.esAR}"]`);
      expect(spanish.getAttribute('aria-pressed')).toBe('false');

      spanish.click();

      await vi.waitFor(async () => {
        await fixture.whenStable();
        expect(labels()).toEqual([
          'Resumen',
          'Movimientos',
          'Categorías',
          'Proyecciones',
          'Datos',
          'Español',
          'English',
        ]);
      });
      expect(spanish.getAttribute('aria-pressed')).toBe('true');
      expect(document.documentElement.lang).toBe(APP_LOCALE.esAR);
      await expect(TestBed.inject(AppDb).settings.get(SETTING_KEY.language)).resolves.toEqual({
        key: SETTING_KEY.language,
        value: APP_LOCALE.esAR,
      });
      await expectNoAxeViolations(fixture.nativeElement);
    },
    AXE_TEST_TIMEOUT_MS,
  );

  it('should start in the language saved on this device', async () => {
    await TestBed.inject(AppDb).settings.put({ key: SETTING_KEY.language, value: APP_LOCALE.esAR });

    await TestBed.inject(LanguageService).start();

    expect(TestBed.inject(Translator).translate('pages.overview')).toBe('Resumen');
  });
});
