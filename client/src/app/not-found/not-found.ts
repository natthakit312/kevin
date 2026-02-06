import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { LanguageService } from '../_services/language-service';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink, MatButtonModule, MatIcon],
  templateUrl: './not-found.html',
  styleUrl: './not-found.scss',
})
export class NotFound {
  public langService = inject(LanguageService);
}
