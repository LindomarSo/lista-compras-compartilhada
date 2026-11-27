import { Component, inject, signal } from '@angular/core';
import { Clipboard as WebClipboard } from '@angular/cdk/clipboard';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { isNative } from '../../../../core/platform.ts';

export interface InviteData { title: string; url: string }

@Component({
  selector: 'lj-invite-dialog',
  imports: [MatButtonModule, MatDialogModule],
  templateUrl: './invite-dialog.html',
  styleUrl: './invite-dialog.scss',
})
export class InviteDialog {
  readonly data = inject<InviteData>(MAT_DIALOG_DATA);
  private readonly clipboard = inject(WebClipboard);
  readonly feedback = signal('');
  readonly manual = signal(false);
  readonly canShare = isNative || Boolean(navigator.share);

  async send(): Promise<void> {
    const options = { title: this.data.title, url: this.data.url, text: 'Vem montar a lista de compras comigo.' };
    try {
      if (isNative) {
        const { Share } = await import('@capacitor/share');
        await Share.share({ ...options, dialogTitle: 'Convidar para a lista' });
      } else {
        await navigator.share(options);
      }
    } catch (error) {
      if (error instanceof Error && (error.name === 'AbortError' || error.message === 'Share canceled')) return;
      this.feedback.set('Não foi possível enviar por aqui. Você pode copiar o link.');
    }
  }

  async copy(): Promise<void> {
    try {
      if (isNative) {
        const { Clipboard } = await import('@capacitor/clipboard');
        await Clipboard.write({ string: this.data.url });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(this.data.url);
      } else if (!this.clipboard.copy(this.data.url)) {
        throw new Error('Clipboard indisponível.');
      }
      this.feedback.set('Link copiado.');
      this.manual.set(false);
    } catch {
      this.manual.set(true);
      this.feedback.set('Selecione e copie o link para enviar o convite.');
      requestAnimationFrame(() => {
        const field = document.querySelector<HTMLInputElement>('#invite-link');
        field?.focus();
        field?.select();
      });
    }
  }
}
