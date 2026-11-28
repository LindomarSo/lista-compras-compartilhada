import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatMenuModule } from '@angular/material/menu';
import { LucideChevronRight, LucideEllipsis } from '@lucide/angular';
import type { SavedList } from '../../models/shopping-list.ts';

@Component({
  selector: 'lj-saved-lists',
  imports: [RouterLink, MatButtonModule, MatCardModule, MatMenuModule, LucideChevronRight, LucideEllipsis],
  templateUrl: './saved-lists.html',
  styleUrl: './saved-lists.scss',
})
export class SavedLists {
  readonly rows = input.required<readonly SavedList[]>();
  readonly removed = output<SavedList>();
}
