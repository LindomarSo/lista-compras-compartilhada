import { Component, DestroyRef, Injector, TemplateRef, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule, MatDialogState, type MatDialogRef } from '@angular/material/dialog';
import { LucidePlus } from '@lucide/angular';
import { ListCreator } from '../../components/list-creator/list-creator.ts';
import { SavedLists } from '../../components/saved-lists/saved-lists.ts';
import { ListRepository } from '../../services/list-repository.ts';
import { messageOf } from '../../services/list-api.ts';
import type { SavedList } from '../../models/shopping-list.ts';

@Component({
  selector: 'lj-lists-page',
  imports: [ListCreator, SavedLists, MatButtonModule, MatCardModule, MatDialogModule, LucidePlus],
  templateUrl: './lists-page.html',
  styleUrl: './lists-page.scss',
})
export class ListsPage {
  private readonly router = inject(Router);
  private readonly repository = inject(ListRepository);
  private readonly dialogs = inject(MatDialog);
  private readonly destroy = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly creationDialog = viewChild.required<TemplateRef<unknown>>('creationDialog');
  private dialog?: MatDialogRef<unknown, SavedList>;
  readonly params = toSignal(inject(ActivatedRoute).queryParamMap);
  readonly rows = this.repository.rows;
  readonly notice = signal('');
  readonly creationError = signal('');

  openCreation(event: MouseEvent): void {
    if (this.dialog) return;
    const trigger = event.currentTarget as HTMLButtonElement;
    this.creationError.set('');
    const dialog = this.dialogs.open<unknown, unknown, SavedList>(this.creationDialog(), {
      ariaLabelledBy: 'new-list-title',
      ariaModal: true,
      autoFocus: '#new-list-name',
      delayFocusTrap: false,
      restoreFocus: false,
      panelClass: 'lj-list-dialog',
      width: 'min(25rem, calc(100vw - 2 * var(--lj-space-md)))',
      maxWidth: '100%',
    });
    this.dialog = dialog;

    // Focus in the tap handler so mobile browsers can open the software keyboard.
    const name = document.getElementById('new-list-name');
    name?.focus({ preventScroll: true });

    const viewport = window.visualViewport;
    const pane = name?.closest<HTMLElement>('.lj-list-dialog');
    const resize = () => {
      if (viewport && pane) pane.style.setProperty('--lj-list-dialog-viewport', `${viewport.height}px`);
    };
    resize();
    viewport?.addEventListener('resize', resize);
    const unregister = this.destroy.onDestroy(() => dialog.close());
    dialog.afterClosed().subscribe(row => {
      viewport?.removeEventListener('resize', resize);
      unregister();
      this.dialog = undefined;
      if (this.destroy.destroyed) return;
      if (row) void this.router.navigate(['/listas', 'local', row.token]);
      else (trigger?.isConnected ? trigger : document.getElementById('page-title'))?.focus({ preventScroll: true });
    });
  }

  create(name: string): void {
    if (this.dialog && this.dialog.getState() !== MatDialogState.OPEN) return;
    try {
      const row = this.repository.create(name);
      if (this.dialog) this.dialog.close(row);
      else void this.router.navigate(['/listas', 'local', row.token]);
    } catch (error) {
      this.creationError.set(messageOf(error));
    }
  }

  remove(row: SavedList): void {
    const question = row.local ? 'Excluir a lista e todos os itens deste aparelho?'
      : 'Remover a cópia deste aparelho? O convite continua funcionando.';
    if (!window.confirm(question)) return;
    try {
      this.repository.forget(row.token);
      this.notice.set('Lista removida deste aparelho.');
      this.creationError.set('');
      afterNextRender(() => {
        document.getElementById(this.rows().length ? 'new-list-button' : 'page-title')?.focus({ preventScroll: true });
      }, { injector: this.injector });
    } catch (error) {
      this.notice.set(messageOf(error));
    }
  }
}
