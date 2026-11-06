import { Location } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';

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

  it('should redirect unknown URLs to the dashboard', async () => {
    TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl('/does-not-exist');
    expect(TestBed.inject(Location).path()).toBe('');
  });
});
