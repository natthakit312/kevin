import { Component, Inject, inject } from '@angular/core';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { Mission } from '../../_models/mission';
import { LanguageService } from '../../_services/language-service';

export interface EditMissionData {
    mission: Mission;
}

@Component({
    selector: 'app-edit-mission',
    imports: [MatDialogModule, MatButtonModule, FormsModule],
    templateUrl: './edit-mission.html',
    styleUrl: './edit-mission.scss',
})
export class EditMission {
    public langService = inject(LanguageService);
    missionData: { name: string, description: string };
    private readonly _dialogRef = inject(MatDialogRef<EditMission>);

    constructor(@Inject(MAT_DIALOG_DATA) public data: EditMissionData) {
        this.missionData = {
            name: data.mission.name,
            description: data.mission.description || ''
        };
    }

    onSubmit() {
        this._dialogRef.close({
            name: this.missionData.name.trim() || undefined,
            description: this.missionData.description.trim() || undefined
        });
    }
}
