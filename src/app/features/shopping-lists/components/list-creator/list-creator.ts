import { Component, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'lj-list-creator',
  imports: [ReactiveFormsModule, MatButtonModule, MatCardModule, MatFormFieldModule, MatInputModule],
  templateUrl: './list-creator.html',
  styleUrl: './list-creator.scss',
})
export class ListCreator {
  readonly name = new FormControl('Compras da semana', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] });
  readonly form = new FormGroup({ name: this.name });
  readonly created = output<string>();

  submit(): void {
    const name = this.name.value.trim();
    if (this.name.valid && name) this.created.emit(name);
  }
}
