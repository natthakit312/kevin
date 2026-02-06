import { Component, inject, effect, computed } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MissionService } from '../../_services/mission-service';
import { Mission } from '../../_models/mission';
import { NewMission } from '../../_dialog/new-mission/new-mission';
import { AddMission } from '../../_models/add-mission';
import { MatIcon } from "@angular/material/icon";
import { DatePipe, AsyncPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { PassportService } from '../../_services/passport-service';
import { MatTableModule } from '@angular/material/table';
import { MatMenuModule } from '@angular/material/menu';
import { ConfirmDialog } from '../../_dialog/confirm-dialog/confirm-dialog';
import { EditMission } from '../../_dialog/edit-mission/edit-mission';
import { LanguageService } from '../../_services/language-service';
import { AfterActionReport } from '../../_dialog/after-action-report/after-action-report';

@Component({
  selector: 'app-mission-manager',
  imports: [MatIcon, DatePipe, MatButtonModule, MatCardModule, MatChipsModule, AsyncPipe, MatTableModule, MatMenuModule],
  templateUrl: './mission-manager.html',
  styleUrl: './mission-manager.scss',
})
export class MissionManager {
  private _missionService = inject(MissionService);
  private _passportService = inject(PassportService);
  private _dialog = inject(MatDialog);
  private _router = inject(Router);
  public langService = inject(LanguageService);

  private _missionsSubject = new BehaviorSubject<Mission[]>([]);
  readonly myMissions$ = this._missionsSubject.asObservable();

  displayedColumns: string[] = ['name', 'description', 'crew_count', 'status', 'created_at', 'updated_at', 'actions'];
  userId = computed(() => this._passportService.data()?.id);

  filterStatus: 'Open' | 'InProgress' | 'Completed' | 'Failed' | undefined;

  constructor() {
    effect(() => {
      this.userId();
      this.loadMyMission();
    });
  }

  setFilterStatus(status: 'Open' | 'InProgress' | 'Completed' | 'Failed' | undefined) {
    this.filterStatus = status;
    this.loadMyMission();
  }

  private async loadMyMission() {
    this._missionsSubject.next([]);
    if (!this._passportService.isSignin()) return;

    const allMissions = await this._missionService.getMyMissions();
    const myId = this.userId();
    if (myId) {
      let myCreatedMissions = allMissions.filter(m => m.chief_id === myId);

      if (this.filterStatus) {
        myCreatedMissions = myCreatedMissions.filter(m => m.status === this.filterStatus);
      }

      this._missionsSubject.next(myCreatedMissions);
    }
  }

  openDialog() {
    const ref = this._dialog.open(NewMission);
    ref.afterClosed().subscribe(async (addMission: AddMission) => {
      if (!addMission) return;
      try {
        await this._missionService.add(addMission);
        await this.loadMyMission();
      } catch (error) {
        console.error('Error adding mission:', error);
      }
    });
  }

  async onDelete(mission: Mission) {
    if (mission.crew_count > 0 || mission.status === 'Completed' || mission.status === 'Failed') {
      alert(this.langService.translate('dialog.alert.cannot_delete'));
      return;
    }

    const dialogRef = this._dialog.open(ConfirmDialog, {
      data: {
        title: this.langService.translate('dialog.delete_mission.title'),
        message: this.langService.translate('dialog.delete_mission.message', { name: mission.name }),
        confirmText: this.langService.translate('manager.action.delete'),
        cancelText: this.langService.translate('common.cancel')
      }
    });

    if (await firstValueFrom(dialogRef.afterClosed())) {
      try {
        await this._missionService.delete(mission.id);
        await this.loadMyMission();
      } catch (error: any) {
        console.error('Error delete mission:', error);
        alert(`Failed to delete: ${error.message || 'Unknown error'}`);
      }
    }
  }

  async onStart(mission: Mission) {
    if (mission.status !== 'Open') return;
    if (mission.crew_count === 0) {
      alert(this.langService.translate('dialog.alert.no_crew_start'));
      return;
    }

    try {
      await this._missionService.updateStatusToInProgress(mission.id);
      await this.loadMyMission();
    } catch (error: any) {
      console.error('Error start mission:', error);
      alert(error.error || error.message);
    }
  }

  async onComplete(mission: Mission) {
    if (mission.status !== 'InProgress') return;
    try {
      await this._missionService.updateStatusToCompleted(mission.id);
      await this.loadMyMission();

      // Fetch crew names for report
      const crew = await this._missionService.getCrew(mission.id);
      const crewNames = crew.map(c => c.displayName || c.display_name);

      // Show AAR
      this._dialog.open(AfterActionReport, {
        data: { mission, status: 'Completed', crewNames },
        maxWidth: '650px',
        width: '95vw',
        disableClose: true
      });
    } catch (error: any) {
      console.error('Error complete mission:', error);
      alert(error.error || error.message);
    }
  }

  async onFail(mission: Mission) {
    if (mission.status !== 'InProgress') return;

    const dialogRef = this._dialog.open(ConfirmDialog, {
      data: {
        title: this.langService.translate('dialog.fail_mission.title'),
        message: this.langService.translate('dialog.fail_mission.message', { name: mission.name }),
        confirmText: this.langService.translate('common.confirm'),
        cancelText: this.langService.translate('common.cancel')
      }
    });

    if (await firstValueFrom(dialogRef.afterClosed())) {
      try {
        await this._missionService.updateStatusToFailed(mission.id);
        await this.loadMyMission();

        // Fetch crew names for report
        const crew = await this._missionService.getCrew(mission.id);
        const crewNames = crew.map(c => c.displayName || c.display_name);

        // Show AAR
        this._dialog.open(AfterActionReport, {
          data: { mission, status: 'Failed', crewNames },
          maxWidth: '650px',
          width: '95vw',
          disableClose: true
        });
      } catch (error: any) {
        console.error('Error fail mission:', error);
        alert(error.error || error.message);
      }
    }
  }

  async onEdit(mission: Mission) {
    if (mission.status === 'Completed' || mission.status === 'Failed') {
      return;
    }

    const dialogRef = this._dialog.open(EditMission, {
      data: { mission }
    });

    const result = await firstValueFrom(dialogRef.afterClosed());
    if (result) {
      try {
        await this._missionService.update(mission.id, result);
        await this.loadMyMission();
      } catch (error: any) {
        console.error('Error editing mission:', error);
        alert(`Failed to update: ${error.message || 'Unknown error'}`);
      }
    }
  }

  async onViewReport(mission: Mission) {
    const crew = await this._missionService.getCrew(mission.id);
    const crewNames = crew.map(c => c.displayName || c.display_name);

    this._dialog.open(AfterActionReport, {
      data: { mission, status: mission.status as 'Completed' | 'Failed', crewNames },
      maxWidth: '650px',
      width: '95vw',
      disableClose: false
    });
  }

  viewMission(mission: Mission) {
    this._router.navigate(['/missions', mission.id]);
  }
}
