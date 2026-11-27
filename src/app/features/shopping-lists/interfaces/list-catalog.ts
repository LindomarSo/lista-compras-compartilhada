import { InjectionToken } from '@angular/core';
import type { Signal } from '@angular/core';
import type { SavedList } from '../models/shopping-list.ts';

export interface ListCatalog {
  readonly rows: Signal<readonly SavedList[]>;
  readonly replacements: Signal<ReadonlyMap<string, string>>;
  refresh(tokens: string[], signal: AbortSignal): Promise<boolean>;
}

export const LIST_CATALOG = new InjectionToken<ListCatalog>('List catalog');
