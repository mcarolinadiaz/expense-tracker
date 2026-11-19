import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { APP_LOCALE, LocaleFormat } from '../locale-format.service';
import { provideTestTranslations } from './translations.testing';
import { Translator } from './translator.service';

describe('Translator', () => {
  let translator: Translator;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideTestTranslations()] });
    translator = TestBed.inject(Translator);
    TestBed.inject(TranslocoService).setTranslation(
      {
        items: {
          one: '{{ count }} item in {{ place }}',
          other: '{{ count }} items in {{ place }}',
        },
      },
      APP_LOCALE.enUS,
      { merge: true },
    );
    TestBed.inject(TranslocoService).setTranslation(
      {
        items: {
          one: '{{ count }} artículo en {{ place }}',
          other: '{{ count }} artículos en {{ place }}',
        },
      },
      APP_LOCALE.esAR,
      { merge: true },
    );
  });

  function useSpanish(): void {
    TestBed.inject(TranslocoService).setActiveLang(APP_LOCALE.esAR);
    TestBed.inject(LocaleFormat).use(APP_LOCALE.esAR);
  }

  it('should translate a key in the active language', () => {
    expect(translator.translate('pages.overview')).toBe('Overview');

    useSpanish();

    expect(translator.translate('pages.overview')).toBe('Resumen');
  });

  it('should choose the plural form and write the count in the active language', () => {
    const plural = (count: number) =>
      translator.plural('items' as never, count, { place: 'Rosario' });

    expect(plural(1)).toBe('1 item in Rosario');
    expect(plural(1250)).toBe('1,250 items in Rosario');

    useSpanish();

    expect(plural(1)).toBe('1 artículo en Rosario');
    expect(plural(0)).toBe('0 artículos en Rosario');
    expect(plural(1000000)).toBe('1.000.000 artículos en Rosario');
  });

  it('should tell a text key from any other text', () => {
    expect(translator.isKey('pages.data')).toBe(true);
    expect(translator.isKey('pages')).toBe(false);
    expect(translator.isKey(undefined)).toBe(false);
  });
});
