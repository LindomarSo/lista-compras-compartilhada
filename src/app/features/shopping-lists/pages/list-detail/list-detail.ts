import { Component, DestroyRef, computed, inject, signal, TemplateRef, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule, type MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { LucideCalculator, LucideCheck, LucideChevronLeft, LucidePackage, LucidePencil, LucidePlus, LucideShare2, LucideShoppingBasket, LucideTrash, LucideX } from '@lucide/angular';
import { ListSession } from '../../services/list-session.ts';
import { sharedPrefix, makeShareLink, tokenPattern } from '../../models/links.ts';
import { isNative, playUrl, shareBase } from '../../../../core/platform.ts';
import { formatCurrency } from '../../../../shared/format-currency.ts';
import { itemSubtotal, itemUnitPrice, listTotal } from '../../models/list-rules.ts';
import { ItemEditor } from '../../components/item-editor/item-editor.ts';
import { ItemRows, type ItemEditRequest } from '../../components/item-rows/item-rows.ts';
import { PurchasedItems } from '../../components/purchased-items/purchased-items.ts';
import { InviteDialog } from '../../components/invite-dialog/invite-dialog.ts';
import { listNameMaxLength } from '../../models/shopping-list.ts';
import type { ItemFields, ShoppingItem } from '../../models/shopping-list.ts';

@Component({
  selector: 'lj-list-detail',
  imports: [
    RouterLink, ReactiveFormsModule, MatButtonModule, MatCardModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, ItemEditor, ItemRows, PurchasedItems, LucideCalculator, LucideCheck, LucideChevronLeft,
    LucidePackage, LucidePencil, LucidePlus, LucideShare2, LucideShoppingBasket, LucideTrash, LucideX,
  ],
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
  private readonly productForm = viewChild.required<TemplateRef<{ $implicit: ShoppingItem | null }>>('productForm');
  private readonly renameForm = viewChild.required<TemplateRef<unknown>>('renameForm');
  private itemSheet?: MatDialogRef<unknown>;
  private renameDialog?: MatDialogRef<unknown>;
  readonly nameMaxLength = listNameMaxLength;
  readonly renameName = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(listNameMaxLength)] });
  readonly renameError = signal('');
  readonly pending = computed(() => this.session.snapshot()?.items.filter(item => !item.purchased) ?? []);
  readonly purchased = computed(() => this.session.snapshot()?.items.filter(item => item.purchased) ?? []);
  readonly currency = formatCurrency;
  readonly storeLink = !isNative && /Android/i.test(navigator.userAgent) ? playUrl() : '';
  readonly fromInvite = signal(false);
  readonly usesCurrentFormat = computed(() => {
    const ref = this.session.reference();
    return !!ref && (ref.kind === 'local' || ref.token.startsWith(sharedPrefix));
  });
  readonly total = computed(() => {
    const items = this.session.snapshot()?.items ?? [];
    return items.some(item => itemSubtotal(item.quantity, itemUnitPrice(item)) !== null) ? listTotal(items) : null;
  });

  constructor() {
    this.destroy.onDestroy(() => {
      this.itemSheet?.close();
      this.renameDialog?.close();
    });
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe(params => {
      const token = params.get('token') ?? '';
      const segment = params.get('kind');
      if (!tokenPattern.test(token) || (segment !== 'local' && segment !== 'compartilhada')) {
        void this.router.navigate(['/listas'], { queryParams: { aviso: segment === 'local' ? 'local' : 'convite' }, replaceUrl: true });
        return;
      }
      this.fromInvite.set(this.route.snapshot.queryParamMap.has('convite'));
      this.itemSheet?.close();
      this.renameDialog?.close();
      this.session.open({ token, kind: segment === 'local' ? 'local' : 'shared' });
    });
  }

  rename(event: MouseEvent): void {
    const list = this.session.snapshot()?.list;
    if (!list || this.renameDialog || !this.usesCurrentFormat() || !this.session.canEdit()) return;
    if (event.currentTarget instanceof HTMLButtonElement) event.currentTarget.focus({ preventScroll: true });
    this.renameName.reset(list.name);
    this.renameError.set('');
    const dialog = this.dialogs.open(this.renameForm(), {
      width: '27rem', maxWidth: 'calc(100vw - 2rem)', autoFocus: '#rename-list-name',
    });
    this.renameDialog = dialog;
    dialog.afterClosed().subscribe(() => { this.renameDialog = undefined; });
  }

  canSaveName(): boolean {
    const name = this.renameName.value.trim();
    return this.session.canEdit() && this.renameName.valid && !!name && name !== this.session.snapshot()?.list.name;
  }

  async saveName(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    const dialog = this.renameDialog;
    if (!dialog || !this.canSaveName()) return;
    dialog.disableClose = true;
    this.renameError.set('');
    const saved = await this.session.rename(this.renameName.value.trim());
    dialog.disableClose = false;
    if (this.destroy.destroyed || this.renameDialog !== dialog) return;
    if (saved) dialog.close();
    else this.renameError.set(this.session.error());
  }

  add(event: MouseEvent): void {
    if (event.currentTarget instanceof HTMLButtonElement) this.openItemSheet(event.currentTarget);
  }

  edit({ item, trigger }: ItemEditRequest): void {
    this.openItemSheet(trigger, item);
  }

  private openItemSheet(trigger: HTMLButtonElement, item: ShoppingItem | null = null): void {
    if (this.itemSheet || !this.session.canEdit()) return;
    trigger.focus({ preventScroll: true });
    const id = item ? 'edit-product' : 'add-product';
    const dialog = this.dialogs.open(this.productForm(), {
      data: item,
      id: id + '-dialog',
      ariaLabelledBy: id + '-title',
      autoFocus: 'first-heading',
      panelClass: 'lj-item-sheet',
      position: { bottom: '0' },
      width: '100%',
      maxWidth: 'var(--lj-app-max-width)',
      maxHeight: 'calc(min(100dvh, var(--lj-sheet-viewport, 100dvh)) - var(--lj-space-sm))',
    });
    this.itemSheet = dialog;

    const viewport = window.visualViewport;
    const align = () => {
      const pane = document.getElementById(dialog.id)?.closest<HTMLElement>('.lj-item-sheet');
      if (!viewport || !pane) return;
      pane.style.setProperty('--lj-sheet-viewport', viewport.height + 'px');
      dialog.updatePosition({ bottom: Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop) + 'px' });
    };
    dialog.afterOpened().subscribe(align);
    viewport?.addEventListener('resize', align);
    viewport?.addEventListener('scroll', align);
    dialog.beforeClosed().subscribe(() => {
      const focused = document.activeElement;
      if (focused instanceof HTMLInputElement && document.getElementById(dialog.id)?.contains(focused)) focused.blur();
    });
    dialog.afterClosed().subscribe(() => {
      viewport?.removeEventListener('resize', align);
      viewport?.removeEventListener('scroll', align);
      this.itemSheet = undefined;
      if (!trigger.isConnected && !this.destroy.destroyed && document.activeElement === document.body) {
        document.getElementById('add-product-button')?.focus({ preventScroll: true });
      }
    });
  }

  async saveItem(item: ShoppingItem | null, fields: ItemFields): Promise<void> {
    const dialog = this.itemSheet;
    if (!dialog || !this.session.canEdit()) return;
    dialog.disableClose = true;
    const saved = item
      ? await this.session.change({ action: 'update_item', id: item.id, fields }, 'Produto atualizado.')
      : await this.session.change({ action: 'add_item', fields }, 'Produto adicionado.');
    dialog.disableClose = false;
    if (saved && !this.destroy.destroyed && this.itemSheet === dialog) dialog.close();
  }

  async toggle({ item, purchased }: { item: ShoppingItem; purchased: boolean }): Promise<void> {
    const restore = document.activeElement instanceof HTMLElement && document.activeElement.matches('input[type="checkbox"]');
    const changed = await this.session.change({ action: 'update_item', id: item.id, fields: { purchased } },
      purchased ? 'Produto marcado como comprado.' : 'Produto voltou para a lista.');
    if (restore && changed) requestAnimationFrame(() => {
      if (this.destroy.destroyed || document.activeElement !== document.body) return;
      const next = document.querySelector<HTMLElement>('.pending input[type="checkbox"]:enabled')
        ?? document.querySelector<HTMLElement>('lj-purchased-items mat-expansion-panel-header')
        ?? document.getElementById('add-product-button');
      next?.focus({ preventScroll: true });
    });
  }

  async remove(item: ShoppingItem): Promise<void> {
    if (!window.confirm('Excluir “' + item.name + '” da lista?')) return;
    await this.session.change({ action: 'delete_item', id: item.id }, 'Produto excluído.');
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
