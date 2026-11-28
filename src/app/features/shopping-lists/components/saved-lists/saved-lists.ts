import { Component, DestroyRef, ElementRef, Renderer2, inject, input, output, signal, viewChild, viewChildren } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { LucideChevronRight, LucideEllipsis, LucideShoppingBasket } from '@lucide/angular';
import type { SavedList } from '../../models/shopping-list.ts';

const directionThreshold = 10;
const revealThreshold = 36;

interface Swipe {
  token: string;
  id: number;
  x: number;
  y: number;
  front: HTMLElement;
  horizontal: boolean;
}

@Component({
  selector: 'lj-saved-lists',
  imports: [RouterLink, MatButtonModule, LucideChevronRight, LucideEllipsis, LucideShoppingBasket],
  templateUrl: './saved-lists.html',
  styleUrl: './saved-lists.scss',
  host: {
    '(document:pointerdown)': 'dismissOutside($event)',
    '(document:keydown.escape)': 'dismissWithEscape($event)',
  },
})
export class SavedLists {
  readonly rows = input.required<readonly SavedList[]>();
  readonly removed = output<SavedList>();
  readonly openToken = signal<string | null>(null);

  private readonly heading = viewChild.required<ElementRef<HTMLElement>>('heading');
  private readonly links = viewChildren<ElementRef<HTMLAnchorElement>>('listLink');
  private swipe?: Swipe;
  private suppressClickOn?: HTMLElement;

  constructor() {
    const host = inject(ElementRef<HTMLElement>).nativeElement;
    const unlisten = inject(Renderer2).listen(host, 'click', (event: MouseEvent) => {
      if (event.detail === 0 || !this.suppressClickOn?.contains(event.target as Node)) return;
      this.suppressClickOn = undefined;
      event.preventDefault();
      event.stopPropagation();
    }, { capture: true });
    inject(DestroyRef).onDestroy(unlisten);
  }

  toggle(token: string): void {
    this.openToken.set(this.openToken() === token ? null : token);
  }

  dismissOutside(event: PointerEvent): void {
    this.suppressClickOn = undefined;
    const card = (event.target as Element).closest<HTMLElement>('[data-saved-token]');
    if (card?.dataset['savedToken'] !== this.openToken()) this.openToken.set(null);
  }

  dismissWithEscape(event: Event): void {
    if (!this.openToken()) return;
    event.preventDefault();
    const action = (event.target as Element).closest('.remove-action');
    action?.closest('li')?.querySelector<HTMLButtonElement>('.reveal-toggle')?.focus();
    this.openToken.set(null);
  }

  startSwipe(event: PointerEvent, token: string): void {
    if (!event.isPrimary || event.button !== 0) return;
    this.swipe = {
      token, id: event.pointerId, x: event.clientX, y: event.clientY,
      front: event.currentTarget as HTMLElement, horizontal: false,
    };
  }

  moveSwipe(event: PointerEvent): void {
    const swipe = this.swipe;
    if (!swipe || event.pointerId !== swipe.id) return;
    const dx = event.clientX - swipe.x;
    const dy = event.clientY - swipe.y;
    if (!swipe.horizontal) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < directionThreshold) return;
      if (Math.abs(dy) >= Math.abs(dx) || (event.pointerType === 'mouse' && !event.buttons)) {
        this.swipe = undefined;
        return;
      }
      swipe.horizontal = true;
      swipe.front.setPointerCapture(swipe.id);
      swipe.front.classList.add('dragging');
      this.suppressClickOn = swipe.front;
    }
    swipe.front.style.setProperty('--drag-offset', dx + 'px');
  }

  finishSwipe(event: PointerEvent): void {
    const swipe = this.swipe;
    if (!swipe || event.pointerId !== swipe.id) return;
    // Touch initially captures the child that was tapped, then transfers capture to the card.
    if (event.type === 'lostpointercapture' && event.target !== swipe.front) return;
    this.swipe = undefined;
    if (!swipe.horizontal) return;

    if (event.type === 'pointerup') {
      const dx = event.clientX - swipe.x;
      if (dx <= -revealThreshold) this.openToken.set(swipe.token);
      if (dx >= revealThreshold && this.openToken() === swipe.token) this.openToken.set(null);
    }
    swipe.front.classList.remove('dragging');
    swipe.front.style.removeProperty('--drag-offset');
  }

  focusAfterRemoval(index: number): void {
    this.openToken.set(null);
    const links = this.links();
    const next = links[Math.min(Math.max(index, 0), links.length - 1)];
    (next?.nativeElement ?? this.heading().nativeElement).focus();
  }
}
