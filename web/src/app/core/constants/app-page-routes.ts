import { Routes } from '@angular/router';
import { textKey } from '../i18n/translations';

/** The path of each page, without the leading slash. */
export const APP_PAGE_PATH = {
  overview: '',
  transactions: 'transactions',
  categories: 'categories',
  projections: 'projections',
  data: 'data',
} as const;

export const APP_PAGE_ROUTES = [
  {
    path: APP_PAGE_PATH.overview,
    pathMatch: 'full',
    title: textKey('pages.overview'),
    loadComponent: () => import('../../overview/overview').then((m) => m.Overview),
  },
  {
    path: APP_PAGE_PATH.transactions,
    title: textKey('pages.activity'),
    loadComponent: () => import('../../transactions/transactions').then((m) => m.Transactions),
  },
  {
    path: APP_PAGE_PATH.categories,
    title: textKey('pages.categories'),
    loadComponent: () => import('../../categories/categories').then((m) => m.Categories),
  },
  {
    path: APP_PAGE_PATH.projections,
    title: textKey('pages.projections'),
    loadComponent: () => import('../../projections/projections').then((m) => m.Projections),
  },
  {
    path: APP_PAGE_PATH.data,
    title: textKey('pages.data'),
    loadComponent: () => import('../../data/data').then((m) => m.Data),
  },
] satisfies Routes;

export const APP_NAV_LINKS = APP_PAGE_ROUTES.map(({ path, title }) => ({
  path: `/${path}`,
  label: title,
  exact: path === APP_PAGE_PATH.overview,
}));
