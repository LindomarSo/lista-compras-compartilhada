import { DefaultUrlSerializer } from '@angular/router';
import { legacyRoute } from '../features/shopping-lists/models/links.ts';

export function normalizeCurrentUrl(): void {
  const internal = legacyRoute(location.hash);
  if (internal) history.replaceState(history.state, '', location.pathname + location.search + '#' + internal);
}

export class LegacyUrlSerializer extends DefaultUrlSerializer {
  override parse(url: string) {
    return super.parse(legacyRoute(url) ?? url);
  }
}
