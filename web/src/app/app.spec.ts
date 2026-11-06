import { Location } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { CURRENCIES, CURRENCY } from './core/api/money';
import { APP_TEXT } from './core/constants/app-text';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the side bar and the router outlet', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-side-bar')).toBeTruthy();
    expect(compiled.querySelector('main router-outlet')).toBeTruthy();
  });

  it.each([
    ['/', 'app-dashboard'],
    ['/transactions', 'app-transactions'],
    ['/categories', 'app-categories'],
  ])('should render the page for %s', async (url, selector) => {
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl(url);
    await fixture.whenStable();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector(selector)).toBeTruthy();
  });

  it.each([
    ['/', APP_TEXT.pages.overview, [...CURRENCIES, APP_TEXT.actions.addTransaction]],
    ['/transactions', APP_TEXT.pages.activity, [APP_TEXT.actions.addTransaction]],
    ['/categories', APP_TEXT.pages.categories, [APP_TEXT.actions.newCategory]],
  ])('should show the title and actions of %s in the navbar', async (url, title, actions) => {
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl(url);
    await fixture.whenStable();
    const navbar = (fixture.nativeElement as HTMLElement).querySelector('main app-navbar')!;

    expect(navbar.querySelector('h1')?.textContent).toBe(title);
    expect(
      Array.from(navbar.querySelectorAll('button')).map((button) => button.textContent?.trim()),
    ).toEqual(actions);
  });

  it('should replace the navbar actions when the page changes', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    const buttons = () =>
      Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('app-navbar button'));

    await router.navigateByUrl('/');
    await fixture.whenStable();
    expect(buttons()).toHaveLength(3);

    await router.navigateByUrl('/categories');
    await fixture.whenStable();
    expect(buttons().map((button) => button.textContent?.trim())).toEqual([
      APP_TEXT.actions.newCategory,
    ]);
  });

  it('should update the dashboard from its navbar actions', async () => {
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl('/');
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const usd = Array.from(compiled.querySelectorAll<HTMLElement>('app-navbar button')).find(
      (button) => button.textContent?.trim() === CURRENCY.USD,
    )!;

    usd.click();
    await fixture.whenStable();

    expect(usd.getAttribute('aria-pressed')).toBe('true');
    expect(compiled.querySelector('app-dashboard .stat-value')?.textContent).toContain('$1,200.00');
  });

  it('should redirect unknown URLs to the dashboard', async () => {
    TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl('/does-not-exist');
    expect(TestBed.inject(Location).path()).toBe('');
  });
});
