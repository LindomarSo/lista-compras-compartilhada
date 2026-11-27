import { DestroyRef, Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LabelReader {
  private readonly dialogs = inject(MatDialog);

  async open(owner: DestroyRef): Promise<number | undefined> {
    const { LabelDialog } = await import('../components/label-dialog/label-dialog.ts');
    if (owner.destroyed) return undefined;
    const dialog = this.dialogs.open<InstanceType<typeof LabelDialog>, undefined, number>(LabelDialog, {
      width: '30rem', maxWidth: 'calc(100vw - 2rem)', autoFocus: 'first-heading',
    });
    const unregister = owner.onDestroy(() => dialog.close());
    try {
      const price = await firstValueFrom(dialog.afterClosed());
      return typeof price === 'number' && Number.isFinite(price) ? price : undefined;
    } finally {
      if (!owner.destroyed) unregister();
    }
  }
}
