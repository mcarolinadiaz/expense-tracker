import { TestBed } from '@angular/core/testing';
import { Clock } from './clock.service';
import { provideFixedClock } from './clock.testing';

describe('Clock', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('should give the local day and month, even late at night', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 11, 31, 23, 30));
    const clock = TestBed.inject(Clock);

    expect(clock.today()).toBe('2026-12-31');
    expect(clock.currentMonth()).toBe('2026-12');
  });

  it('should be replaceable with a fixed day in tests', () => {
    TestBed.configureTestingModule({ providers: [provideFixedClock('2027-01-15')] });
    const clock = TestBed.inject(Clock);

    expect(clock.today()).toBe('2027-01-15');
    expect(clock.currentMonth()).toBe('2027-01');
  });
});
