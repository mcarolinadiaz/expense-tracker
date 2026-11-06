import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SideBar } from './side-bar/side-bar';

@Component({
  imports: [RouterOutlet, SideBar],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {}
