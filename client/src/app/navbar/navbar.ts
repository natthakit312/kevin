import { Component, computed, inject, Signal, signal } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { PassportService } from '../_services/passport-service';

import { MatMenuModule } from '@angular/material/menu';
import { getAvatarUrl } from '../_helpers/util';

import { LanguageService } from '../_services/language-service';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialog } from '../_dialog/confirm-dialog/confirm-dialog';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-navbar',
  imports: [CommonModule, MatToolbarModule, MatButtonModule, MatIconModule, RouterLink, RouterLinkActive, MatMenuModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar {
  public passport = inject(PassportService);
  public langService = inject(LanguageService);
  private router = inject(Router);
  private dialog = inject(MatDialog);

  display_name: Signal<string | undefined>;
  avatar_url: Signal<string | undefined>;
  profile_link: Signal<string>;

  // Disconnect Overlay State
  isDisconnecting = signal(false);
  disconnectStatus = signal('');

  constructor() {
    this.display_name = computed(() => this.passport.data()?.displayName);
    this.avatar_url = computed(() => getAvatarUrl(this.passport.data()));
    this.profile_link = computed(() => this.passport.data()?.displayName ? '/profile' : '/login');
  }

  async logout() {
    const dialogRef = this.dialog.open(ConfirmDialog, {
      data: {
        title: this.langService.translate('auth.logout.title'),
        message: this.langService.translate('auth.logout.message'),
        confirmText: this.langService.translate('auth.logout.confirm'),
        cancelText: this.langService.translate('common.cancel')
      }
    });

    const confirmed = await firstValueFrom(dialogRef.afterClosed());
    if (confirmed) {
      await this.performTacticalDisconnect();
    }
  }

  private async performTacticalDisconnect() {
    this.isDisconnecting.set(true);

    // Step 1: Syncing
    this.disconnectStatus.set(this.langService.translate('auth.logout.syncing'));
    await new Promise(r => setTimeout(r, 1000));

    // Step 2: Clearing traces
    this.disconnectStatus.set(this.langService.translate('auth.logout.clearing'));
    await new Promise(r => setTimeout(r, 800));

    // Finalize
    this.passport.destroy();
    this.isDisconnecting.set(false);
    this.router.navigate(['/login']);
  }
}
