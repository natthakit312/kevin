import { Component, inject, signal } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { UserService } from '../../_services/user-service';
import { MatIconModule } from '@angular/material/icon';
import { LanguageService } from '../../_services/language-service';

@Component({
  selector: 'app-upload-photo',
  imports: [MatDialogModule, MatButtonModule, CommonModule, MatIconModule],
  templateUrl: './upload-photo.html',
  styleUrl: './upload-photo.scss',
})
export class UploadPhoto {
  private dialogRef = inject(MatDialogRef<UploadPhoto>);
  private userService = inject(UserService);
  public langService = inject(LanguageService);

  acceptMimeType = ['image/jpeg', 'image/png'];
  selectedFile = signal<File | null>(null);
  previewUrl = signal<string | null>(null);
  errorMessage = signal<string | null>(null);
  isUploading = signal<boolean>(false);

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      if (this.acceptMimeType.includes(file.type)) {
        this.selectedFile.set(file);
        this.errorMessage.set(null);
        const reader = new FileReader();
        reader.onload = () => {
          this.previewUrl.set(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        this.errorMessage.set('Invalid file type. Please select a JPEG or PNG image.');
      }
    }
  }

  async onUpload() {
    const file = this.selectedFile();
    if (!file) return;

    this.isUploading.set(true);
    const result = await this.userService.uploadAvatarImg(file);
    this.isUploading.set(false);

    if (result === null) {
      this.dialogRef.close(true);
    } else {
      this.errorMessage.set(result);
    }
  }

  onCancel() {
    this.dialogRef.close(false);
  }
}
