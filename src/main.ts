import { isDevMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, UrlSerializer, withHashLocation } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { AppShell } from './app/core/components/app-shell/app-shell.ts';
import { appRoutes } from './app/core/app-routes.ts';
import { LegacyUrlSerializer, normalizeCurrentUrl } from './app/core/legacy-url-serializer.ts';
import { isNative } from './app/core/platform.ts';
import { LIST_CATALOG } from './app/features/shopping-lists/interfaces/list-catalog.ts';
import { ListRepository } from './app/features/shopping-lists/services/list-repository.ts';

normalizeCurrentUrl();
bootstrapApplication(AppShell, {
  providers: [
    provideRouter(appRoutes, withHashLocation()),
    { provide: UrlSerializer, useClass: LegacyUrlSerializer },
    { provide: LIST_CATALOG, useExisting: ListRepository },
    provideServiceWorker('sw.js', { enabled: !isDevMode() && !isNative, registrationStrategy: 'registerImmediately' }),
  ],
}).catch(() => {
  const root = document.querySelector('lj-app');
  if (root) root.textContent = 'Não foi possível iniciar o Lista Junto. Atualize a página e tente novamente.';
});
