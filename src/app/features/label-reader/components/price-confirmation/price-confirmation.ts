import { Component, input, output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'lj-price-confirmation',
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './price-confirmation.html',
  styleUrl: './price-confirmation.scss',
})
export class PriceConfirmation {
  readonly price = input.required<FormControl<number | null>>();
  readonly confirmed = output<number>();

  submit(): void {
    const control = this.price();
    control.markAsTouched();
    const value = control.value;
    if (control.valid && value !== null && Number.isFinite(value)) this.confirmed.emit(value);
  }
}
