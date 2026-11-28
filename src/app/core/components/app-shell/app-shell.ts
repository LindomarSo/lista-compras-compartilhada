import { Component, inject } from '@angular/core';
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
  constructor() {
    inject(Router).events.pipe(filter(event => event instanceof NavigationEnd), takeUntilDestroyed()).subscribe(() => {
      requestAnimationFrame(() => {
        window.scrollTo(0, 0);
        document.getElementById('page-title')?.focus({ preventScroll: true });
      });
    });
    void inject(NativeLinks).connect().catch(() => {});
  }
}
