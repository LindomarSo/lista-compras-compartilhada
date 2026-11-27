import { Component, DestroyRef, ElementRef, afterNextRender, inject, output, signal, viewChild } from '@angular/core';

@Component({
  selector: 'lj-camera-preview',
  templateUrl: './camera-preview.html',
  styleUrl: './camera-preview.scss',
})
export class CameraPreview {
  private readonly video = viewChild.required<ElementRef<HTMLVideoElement>>('video');
  private stream?: MediaStream;
  private stopped = false;
  readonly ready = signal(false);
  readonly unavailable = output<void>();

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stop());
    afterNextRender(() => void this.start());
  }

  capture(): HTMLCanvasElement | null {
    const video = this.video().nativeElement;
    if (!this.ready() || !video.videoWidth) return null;
    const width = Math.floor(video.videoWidth * .8);
    const height = Math.floor(video.videoHeight * .36);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d')?.drawImage(video, (video.videoWidth - width) / 2,
      (video.videoHeight - height) / 2, width, height, 0, 0, width, height);
    return canvas;
  }

  private async start(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } }, audio: false,
      });
      if (this.stopped) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      this.stream = stream;
      const video = this.video().nativeElement;
      video.srcObject = stream;
      await video.play();
      if (!this.stopped) this.ready.set(true);
    } catch {
      if (this.stopped) return;
      this.stop();
      this.unavailable.emit();
    }
  }

  private stop(): void {
    this.stopped = true;
    this.stream?.getTracks().forEach(track => track.stop());
    this.stream = undefined;
  }
}
