import { Component, inject } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { AddMission } from '../../_models/add-mission';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { LanguageService } from '../../_services/language-service';

@Component({
  selector: 'app-new-mission',
  imports: [MatDialogModule, MatButtonModule, FormsModule],
  templateUrl: './new-mission.html',
  styleUrl: './new-mission.scss',
})
export class NewMission {
  public langService = inject(LanguageService);
  addMission: AddMission = {
    name: '',
    description: '',
    max_crew: 5
  };
  private readonly _dialogRef = inject(MatDialogRef<NewMission>);

  onSubmit() {
    const mission = this.clean(this.addMission);
    this._dialogRef.close(mission);
  }

  private clean(addMission: AddMission): AddMission {
    return {
      name: addMission.name.trim() || 'untitle',
      description: addMission.description?.trim() || undefined,
      max_crew: addMission.max_crew || 5
    };
  }
}
