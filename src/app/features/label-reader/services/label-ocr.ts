import { Injectable } from '@angular/core';
import { priceCandidates } from '../models/price-candidates.ts';

@Injectable({ providedIn: 'root' })
export class LabelOcr {
  async recognize(canvas: HTMLCanvasElement, signal: AbortSignal): Promise<number[]> {
    const { default: { createWorker, PSM } } = await import('tesseract.js');
    if (signal.aborted) throw new Error('Leitura interrompida.');
    const assets = new URL('./ocr/', document.baseURI);
    const deadline = AbortSignal.any([signal, AbortSignal.timeout(25000)]);
    let interrupt: () => void = () => {};
    const interrupted = new Promise<never>((_, reject) => {
      interrupt = () => reject(new Error('Leitura interrompida.'));
      deadline.addEventListener('abort', interrupt, { once: true });
    });
    let returned = false;
    const engine = Promise.resolve().then(() => createWorker('por', 1, {
      workerPath: new URL('worker.min.js', assets).href,
      corePath: assets.href,
      langPath: assets.href,
      workerBlobURL: false,
      errorHandler: () => interrupt(),
    }));
    void engine.then(worker => { if (returned) void worker.terminate(); }, () => {});
    let worker: Awaited<typeof engine> | undefined;
    try {
      worker = await Promise.race([engine, interrupted]);
      await Promise.race([worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT }), interrupted]);
      const { data } = await Promise.race([worker.recognize(canvas), interrupted]);
      return priceCandidates(data.text);
    } finally {
      returned = true;
      deadline.removeEventListener('abort', interrupt);
      if (worker) await worker.terminate();
    }
  }
}
