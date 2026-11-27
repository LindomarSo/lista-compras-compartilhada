import { Capacitor } from '@capacitor/core';

export const isNative = Capacitor.isNativePlatform();
const meta = (name: string) => document.querySelector<HTMLMetaElement>('meta[name="' + name + '"]')?.content.trim() || '';
export const shareBase = () => meta('share-base-url') || new URL(location.pathname, location.origin).href;
export const playUrl = () => meta('play-store-url');
export const supabaseKey = () => typeof document === 'undefined' ? '' : meta('supabase-anon-key');
