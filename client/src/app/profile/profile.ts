import { Component, computed, inject, Signal } from '@angular/core';
import { getAvatarUrl } from '../_helpers/util';
import { PassportService } from '../_services/passport-service';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { UploadPhoto } from '../_dialog/upload-photo/upload-photo';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { LanguageService } from '../_services/language-service';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';

@Component({
  selector: 'app-profile',
  imports: [MatDialogModule, MatButtonModule, CommonModule, MatIconModule, FormsModule, MatInputModule, MatFormFieldModule],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile {
  public passport = inject(PassportService);
  private _dialog = inject(MatDialog);
  public langService = inject(LanguageService);

  avatar_url: Signal<string>;
  user = this.passport.data;

  isEditingSpecialty = false;
  tempSpecialty = '';

  constructor() {
    this.avatar_url = computed(() => getAvatarUrl(this.passport.data()));
  }

  openUploadPhotoDialog() {
    const dialogRef = this._dialog.open(UploadPhoto, {
      width: '400px',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // Refresh handled by signal
      }
    });
  }

  editSpecialty() {
    this.tempSpecialty = this.user()?.specialty || '';
    this.isEditingSpecialty = true;
  }

  async saveSpecialty() {
    if (this.tempSpecialty.trim()) {
      await this.passport.updateSpecialty(this.tempSpecialty.trim());
      this.isEditingSpecialty = false;
    }
  }

  cancelEdit() {
    this.isEditingSpecialty = false;
  }
}
