import { Component, inject, computed, Signal, effect } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MissionService } from '../../_services/mission-service';
import { Mission } from '../../_models/mission';
import { BehaviorSubject } from 'rxjs';
import { PassportService } from '../../_services/passport-service';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialog } from '../../_dialog/confirm-dialog/confirm-dialog';
import { firstValueFrom } from 'rxjs';
import { LanguageService } from '../../_services/language-service';

@Component({
    selector: 'app-joined-missions',
    imports: [
        CommonModule,
        MatCardModule,
        MatButtonModule,
        MatIconModule,
        MatTableModule
    ],
    templateUrl: './joined-missions.html',
    styleUrl: './joined-missions.scss',
})
export class JoinedMissions {
    private _missionService = inject(MissionService);
    private _passportService = inject(PassportService);
    private _dialog = inject(MatDialog);
    private _router = inject(Router);
    public langService = inject(LanguageService);

    displayedColumns: string[] = ['name', 'description', 'chief_display_name', 'status', 'actions'];

    private _missionsSubject = new BehaviorSubject<Mission[]>([]);
    missions$ = this._missionsSubject.asObservable();
    userId = computed(() => this._passportService.data()?.id);

    filterStatus: 'Open' | 'InProgress' | 'Completed' | 'Failed' | undefined;

    constructor() {
        // Reactive: reload missions when user ID changes
        effect(() => {
            this.userId();
            this.loadMissions();
        });
    }

    setFilterStatus(status: 'Open' | 'InProgress' | 'Completed' | 'Failed' | undefined) {
        this.filterStatus = status;
        this.loadMissions();
    }

    async loadMissions() {
        if (!this._passportService.isSignin()) {
            this._missionsSubject.next([]);
            return;
        }
        try {
            const allMyMissions = await this._missionService.getMyMissions();
            const myId = this.userId();
            if (myId) {
                // Filter: only keep missions where I am NOT the chief (so I am a crew)
                let joinedMissions = allMyMissions.filter(m => m.chief_id !== myId);

                if (this.filterStatus) {
                    joinedMissions = joinedMissions.filter(m => m.status === this.filterStatus);
                }

                this._missionsSubject.next(joinedMissions);
            }
        } catch (error) {
            console.error(error);
        }
    }

    async onLeave(mission: Mission) {
        const dialogRef = this._dialog.open(ConfirmDialog, {
            data: {
                title: this.langService.translate('dialog.leave_mission.title'),
                message: this.langService.translate('dialog.leave_mission.message', { name: mission.name }),
                confirmText: this.langService.translate('missions.action.leave'),
                cancelText: this.langService.translate('common.cancel')
            }
        });

        const result = await firstValueFrom(dialogRef.afterClosed());
        if (!result) return;

        try {
            await this._missionService.leave(mission.id);
            await this.loadMissions(); // Refresh list
        } catch (error: any) {
            console.error('Error leaving mission:', error);
            alert(`Failed to leave: ${error.message || 'Unknown error'}`);
        }
    }
    viewMission(mission: Mission) {
        this._router.navigate(['/missions', mission.id]);
    }
}
