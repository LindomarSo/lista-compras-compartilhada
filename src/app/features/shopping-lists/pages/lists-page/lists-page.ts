import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { ListCreator } from '../../components/list-creator/list-creator.ts';
import { SavedLists } from '../../components/saved-lists/saved-lists.ts';
import { ListRepository } from '../../services/list-repository.ts';
import { messageOf } from '../../services/list-api.ts';
import type { SavedList } from '../../models/shopping-list.ts';

@Component({
  selector: 'lj-lists-page',
  imports: [ListCreator, SavedLists],
  templateUrl: './lists-page.html',
  styleUrl: './lists-page.scss',
})
export class ListsPage {
  private readonly router = inject(Router);
  private readonly repository = inject(ListRepository);
  readonly params = toSignal(inject(ActivatedRoute).queryParamMap);
  readonly rows = this.repository.rows;
  readonly notice = signal('');

  create(name: string): void {
    try {
      const row = this.repository.create(name);
      void this.router.navigate(['/listas', 'local', row.token]);
    } catch (error) {
      this.notice.set(messageOf(error));
    }
  }

  remove(row: SavedList): void {
    const question = row.local ? 'Excluir a lista e todos os itens deste aparelho?'
      : 'Remover a cópia deste aparelho? O convite continua funcionando.';
    if (!window.confirm(question)) return;
    try {
      this.repository.forget(row.token);
      this.notice.set('Lista removida deste aparelho.');
      document.getElementById('list-name')?.focus({ preventScroll: true });
    } catch (error) {
      this.notice.set(messageOf(error));
    }
  }
}
