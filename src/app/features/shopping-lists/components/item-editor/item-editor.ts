import { examplePrice, numberLabel, t, unitLabel } from '../../../../core/locale.ts';
import { Component, effect, inject, input, output, signal, computed, DestroyRef, ElementRef, viewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { LucideChevronDown, LucideFolder, LucideLayers, LucideMessageSquare, LucideMinus, LucidePlus, LucideScanBarcode, LucideSlidersHorizontal, LucideTag } from '@lucide/angular';
import { categories, units } from '../../models/shopping-list.ts';
import { isCategory, itemUnitPrice, suggestCategory, validateItem } from '../../models/list-rules.ts';
import { LocalizedDecimal } from '../../../../shared/localized-decimal.ts';
import type { Currency } from '../../../../shared/locale-preferences.ts';
import { LabelReader } from '../../../label-reader/services/label-reader.ts';
import type { Category, ItemFields, ShoppingItem } from '../../models/shopping-list.ts';

const minQuantity = .000001;
const maxQuantity = 1000000;

@Component({
  selector: 'lj-item-editor',
  imports: [
    ReactiveFormsModule, LocalizedDecimal, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    LucideChevronDown, LucideFolder, LucideLayers, LucideMessageSquare, LucideMinus, LucidePlus,
    LucideScanBarcode, LucideSlidersHorizontal, LucideTag,
  ],
  templateUrl: './item-editor.html',
  styleUrl: './item-editor.scss',
})
export class ItemEditor {
  readonly t = t;
  readonly unitLabel = unitLabel;
  readonly numberLabel = numberLabel;
  readonly examplePrice = examplePrice;
  readonly currency = input.required<Currency>();
  private readonly reader = inject(LabelReader);
  private readonly destroy = inject(DestroyRef);
  readonly editing = input<ShoppingItem | null>(null);
  readonly disabled = input(false);
  readonly supportsCategory = input(false);
  readonly saved = output<ItemFields>();
  readonly idPrefix = computed(() => this.editing() ? 'edit-item' : 'item');
  private readonly priceInput = viewChild.required('priceInput', { read: ElementRef });
  private readonly readPriceButton = viewChild.required('readPriceButton', { read: ElementRef });
  readonly details = signal(false);
  readonly feedback = signal('');
  readonly openingReader = signal(false);
  readonly options = Object.entries(categories);
  readonly units = units;
  readonly categories = categories;
  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(120)] }),
    quantity: new FormControl<number | null>(1, [Validators.required, Validators.min(minQuantity), Validators.max(maxQuantity)]),
    unit: new FormControl('un', { nonNullable: true }),
    estimated_price: new FormControl<number | null>(null, [Validators.min(0), Validators.max(100000000)]),
    notes: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(500)] }),
    category: new FormControl<Category | ''>('', { nonNullable: true }),
  });

  constructor() {
    effect(() => {
      const item = this.editing();
      if (!item) return;
      const price = itemUnitPrice(item);
      this.form.reset({
        name: item.name, quantity: Number(item.quantity ?? 1), unit: item.unit ?? 'un',
        estimated_price: price == null || price === '' ? null : Number(price),
        notes: item.notes ?? '', category: isCategory(item.category) ? item.category : '',
      });
      this.details.set(true);
    });
    effect(() => this.disabled() ? this.form.disable() : this.form.enable());
  }

  suggested(): string {
    return t(categories[suggestCategory(this.form.controls.name.value)]);
  }

  canAdjustQuantity(step: -1 | 1): boolean {
    const quantity = (this.form.controls.quantity.value ?? 0) + step;
    return !this.disabled() && quantity >= minQuantity && quantity <= maxQuantity;
  }

  adjustQuantity(step: -1 | 1): void {
    if (!this.canAdjustQuantity(step)) return;
    const control = this.form.controls.quantity;
    control.setValue(Number(((control.value ?? 0) + step).toPrecision(15)));
    control.markAsDirty();
  }

  canSubmit(): boolean {
    return !this.disabled() && !!this.form.controls.name.value.trim();
  }

  submit(): void {
    if (this.disabled()) return;
    const values = this.form.getRawValue();
    const errors = validateItem({ ...values, unitPrice: values.estimated_price });
    if (this.form.invalid || values.quantity === null || Object.keys(errors).length) {
      this.form.markAllAsTouched();
      this.details.set(!errors.name);
      this.feedback.set(Object.values(errors)[0] ?? 'Confira os detalhes do produto.');
      return;
    }
    this.saved.emit({
      name: values.name.trim(), quantity: values.quantity, unit: values.unit,
      estimated_price: values.estimated_price, notes: values.notes.trim(),
      ...(this.supportsCategory() ? { category: values.category || suggestCategory(values.name) } : {}),
    });
  }

  async readPrice(): Promise<void> {
    if (this.openingReader()) return;
    this.openingReader.set(true);
    let confirmed = false;
    try {
      const result = await this.reader.open(this.destroy, this.currency());
      if (!this.destroy.destroyed && result !== undefined) {
        this.form.controls.estimated_price.setValue(result);
        confirmed = true;
      }
    } catch {
      if (!this.destroy.destroyed) this.feedback.set('O leitor está indisponível. Você pode digitar o preço.');
    } finally {
      if (!this.destroy.destroyed) {
        this.openingReader.set(false);
        requestAnimationFrame(() => {
          if (!this.destroy.destroyed) (confirmed ? this.priceInput() : this.readPriceButton()).nativeElement.focus();
        });
      }
    }
  }
}
