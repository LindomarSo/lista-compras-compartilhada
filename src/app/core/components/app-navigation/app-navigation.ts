import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideChartColumn, LucideListChecks } from '@lucide/angular';

@Component({
  selector: 'lj-app-navigation',
  imports: [RouterLink, RouterLinkActive, LucideChartColumn, LucideListChecks],
  templateUrl: './app-navigation.html',
  styleUrl: './app-navigation.scss',
})
export class AppNavigation {}
