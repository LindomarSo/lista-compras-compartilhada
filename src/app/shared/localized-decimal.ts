import { Directive, effect, ElementRef, forwardRef, inject, input } from '@angular/core';
import { NG_VALIDATORS, NG_VALUE_ACCESSOR, type ControlValueAccessor, type Validator } from '@angular/forms';
import { preferences } from '../core/locale.ts';
import { parseDecimal } from './locale-preferences.ts';

@Directive({
  selector: 'input[ljDecimal]',
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => LocalizedDecimal), multi: true },
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => LocalizedDecimal), multi: true },
  ],
  host: { '(input)': 'edit()', '(blur)': 'blur()' },
})
export class LocalizedDecimal implements ControlValueAccessor, Validator {
  readonly ljDecimal = input(20);
  private readonly field = inject<ElementRef<HTMLInputElement>>(ElementRef).nativeElement;
  private value: number | null = null;
  private onChange = (_: number | null) => {};
  private onTouched = () => {};

  constructor() {
    effect(() => {
      const { locale } = preferences();
      if (document.activeElement !== this.field) this.render(locale);
    });
  }

  writeValue(value: number | null): void {
    this.value = value;
    this.field.value = '';
    this.render(preferences().locale);
  }

  registerOnChange(change: (value: number | null) => void): void { this.onChange = change; }
  registerOnTouched(touch: () => void): void { this.onTouched = touch; }
  setDisabledState(disabled: boolean): void { this.field.disabled = disabled; }

  validate() {
    return this.value !== null && !Number.isFinite(this.value) ? { decimal: true } : null;
  }

  edit(): void {
    this.value = parseDecimal(this.field.value, this.ljDecimal());
    this.onChange(this.value);
  }

  blur(): void {
    this.onTouched();
    this.render(preferences().locale);
  }

  private render(locale: string): void {
    if (this.value === null) this.field.value = '';
    else if (Number.isFinite(this.value)) {
      this.field.value = new Intl.NumberFormat(locale, { useGrouping: false, maximumFractionDigits: 20 }).format(this.value);
    }
  }
}
