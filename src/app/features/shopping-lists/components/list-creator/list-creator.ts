import { Component, input, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { listNameMaxLength } from '../../models/shopping-list.ts';

@Component({
  selector: 'lj-list-creator',
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './list-creator.html',
  styleUrl: './list-creator.scss',
})
export class ListCreator {
  readonly error = input('');
  readonly maxLength = listNameMaxLength;
  readonly name = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(listNameMaxLength)] });
  readonly form = new FormGroup({ name: this.name });
  readonly created = output<string>();

  submit(): void {
    const name = this.name.value.trim();
    if (this.name.valid && name) this.created.emit(name);
  }
}
