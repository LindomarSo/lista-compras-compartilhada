import { Component, DestroyRef, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { ListSession } from '../../services/list-session.ts';
import { sharedPrefix, makeShareLink, tokenPattern } from '../../models/links.ts';
import { isNative, playUrl, shareBase } from '../../../../core/platform.ts';
import { formatCurrency } from '../../../../shared/format-currency.ts';
import { itemSubtotal, itemUnitPrice, listTotal } from '../../models/list-rules.ts';
import { ItemEditor } from '../../components/item-editor/item-editor.ts';
import { ItemRows } from '../../components/item-rows/item-rows.ts';
import { PurchasedItems } from '../../components/purchased-items/purchased-items.ts';
import { InviteDialog } from '../../components/invite-dialog/invite-dialog.ts';
import type { ItemFields, ShoppingItem } from '../../models/shopping-list.ts';

@Component({
  selector: 'lj-list-detail',
  imports: [RouterLink, MatButtonModule, MatCardModule, MatMenuModule, ItemEditor, ItemRows, PurchasedItems],
  providers: [ListSession],
  templateUrl: './list-detail.html',
  styleUrl: './list-detail.scss',
})
export class ListDetail {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly dialogs = inject(MatDialog);
  private readonly destroy = inject(DestroyRef);
  readonly session = inject(ListSession);
  readonly editing = signal<ShoppingItem | null>(null);
  readonly editor = viewChild(ItemEditor);
  readonly pending = computed(() => this.session.snapshot()?.items.filter(item => !item.purchased) ?? []);
  readonly purchased = computed(() => this.session.snapshot()?.items.filter(item => item.purchased) ?? []);
  readonly currency = formatCurrency;
  readonly storeLink = !isNative && /Android/i.test(navigator.userAgent) ? playUrl() : '';
  readonly fromInvite = signal(false);
  readonly supportsCategory = computed(() => {
    const ref = this.session.reference();
    return !!ref && (ref.kind === 'local' || ref.token.startsWith(sharedPrefix));
  });
  readonly total = computed(() => {
    const items = this.session.snapshot()?.items ?? [];
    return items.some(item => itemSubtotal(item.quantity, itemUnitPrice(item)) !== null) ? listTotal(items) : null;
  });

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe(params => {
      const token = params.get('token') ?? '';
      const segment = params.get('kind');
      if (!tokenPattern.test(token) || (segment !== 'local' && segment !== 'compartilhada')) {
        void this.router.navigate(['/listas'], { queryParams: { aviso: segment === 'local' ? 'local' : 'convite' }, replaceUrl: true });
        return;
      }
      this.fromInvite.set(this.route.snapshot.queryParamMap.has('convite'));
      this.editing.set(null);
      this.editor()?.reset();
      this.session.open({ token, kind: segment === 'local' ? 'local' : 'shared' });
    });
  }

  async save(fields: ItemFields): Promise<void> {
    const item = this.editing();
    const success = await this.session.change(item ? { action: 'update_item', id: item.id, fields }
      : { action: 'add_item', fields }, item ? 'Produto atualizado.' : 'Produto adicionado.');
    if (success && !this.destroy.destroyed) {
      this.editing.set(null);
      this.editor()?.reset();
    }
  }

  async toggle({ item, purchased }: { item: ShoppingItem; purchased: boolean }): Promise<void> {
    const restore = document.activeElement instanceof HTMLElement && document.activeElement.matches('input[type="checkbox"]');
    const changed = await this.session.change({ action: 'update_item', id: item.id, fields: { purchased } },
      purchased ? 'Produto marcado como comprado.' : 'Produto voltou para a lista.');
    if (restore && changed) requestAnimationFrame(() => {
      if (this.destroy.destroyed || document.activeElement !== document.body) return;
      const next = document.querySelector<HTMLElement>('.pending input[type="checkbox"]:enabled')
        ?? document.querySelector<HTMLElement>('lj-purchased-items mat-expansion-panel-header')
        ?? document.getElementById('item-name');
      next?.focus({ preventScroll: true });
    });
  }

  async remove(item: ShoppingItem): Promise<void> {
    if (!window.confirm('Excluir “' + item.name + '” da lista?')) return;
    if (await this.session.change({ action: 'delete_item', id: item.id }, 'Produto excluído.') && this.editing()?.id === item.id) {
      this.editing.set(null);
      this.editor()?.reset();
    }
  }

  async deleteList(): Promise<void> {
    const snapshot = this.session.snapshot();
    if (!snapshot) return;
    const scope = this.session.reference()?.kind === 'local' ? 'deste aparelho' : 'para todos';
    if (!window.confirm('Excluir a lista “' + snapshot.list.name + '” ' + scope + '?')) return;
    if (await this.session.delete()) void this.router.navigate(['/listas'], { queryParams: { aviso: 'excluida' }, replaceUrl: true });
  }

  async invite(): Promise<void> {
    const ref = this.session.reference();
    const snapshot = this.session.snapshot();
    if (!ref || !snapshot || !this.session.canEdit()) return;
    let { token } = ref;
    if (ref.kind === 'local') {
      const published = await this.session.publish();
      if (!published || this.destroy.destroyed) return;
      token = published.token;
      await this.router.navigate(['/listas', 'compartilhada', token], { replaceUrl: true });
    }
    const dialog = this.dialogs.open(InviteDialog, {
      data: { title: snapshot.list.name, url: makeShareLink(shareBase(), token) },
      width: '27rem', maxWidth: 'calc(100vw - 2rem)', autoFocus: 'first-heading',
    });
    const unregister = this.destroy.onDestroy(() => dialog.close());
    dialog.afterClosed().subscribe(() => unregister());
  }
}
