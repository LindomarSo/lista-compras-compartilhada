import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'lj-app-navigation',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './app-navigation.html',
  styleUrl: './app-navigation.scss',
})
export class AppNavigation {}
