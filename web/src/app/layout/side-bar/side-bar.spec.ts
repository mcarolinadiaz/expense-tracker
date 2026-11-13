import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { APP_PAGE_ROUTES } from '../../core/constants/app-page-routes';
import { SideBar } from './side-bar';

describe('SideBar', () => {
  let component: SideBar;
  let fixture: ComponentFixture<SideBar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SideBar],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(SideBar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render one link per page route, using its title and path', () => {
    const anchors = Array.from<HTMLAnchorElement>(fixture.nativeElement.querySelectorAll('a'));

    expect(anchors.map((a) => a.textContent?.trim())).toEqual(APP_PAGE_ROUTES.map((r) => r.title));
    expect(anchors.map((a) => a.getAttribute('href'))).toEqual(
      APP_PAGE_ROUTES.map((r) => `/${r.path}`),
    );
  });
});
