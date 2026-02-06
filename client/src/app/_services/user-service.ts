import { Injectable } from '@angular/core';
import { environment } from "../../environments/environment.development"
import { HttpClient } from '@angular/common/http'
import { inject } from '@angular/core'
import { PassportService } from './passport-service'
import { fileTobase64 } from '../_helpers/file';
import { firstValueFrom } from 'rxjs';
import { CloudinaryImage } from '../_models/cloudinary-image';
@Injectable({
  providedIn: 'root',
})
export class UserService {
  private _base_url = environment.baseUrl + '/api/brawler'
  private _http = inject(HttpClient)
  private _passport = inject(PassportService)



  async uploadAvatarImg(file: File): Promise<string | null> {
    const url = this._base_url + '/avatar'
    const dataUrl = await fileTobase64(file)
    const base64Img = dataUrl.split(',')[1]
    const uploadImg = {
      'base64_img': base64Img
    }

    try {
      const cloudinaryImg = await firstValueFrom(this._http.post<CloudinaryImage>(url, uploadImg))
      this._passport.saveAvatarImgUrl(cloudinaryImg.url)
    } catch (error: any) {
      return error.error as string
    }

    return null
  }
}
