import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { LanguageService, TranslatePipe } from '../../../core/i18n/language.service';
import { API_BASE } from '../../../core/api';
import { AuthUser, setAuthSession } from '../auth-session';

@Component({
  selector: 'app-verify-otp-page',
  standalone: true,
  imports: [
    TranslatePipe,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSnackBarModule,
    RouterLink
  ],
  templateUrl: './verify-otp-page.component.html',
  styleUrl: '../login-page/login-page.component.scss'
})
export class VerifyOtpPageComponent implements OnInit {
  email = '';
  otp = '';

  private readonly http = inject(HttpClient);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly languageService = inject(LanguageService);

  ngOnInit(): void {
    this.email = this.route.snapshot.queryParamMap.get('email') || '';
  }

  submit(): void {
    this.http
      .post<{ success: boolean; message: string; token: string; user: AuthUser }>(`${API_BASE}/verify-otp.php`, {
        email: this.email,
        otp: this.otp
      })
      .subscribe({
        next: (response) => {
          setAuthSession(response.token, response.user, true);
          this.snackBar.open(
            this.languageService.translate('AUTH_MESSAGES.OTP_VERIFIED'),
            undefined,
            { duration: 4000 }
          );
          this.router.navigateByUrl('/admin');
        },
        error: (error) => {
          const message =
            (error?.error?.error as string | undefined) ||
            this.languageService.translate('AUTH_MESSAGES.OTP_FAILED');
          this.snackBar.open(message, undefined, { duration: 3000 });
        }
      });
  }

  toggleLanguage(): void {
    this.languageService.toggle();
  }
}
