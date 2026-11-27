import { DestroyRef, Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { readShareTokenFromUrl } from '../../features/shopping-lists/models/links.ts';
import { isNative, shareBase } from '../platform.ts';

@Injectable({ providedIn: 'root' })
export class NativeLinks {
  private readonly router = inject(Router);
  private readonly destroy = inject(DestroyRef);

  async connect(): Promise<void> {
    if (!isNative) return;
    const { App } = await import('@capacitor/app');
    let handled = false;
    const open = (url: string) => {
      if (this.destroy.destroyed) return;
      const token = readShareTokenFromUrl(url, shareBase());
      if (!token) return;
      handled = true;
      void this.router.navigate(['/listas', 'compartilhada', token], { queryParams: { convite: 1 } });
    };
    const links = await App.addListener('appUrlOpen', ({ url }) => open(url));
    const state = await App.addListener('appStateChange', ({ isActive }) => {
      window.dispatchEvent(new CustomEvent('lista-junto-native-active', { detail: isActive }));
    });
    if (this.destroy.destroyed) {
      await Promise.all([links.remove(), state.remove()]);
      return;
    }
    this.destroy.onDestroy(() => { void links.remove(); void state.remove(); });
    const launch = await App.getLaunchUrl();
    if (!handled && launch?.url) open(launch.url);
  }
}
