import { preferences, t } from '../../../../core/locale.ts';
import { Component, Injector, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { LucideCirclePlus, LucideClipboardList, LucideUsersRound } from '@lucide/angular';
import { ListCreator } from '../../components/list-creator/list-creator.ts';
import { SavedLists } from '../../components/saved-lists/saved-lists.ts';
import { ListRepository } from '../../services/list-repository.ts';
import { messageOf } from '../../services/list-api.ts';
import type { SavedList } from '../../models/shopping-list.ts';

@Component({
  selector: 'lj-lists-page',
  imports: [ListCreator, SavedLists, MatCardModule, LucideCirclePlus, LucideClipboardList, LucideUsersRound],
  templateUrl: './lists-page.html',
  styleUrl: './lists-page.scss',
})
export class ListsPage {
  readonly t = t;
  private readonly router = inject(Router);
  private readonly repository = inject(ListRepository);
  private readonly injector = inject(Injector);
  private readonly savedLists = viewChild.required(SavedLists);
  readonly params = toSignal(inject(ActivatedRoute).queryParamMap);
  readonly rows = this.repository.rows;
  readonly notice = signal('');
  readonly creationError = signal('');

  create(name: string): void {
    try {
      const row = this.repository.create(name, preferences().currency);
      void this.router.navigate(['/listas', 'local', row.token]);
    } catch (error) {
      this.creationError.set(messageOf(error));
    }
  }

  remove(row: SavedList): void {
    const question = row.local ? 'Excluir a lista e todos os itens deste aparelho?'
      : 'Remover a cópia deste aparelho? O convite continua funcionando.';
    if (!window.confirm(t(question))) return;
    try {
      const index = this.rows().findIndex(candidate => candidate.token === row.token);
      this.repository.forget(row.token);
      this.notice.set('Lista removida deste aparelho.');
      afterNextRender(() => this.savedLists().focusAfterRemoval(index), { injector: this.injector });
    } catch (error) {
      this.notice.set(messageOf(error));
    }
  }
}
