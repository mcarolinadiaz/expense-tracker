import { Routes } from '@angular/router';
import { APP_TEXT } from './app-text';

export const APP_PAGE_ROUTES = [
  {
    path: '',
    pathMatch: 'full',
    title: APP_TEXT.pages.overview,
    loadComponent: () => import('../../overview/overview').then((m) => m.Overview),
  },
  {
    path: 'transactions',
    title: APP_TEXT.pages.activity,
    loadComponent: () => import('../../transactions/transactions').then((m) => m.Transactions),
  },
  {
    path: 'categories',
    title: APP_TEXT.pages.categories,
    loadComponent: () => import('../../categories/categories').then((m) => m.Categories),
  },
] satisfies Routes;

export const APP_NAV_LINKS = APP_PAGE_ROUTES.map(({ path, title }) => ({
  path: `/${path}`,
  label: title,
  exact: path === '',
}));
