import { inject, Injectable } from '@angular/core';
import { NgxSpinnerService } from 'ngx-spinner';

@Injectable({
  providedIn: 'root',
})
export class LoadingService {
  loadingRequestCount = 0;
  private _spinner = inject(NgxSpinnerService)


  loading() {
    this.loadingRequestCount++;
    this._spinner.show(undefined, {
      type: 'ball-spin-clockwise',
      bdColor: 'rgba(0, 0, 0, 0.8)',
      color: '#fff',
      fullScreen: false,
    })
}

idle() {
this.loadingRequestCount--;
if (this.loadingRequestCount <= 0) {
  this.loadingRequestCount = 0;
  this._spinner.hide();
}


}

}
