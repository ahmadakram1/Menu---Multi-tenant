import { NgIf } from '@angular/common';
import { Component, OnDestroy, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { LanguageService, TranslatePipe } from '../../../core/i18n/language.service';
import { API_BASE } from '../../../core/api';
import { AuthUser, setAuthSession } from '../auth-session';

@Component({
  selector: 'app-reset-password-dialog',
  standalone: true,
  imports: [
    TranslatePipe,
    NgIf,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  template: `
    <h2 mat-dialog-title>{{ 'RESET_PASSWORD.TITLE' | t }}</h2>
    <div mat-dialog-content class="reset-dialog-content">
      <p class="reset-dialog-subtitle">{{ 'RESET_PASSWORD.SUBTITLE' | t }}</p>

      <div class="reset-loading" *ngIf="loading">
        <mat-progress-spinner mode="indeterminate" diameter="28"></mat-progress-spinner>
      </div>

      <form class="reset-form" *ngIf="!loading">
        <mat-form-field appearance="outline">
          <mat-label>{{ 'RESET_PASSWORD.EMAIL' | t }}</mat-label>
          <input matInput type="email" name="email" [(ngModel)]="email" [readonly]="step !== 'request'" />
        </mat-form-field>

        <ng-container *ngIf="step === 'verify'">
          <mat-form-field appearance="outline">
            <mat-label>{{ 'RESET_PASSWORD.OTP' | t }}</mat-label>
            <input matInput name="otp" [(ngModel)]="otp" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>{{ 'RESET_PASSWORD.NEW_PASSWORD' | t }}</mat-label>
            <input matInput type="password" name="newPassword" [(ngModel)]="newPassword" />
          </mat-form-field>
          <button
            mat-button
            type="button"
            (click)="resendOtp()"
            [disabled]="countdown > 0 || loading"
          >
            {{
              countdown > 0
                ? (languageService.language === 'ar'
                  ? ('إعادة الإرسال خلال ' + countdown + ' ث')
                  : ('Resend in ' + countdown + 's'))
                : ('RESET_PASSWORD.RESEND_OTP' | t)
            }}
          </button>
        </ng-container>
      </form>
    </div>
    <div mat-dialog-actions align="end">
      <button mat-button type="button" (click)="close()">{{ 'COMMON.CANCEL' | t }}</button>
      <button
        mat-raised-button
        color="primary"
        type="button"
        *ngIf="step === 'request'"
        (click)="requestOtp()"
      >
        {{ 'RESET_PASSWORD.SEND_OTP' | t }}
      </button>
      <button
        mat-raised-button
        color="primary"
        type="button"
        *ngIf="step === 'verify'"
        (click)="resetPassword()"
      >
        {{ 'RESET_PASSWORD.RESET_ACTION' | t }}
      </button>
    </div>
  `,
  styles: [`
    .reset-dialog-content { min-width: 340px; }
    .reset-dialog-subtitle { margin-top: 0; color: #64748b; font-size: 13px; }
    .reset-form { display: grid; gap: 12px; }
    .reset-loading { display: flex; justify-content: center; padding: 10px 0; }
  `]
})
class ResetPasswordDialogComponent implements OnDestroy {
  email = '';
  otp = '';
  newPassword = '';
  step: 'request' | 'verify' = 'request';
  countdown = 0;
  loading = false;
  private countdownTimer: ReturnType<typeof setInterval> | null = null;

  private readonly http = inject(HttpClient);
  private readonly snackBar = inject(MatSnackBar);
  readonly languageService = inject(LanguageService);
  private readonly dialogRef = inject(MatDialogRef<ResetPasswordDialogComponent>);

  ngOnDestroy(): void {
    this.clearCountdownTimer();
  }

  close(): void {
    this.clearCountdownTimer();
    this.dialogRef.close();
  }

  requestOtp(): void {
    if (!this.email.trim()) {
      this.snackBar.open(this.languageService.translate('RESET_PASSWORD.EMAIL_REQUIRED'), undefined, { duration: 2500 });
      return;
    }
    this.loading = true;
    this.http
      .post<{ success: boolean; message?: string; expires_in?: number }>(`${API_BASE}/request-password-reset.php`, {
        email: this.email.trim()
      })
      .subscribe({
        next: (response) => {
          this.loading = false;
          this.step = 'verify';
          this.startCountdown(response.expires_in ?? 300);
          this.snackBar.open(
            response.message || this.languageService.translate('RESET_PASSWORD.OTP_SENT'),
            undefined,
            { duration: 3000 }
          );
        },
        error: (error) => {
          this.loading = false;
          const message =
            (error?.error?.error as string | undefined) ||
            this.languageService.translate('COMMON.ERROR');
          this.snackBar.open(message, undefined, { duration: 3000 });
        }
      });
  }

  resendOtp(): void {
    if (this.countdown > 0 || this.loading) {
      return;
    }
    this.requestOtp();
  }

  resetPassword(): void {
    if (!this.otp.trim() || !this.newPassword.trim()) {
      this.snackBar.open(this.languageService.translate('RESET_PASSWORD.FIELDS_REQUIRED'), undefined, { duration: 2500 });
      return;
    }
    this.loading = true;
    this.http
      .post<{ success: boolean; message?: string }>(`${API_BASE}/reset-password.php`, {
        email: this.email.trim(),
        otp: this.otp.trim(),
        password: this.newPassword
      })
      .subscribe({
        next: (response) => {
          this.loading = false;
          this.snackBar.open(
            response.message || this.languageService.translate('RESET_PASSWORD.SUCCESS'),
            undefined,
            { duration: 3200 }
          );
          this.close();
        },
        error: (error) => {
          this.loading = false;
          const message =
            (error?.error?.error as string | undefined) ||
            this.languageService.translate('COMMON.ERROR');
          this.snackBar.open(message, undefined, { duration: 3000 });
        }
      });
  }

  private startCountdown(seconds: number): void {
    this.clearCountdownTimer();
    this.countdown = Math.max(0, seconds);
    this.countdownTimer = setInterval(() => {
      this.countdown = Math.max(0, this.countdown - 1);
      if (this.countdown === 0) {
        this.clearCountdownTimer();
      }
    }, 1000);
  }

  private clearCountdownTimer(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }
}

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [
    TranslatePipe,
    FormsModule,
    NgIf,
    MatCardModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatSnackBarModule,
    RouterLink
  ],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss'
})
export class LoginPageComponent {
  email = '';
  password = '';
  rememberMe = true;

  private readonly http = inject(HttpClient);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);
  readonly languageService = inject(LanguageService);

  submit(): void {
    this.http
      .post<{ token: string; user: AuthUser }>(`${API_BASE}/login.php`, {
        email: this.email,
        password: this.password
      })
      .subscribe({
        next: (response) => {
          setAuthSession(response.token, response.user, this.rememberMe);
          this.router.navigateByUrl('/admin');
        },
        error: (error) => {
          const message =
            (error?.error?.error as string | undefined) ||
            this.languageService.translate('AUTH_MESSAGES.INVALID_CREDENTIALS');
          this.snackBar.open(message, undefined, { duration: 3000 });
        }
      });
  }

  toggleLanguage(): void {
    this.languageService.toggle();
  }

  openResetPasswordDialog(): void {
    this.dialog.open(ResetPasswordDialogComponent, {
      width: '460px',
      maxWidth: '95vw'
    });
  }
}
