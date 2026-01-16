import { Component, computed, inject, Signal } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { PassportService } from '../_services/passport-service';

import { MatMenuModule } from '@angular/material/menu';
import { getAvatar } from '../_helpers/util';

@Component({
  selector: 'app-navbar',
  imports: [MatToolbarModule, MatButtonModule, MatIconModule, RouterLink, RouterLinkActive, MatMenuModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar {
  public passport = inject(PassportService);
  private router = inject(Router);

  display_name: Signal<string | undefined>;
  avatar_url: Signal<string | undefined>;
  profile_link: Signal<string>;

  constructor() {
    this.display_name = computed(() => this.passport.data()?.displayName || 'Guest');
    this.avatar_url = computed(() => getAvatar(this.passport.data()));
    this.profile_link = computed(() => this.passport.data()?.displayName ? '/profile' : '/not-found');
  }

  logout() {
    this.passport.logout();
    this.router.navigate(['/login']);
  }
}
