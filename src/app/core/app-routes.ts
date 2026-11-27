import type { Routes } from '@angular/router';

export const appRoutes: Routes = [
  { path: '', redirectTo: 'listas', pathMatch: 'full' },
  { path: 'listas', title: 'Listas | Lista Junto',
    loadComponent: () => import('../features/shopping-lists/pages/lists-page/lists-page.ts').then(module => module.ListsPage) },
  { path: 'listas/:kind/:token', title: 'Lista de compras | Lista Junto',
    loadComponent: () => import('../features/shopping-lists/pages/list-detail/list-detail.ts').then(module => module.ListDetail) },
  { path: 'balanco', title: 'Balanço mensal | Lista Junto',
    loadComponent: () => import('../features/monthly-balance/pages/balance-page/balance-page.ts').then(module => module.BalancePage) },
  { path: '**', redirectTo: 'listas' },
];
