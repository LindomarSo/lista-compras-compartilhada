import { t } from '../../../../core/locale.ts';
import { Component, DestroyRef, inject, signal, viewChild } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import type { Currency } from '../../../../shared/locale-preferences.ts';
import { LabelOcr } from '../../services/label-ocr.ts';
import { CameraPreview } from '../camera-preview/camera-preview.ts';
import { PriceConfirmation } from '../price-confirmation/price-confirmation.ts';

@Component({
  selector: 'lj-label-dialog',
  imports: [MatDialogModule, MatButtonModule, CameraPreview, PriceConfirmation],
  templateUrl: './label-dialog.html',
  styleUrl: './label-dialog.scss',
})
export class LabelDialog {
  readonly t = t;
  readonly currency = inject<Currency>(MAT_DIALOG_DATA);
  private readonly dialog = inject<MatDialogRef<LabelDialog, number>>(MatDialogRef);
  private readonly ocr = inject(LabelOcr);
  private readonly controller = new AbortController();
  readonly camera = viewChild(CameraPreview);
  readonly reading = signal(false);
  readonly status = signal('');
  readonly price = new FormControl<number | null>(null, [Validators.required, Validators.min(0), Validators.max(100000000)]);

  constructor() {
    inject(DestroyRef).onDestroy(() => this.controller.abort());
  }

  confirm(value: number): void {
    this.dialog.close(value);
  }

  async capture(): Promise<void> {
    if (this.reading()) return;
    const canvas = this.camera()?.capture();
    if (!canvas) return;
    this.reading.set(true);
    this.price.reset();
    this.status.set('Lendo a etiqueta neste aparelho…');
    try {
      const candidates = await this.ocr.recognize(canvas, this.controller.signal);
      if (this.controller.signal.aborted) return;
      const price = candidates[0];
      if (candidates.length === 1 && price !== undefined) {
        this.price.setValue(price);
        this.status.set('Confira o preço sugerido antes de usar.');
      } else {
        this.status.set(candidates.length > 1 ? 'Encontrei mais de um valor. Enquadre só o preço desejado ou informe o valor.'
          : 'Não consegui ler um preço. Aproxime a etiqueta ou informe o valor.');
      }
    } catch {
      if (!this.controller.signal.aborted) this.status.set('Leitura indisponível. Tente novamente ou informe o valor.');
    } finally {
      canvas.width = 0;
      this.reading.set(false);
    }
  }
}
