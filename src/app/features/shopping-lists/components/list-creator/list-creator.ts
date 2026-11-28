import { Component, booleanAttribute, input, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'lj-list-creator',
  imports: [ReactiveFormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule],
  templateUrl: './list-creator.html',
  styleUrl: './list-creator.scss',
})
export class ListCreator {
  readonly modal = input(false, { transform: booleanAttribute });
  readonly error = input('');
  readonly name = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] });
  readonly form = new FormGroup({ name: this.name });
  readonly created = output<string>();

  submit(): void {
    const name = this.name.value.trim();
    if (this.name.valid && name) this.created.emit(name);
  }
}
