import type { Routes } from '@angular/router';

export const appRoutes: Routes = [
  { path: '', redirectTo: 'listas', pathMatch: 'full' },
  { path: 'listas', data: { localeTitle: 'Listas' },
    loadComponent: () => import('../features/shopping-lists/pages/lists-page/lists-page.ts').then(module => module.ListsPage) },
  { path: 'listas/:kind/:token', data: { localeTitle: 'Lista de compras' },
    loadComponent: () => import('../features/shopping-lists/pages/list-detail/list-detail.ts').then(module => module.ListDetail) },
  { path: 'balanco', data: { localeTitle: 'Balanço mensal' },
    loadComponent: () => import('../features/monthly-balance/pages/balance-page/balance-page.ts').then(module => module.BalancePage) },
  { path: '**', redirectTo: 'listas' },
];
