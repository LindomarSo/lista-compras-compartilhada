import { preferences, t } from '../../locale.ts';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { MatDialogModule } from '@angular/material/dialog';
import { LucideArrowUpRight } from '@lucide/angular';
import { filter } from 'rxjs';
import { AppNavigation } from '../app-navigation/app-navigation.ts';
import { NativeLinks } from '../../services/native-links.ts';

@Component({
  selector: 'lj-app',
  imports: [RouterOutlet, RouterLink, MatDialogModule, AppNavigation, LucideArrowUpRight],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.scss',
})
export class AppShell {
  readonly t = t;
  readonly privacyLink = computed(() => './privacidade.html?lang=' + preferences().language);
  constructor() {
    const router = inject(Router);
    const title = signal('Listas');
    effect(() => { document.title = t(title()) + ' | Lista Junto'; });
    router.events.pipe(filter(event => event instanceof NavigationEnd), takeUntilDestroyed()).subscribe(() => {
      title.set(String(router.routerState.snapshot.root.firstChild?.data['localeTitle'] ?? 'Listas'));
      requestAnimationFrame(() => {
        window.scrollTo(0, 0);
        document.getElementById('page-title')?.focus({ preventScroll: true });
      });
    });
    void inject(NativeLinks).connect().catch(() => {});
  }
}
