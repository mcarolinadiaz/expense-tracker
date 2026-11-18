import { Routes } from '@angular/router';
import { APP_TEXT } from './app-text';

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
    title: APP_TEXT.pages.overview,
    loadComponent: () => import('../../overview/overview').then((m) => m.Overview),
  },
  {
    path: APP_PAGE_PATH.transactions,
    title: APP_TEXT.pages.activity,
    loadComponent: () => import('../../transactions/transactions').then((m) => m.Transactions),
  },
  {
    path: APP_PAGE_PATH.categories,
    title: APP_TEXT.pages.categories,
    loadComponent: () => import('../../categories/categories').then((m) => m.Categories),
  },
  {
    path: APP_PAGE_PATH.projections,
    title: APP_TEXT.pages.projections,
    loadComponent: () => import('../../projections/projections').then((m) => m.Projections),
  },
  {
    path: APP_PAGE_PATH.data,
    title: APP_TEXT.pages.data,
    loadComponent: () => import('../../data/data').then((m) => m.Data),
  },
] satisfies Routes;

export const APP_NAV_LINKS = APP_PAGE_ROUTES.map(({ path, title }) => ({
  path: `/${path}`,
  label: title,
  exact: path === APP_PAGE_PATH.overview,
}));
