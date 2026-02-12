import { Component, ElementRef, OnInit, ViewChild, inject, signal, OnDestroy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MissionService } from '../../_services/mission-service';
import { MissionMessageService } from '../../_services/mission-message.service';
import { PassportService } from '../../_services/passport-service';
import { Mission } from '../../_models/mission';
import { MissionMessage } from '../../_models/mission-message';
import { getAvatarUrl } from '../../_helpers/util';
import { interval, Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LanguageService } from '../../_services/language-service';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialog } from '../../_dialog/confirm-dialog/confirm-dialog';
import { firstValueFrom } from 'rxjs';
import { RealtimeChannel } from '@supabase/supabase-js';

@Component({
    selector: 'app-mission-detail',
    standalone: true,
    imports: [CommonModule, MatIconModule, MatButtonModule],
    templateUrl: './mission-detail.html',
    styleUrls: ['./mission-detail.scss']
})
export class MissionDetail implements OnInit, OnDestroy {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private missionService = inject(MissionService);
    private messageService = inject(MissionMessageService);
    private passportService = inject(PassportService);
    private dialog = inject(MatDialog);
    public langService = inject(LanguageService);

    mission = signal<Mission | null>(null);
    crew = signal<any[]>([]);
    messages = signal<MissionMessage[]>([]);
    currentUserId = signal<number>(0);
    isLoggedIn = this.passportService.isSignin;

    hasMore = signal(true);
    loadingMore = signal(false);

    isChief = computed(() => this.mission()?.chief_id === this.currentUserId());
    isMember = computed(() => this.crew().some(m => m.id === this.currentUserId()));

    missionId!: number;

    private messageSubscription?: RealtimeChannel;

    @ViewChild('chatContainer') private chatContainer!: ElementRef;

    async ngOnInit() {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.missionId = parseInt(id, 10);
            this.currentUserId.set(this.passportService.data()?.id || 0);

            await this.loadData();

            // Real-time updates via Supabase
            this.messageSubscription = this.messageService.subscribeToMessages(this.missionId, (newMsg) => {
                // Check if message already exists (to avoid duplicates from local refresh)
                const exists = this.messages().some(m => m.id === newMsg.id);
                if (!exists) {
                    this.messages.update(prev => [...prev, newMsg]);
                    setTimeout(() => this.scrollToBottom(), 100);
                }
            });
        }
    }

    ngOnDestroy() {
        if (this.messageSubscription) {
            this.messageSubscription.unsubscribe();
        }
    }

    async loadData() {
        try {
            const data = await this.missionService.get(this.missionId);
            if (!data) {
                throw new Error('Mission not found');
            }
            this.mission.set(data);
            this.crew.set(await this.missionService.getCrew(this.missionId));
            await this.loadMessages();
        } catch (e) {
            console.error('Error loading mission data', e);
            alert(this.langService.translate('alert.mission_not_found'));
            this.router.navigate(['/missions']);
        }
    }

    async loadMessages(silent: boolean = false) {
        try {
            if (silent) {
                // Polling for NEW messages
                const currentMsgs = this.messages();
                const lastId = currentMsgs.length > 0 ? currentMsgs[currentMsgs.length - 1].id : 0;

                const newMsgs = await this.messageService.getMessages(this.missionId, 50, undefined, lastId);

                if (newMsgs.length > 0) {
                    this.messages.update(prev => [...prev, ...newMsgs]);
                    setTimeout(() => this.scrollToBottom(), 100);
                }
            } else {
                // Initial load: Fetch latest 50
                const msgs = await this.messageService.getMessages(this.missionId, 50);
                this.messages.set(msgs);
                this.hasMore.set(msgs.length === 50);
                setTimeout(() => this.scrollToBottom(), 100);
            }
        } catch (e) {
            console.error('Error loading messages', e);
        }
    }

    async loadMore() {
        if (this.loadingMore() || !this.hasMore() || this.messages().length === 0) return;

        this.loadingMore.set(true);
        try {
            const firstId = this.messages()[0].id;
            const olderMsgs = await this.messageService.getMessages(this.missionId, 50, firstId);

            if (olderMsgs.length < 50) {
                this.hasMore.set(false);
            }

            if (olderMsgs.length > 0) {
                // Save current scroll height to maintain position
                const container = this.chatContainer.nativeElement;
                const oldHeight = container.scrollHeight;

                this.messages.update(prev => [...olderMsgs, ...prev]);

                // Maintain scroll position after DOM update
                setTimeout(() => {
                    container.scrollTop = container.scrollHeight - oldHeight;
                }, 0);
            } else {
                this.hasMore.set(false);
            }
        } catch (e) {
            console.error('Error loading more messages', e);
        } finally {
            this.loadingMore.set(false);
        }
    }

    async sendMessage(content: string) {
        if (!content.trim() || !this.isLoggedIn()) return;

        try {
            // Send via Backend (will be captured by Real-time subscription)
            await this.messageService.sendMessage(this.missionId, content);
            // We no longer need manual refresh here!
            setTimeout(() => this.scrollToBottom(), 100);
        } catch (e) {
            console.error('Failed to send message', e);
            alert(this.langService.translate('alert.failed_send_msg'));
        }
    }

    navigateToLogin() {
        this.router.navigate(['/login']);
    }

    async onJoin() {
        if (!this.mission() || !this.isLoggedIn()) return;
        try {
            await this.missionService.join(this.missionId);
            await this.loadData();
        } catch (error) {
            console.error('Error joining mission:', error);
            alert(this.langService.translate('alert.failed_join'));
        }
    }

    async onLeave() {
        if (!this.mission() || !this.isLoggedIn()) return;

        const dialogRef = this.dialog.open(ConfirmDialog, {
            data: {
                title: this.langService.translate('dialog.leave_mission.title'),
                message: this.langService.translate('dialog.leave_mission.message', { name: this.mission()?.name || '' }),
                confirmText: this.langService.translate('missions.action.leave'),
                cancelText: this.langService.translate('common.cancel')
            }
        });

        if (await firstValueFrom(dialogRef.afterClosed())) {
            try {
                await this.missionService.leave(this.missionId);
                await this.loadData();
                // If it's a detail page and we just left, we might want to stay or go back. 
                // Let's stay and refresh for now.
            } catch (error) {
                console.error('Error leaving mission:', error);
                alert(this.langService.translate('alert.failed_leave'));
            }
        }
    }

    getAvatar(url?: string) {
        return getAvatarUrl(url);
    }

    getStatusClass(status: string): string {
        switch (status) {
            case 'Open': return 'status-open';
            case 'InProgress': return 'status-inprogress';
            case 'Completed': return 'status-completed';
            case 'Failed': return 'status-failed';
            default: return '';
        }
    }

    private scrollToBottom(): void {
        try {
            this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
        } catch (err) { }
    }
}
