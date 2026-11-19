import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { AXE_TEST_TIMEOUT_MS, expectNoAxeViolations } from '../../core/axe.testing';
import { provideFixedClock } from '../../core/clock.testing';
import en from '../../core/i18n/en.json';
import { provideTestTranslations } from '../../core/i18n/translations.testing';
import { AppDb } from '../../core/db/app-db';
import { CURRENCY, Currency } from '../../core/money';
import { FIXED_COST_ERROR, INCREASE_RULE } from '../fixed-cost';
import { FixedCostService } from '../fixed-cost.service';
import { FIXED_COST_PANEL_IDS } from './fixed-cost-panel';
import { FixedCostPanelService } from './fixed-cost-panel.service';

describe('FixedCostPanel', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideTestTranslations(), provideFixedClock('2026-11-18')],
    });
  });

  afterEach(async () => {
    await TestBed.inject(AppDb).delete();
  });

  async function open(): Promise<void> {
    TestBed.inject(FixedCostPanelService).open(CURRENCY.ARS);
    await settle();
  }

  async function settle(): Promise<void> {
    for (let i = 0; i < 3; i++) {
      await new Promise((resolve) => setTimeout(resolve));
    }
  }

  function panel(): HTMLElement {
    return document.querySelector('app-fixed-cost-panel')!;
  }

  function type(id: string, value: string): void {
    const input = panel().querySelector<HTMLInputElement>(`#${id}`)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  function button(label: string): HTMLButtonElement {
    return Array.from(panel().querySelectorAll<HTMLButtonElement>('button')).find(
      (candidate) => candidate.textContent?.trim() === label,
    )!;
  }

  async function saved(currency: Currency = CURRENCY.ARS) {
    return firstValueFrom(TestBed.inject(FixedCostService).list(currency));
  }

  it('should save a cost that increases by IPC, from this month, in the page currency', async () => {
    await open();

    type(FIXED_COST_PANEL_IDS.name, '  Alquiler  ');
    type(FIXED_COST_PANEL_IDS.amount, '620,000');
    button(en.actions.save).click();
    await settle();

    expect(await saved()).toEqual([
      {
        id: expect.any(Number),
        name: 'Alquiler',
        currency: CURRENCY.ARS,
        amount: 62000000,
        every: 4,
        lastIncrease: '2026-11',
        increase: { rule: INCREASE_RULE.ipc },
      },
    ]);
    expect(panel()).toBeNull();
  });

  it('should save a percentage increase, a currency and an earlier last increase', async () => {
    await open();

    type(FIXED_COST_PANEL_IDS.name, 'Software');
    type(FIXED_COST_PANEL_IDS.amount, '24');
    button(CURRENCY.USD).click();
    button(en.projections.rules[INCREASE_RULE.percent]).click();
    await settle();
    type(FIXED_COST_PANEL_IDS.value, '8.5');
    type(FIXED_COST_PANEL_IDS.lastIncrease, '2026-06');
    button(en.actions.save).click();
    await settle();

    const [cost] = await saved(CURRENCY.USD);
    expect(cost).toMatchObject({
      currency: CURRENCY.USD,
      amount: 2400,
      lastIncrease: '2026-06',
      increase: { rule: INCREASE_RULE.percent, percent: '8.5' },
    });
  });

  it('should save a fixed amount increase in cents', async () => {
    await open();

    type(FIXED_COST_PANEL_IDS.name, 'Internet');
    type(FIXED_COST_PANEL_IDS.amount, '25,000');
    button(en.projections.rules[INCREASE_RULE.amount]).click();
    await settle();
    type(FIXED_COST_PANEL_IDS.value, '1,500.50');
    button(en.actions.save).click();
    await settle();

    const [cost] = await saved();
    expect(cost.increase).toEqual({ rule: INCREASE_RULE.amount, amount: 150050 });
  });

  it('should show each broken rule and save nothing', async () => {
    await open();

    button(en.projections.rules[INCREASE_RULE.percent]).click();
    await settle();
    type(FIXED_COST_PANEL_IDS.value, '150');
    type(FIXED_COST_PANEL_IDS.lastIncrease, '2026-12');
    button(en.actions.save).click();
    await settle();

    const text = panel().textContent;
    expect(text).toContain(en.fixedCostErrors[FIXED_COST_ERROR.nameRequired]);
    expect(text).toContain(en.fixedCostErrors[FIXED_COST_ERROR.invalidAmount]);
    expect(text).toContain('Enter a percentage above 0 and up to 100, with up to 2 decimals.');
    expect(text).toContain(en.fixedCostErrors[FIXED_COST_ERROR.futureLastIncrease]);
    expect(await saved()).toEqual([]);
  });

  it(
    'should have no accessibility problems, also while showing errors',
    async () => {
      await open();
      await expectNoAxeViolations();

      button(en.projections.rules[INCREASE_RULE.amount]).click();
      button(en.actions.save).click();
      await settle();
      await expectNoAxeViolations();
    },
    AXE_TEST_TIMEOUT_MS,
  );
});
