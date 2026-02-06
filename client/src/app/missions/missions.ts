import { Component, inject, computed, Signal, effect, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MissionService } from '../_services/mission-service';
import { MissionFilter } from '../_models/mission-filter';
import { Mission } from '../_models/mission';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { PassportService } from '../_services/passport-service';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialog } from '../_dialog/confirm-dialog/confirm-dialog';
import { LanguageService } from '../_services/language-service';

@Component({
  selector: 'app-missions',
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatIconModule,
    MatChipsModule,
    MatTableModule,
    MatTooltipModule
  ],
  templateUrl: './missions.html',
  styleUrl: './missions.scss',
})
export class Missions {
  private _missionService = inject(MissionService);
  private _passportService = inject(PassportService);
  private _dialog = inject(MatDialog);
  private _router = inject(Router);
  public langService = inject(LanguageService);
  filter: MissionFilter = {};
  isSignin: Signal<boolean>;

  displayedColumns: string[] = ['name', 'description', 'chief_display_name', 'crew_count', 'status', 'created_at', 'updated_at', 'actions'];

  hasMore = signal(true);
  loadingMore = signal(false);
  private _pageSize = 20;

  private _missionsSubject = new BehaviorSubject<Mission[]>([]);
  missions$ = this._missionsSubject.asObservable();
  joinedMissionIds = new BehaviorSubject<Set<number>>(new Set());
  userId = computed(() => this._passportService.data()?.id);

  constructor() {
    this.isSignin = computed(() => this._passportService.isSignin());

    // Auto reload missions when login status changes
    effect(() => {
      const signedIn = this.isSignin();
      this.userId();

      if (!signedIn) {
        // Clear state on logout
        this.joinedMissionIds.next(new Set());
      }

      this.onSubmit();
    });
  }

  async onSubmit() {
    this.filter.offset = 0;
    this.filter.limit = this._pageSize;
    this._missionsSubject.next([]); // Clear before fetch
    const result = await this.fetchMissions();
    this.hasMore.set(result.length >= this._pageSize);
    this._missionsSubject.next(result);
  }

  private async fetchMissions() {
    let result = await this._missionService.gets(this.filter);

    // Filter out missions created by the current user and already joined
    if (this.isSignin()) {
      await this.loadJoinedMissions();
      const myId = this.userId();
      const joinedIds = this.joinedMissionIds.value;

      if (myId) {
        result = result.filter(m => m.chief_id !== myId && !joinedIds.has(m.id));
      }
    }
    return result;
  }

  async loadMore() {
    if (this.loadingMore() || !this.hasMore()) return;
    this.loadingMore.set(true);
    try {
      this.filter.offset = (this.filter.offset || 0) + this._pageSize;
      const nextBatch = await this.fetchMissions();
      this.hasMore.set(nextBatch.length >= this._pageSize);
      this._missionsSubject.next([...this._missionsSubject.value, ...nextBatch]);
    } catch (e) {
      console.error('Error loading more missions', e);
    } finally {
      this.loadingMore.set(false);
    }
  }

  async loadJoinedMissions() {
    try {
      const myMissions = await this._missionService.getMyMissions();
      this.joinedMissionIds.next(new Set(myMissions.map(m => m.id)));
    } catch (error) {
      console.error('Error loading joined missions:', error);
    }
  }

  async onJoin(mission: Mission) {
    try {
      await this._missionService.join(mission.id);
      await this.onSubmit(); // Refresh to update crew count and joined status
    } catch (error: any) {
      console.error('Error joining mission:', error);
      if (error.error) {
        console.error('Server response:', error.error);
        alert(`Failed to join: ${error.error}`);
      } else {
        alert(`Failed to join: ${error.message || 'Unknown error'}`);
      }
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

    if (await firstValueFrom(dialogRef.afterClosed())) {
      try {
        await this._missionService.leave(mission.id);
        await this.onSubmit(); // Refresh to update crew count and joined status
      } catch (error: any) {
        console.error('Error leaving mission:', error);
        if (error.error) {
          console.error('Server response:', error.error);
          alert(`Failed to leave: ${error.error}`);
        } else {
          alert(`Failed to leave: ${error.message || 'Unknown error'}`);
        }
      }
    }
  }

  isJoined(missionId: number): boolean {
    return this.joinedMissionIds.value.has(missionId);
  }

  viewMission(mission: Mission) {
    this._router.navigate(['/missions', mission.id]);
  }

  setFilterStatus(status: 'Open' | 'InProgress' | 'Completed' | 'Failed' | undefined) {
    this.filter.status = status;
    this.onSubmit();
  }
}
