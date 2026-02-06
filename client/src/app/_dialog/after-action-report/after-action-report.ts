import { Component, Inject, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Mission } from '../../_models/mission';
import { LanguageService } from '../../_services/language-service';

export interface AARData {
    mission: Mission;
    status: 'Completed' | 'Failed';
    crewNames?: string[];
}

@Component({
    selector: 'app-after-action-report',
    standalone: true,
    imports: [CommonModule, MatButtonModule, MatDialogModule, MatIconModule],
    templateUrl: './after-action-report.html',
    styleUrl: './after-action-report.scss',
})
export class AfterActionReport implements OnInit {
    public langService = inject(LanguageService);
    displayedText = signal<string>('');
    private fullReport: string = '';

    constructor(
        public dialogRef: MatDialogRef<AfterActionReport>,
        @Inject(MAT_DIALOG_DATA) public data: AARData
    ) { }

    ngOnInit() {
        this.generateReport();
        this.typewriterEffect();
    }

    private generateReport() {
        const m = this.data.mission;
        const statusKey = this.data.status === 'Completed' ? 'missions.status.completed' : 'missions.status.failed';
        const statusText = this.langService.translate(statusKey).toUpperCase();

        const crewDisplay = this.data.crewNames && this.data.crewNames.length > 0
            ? this.data.crewNames.map(name => `  - @${name}`).join('\n')
            : `  - ${this.langService.translate('aar.no_crew')}`;

        this.fullReport = `
${this.langService.translate('aar.debrief')}
${this.langService.translate('aar.mission_name')} : ${m.name}
${this.langService.translate('aar.final_status')} : ${statusText}

${this.langService.translate('aar.personnel_log')}
${this.langService.translate('aar.commander')}    : @${m.chief_display_name}
${this.langService.translate('aar.active_crew')}  :
${crewDisplay}

${this.langService.translate('aar.hq_comms')}
${this.data.status === 'Completed'
                ? this.langService.translate('aar.success_msg')
                : this.langService.translate('aar.failure_msg')}
        `;
    }

    private typewriterEffect() {
        let i = 0;
        const interval = setInterval(() => {
            this.displayedText.set(this.fullReport.substring(0, i));
            i++;
            if (i > this.fullReport.length) {
                clearInterval(interval);
            }
        }, 10);
    }

    onClose(): void {
        this.dialogRef.close();
    }
}
