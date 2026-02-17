import { NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { LanguageService, TranslatePipe } from '../../../core/i18n/language.service';
import { API_BASE } from '../../../core/api';

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [
    TranslatePipe,
    NgIf,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatSnackBarModule,
    RouterLink
  ],
  templateUrl: './register-page.component.html',
  styleUrl: './register-page.component.scss'
})
export class RegisterPageComponent {
  businessName = '';
  email = '';
  phone = '';
  password = '';
  isSubmitting = false;

  private readonly http = inject(HttpClient);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);
  readonly languageService = inject(LanguageService);

  submit(): void {
    if (this.isSubmitting) {
      return;
    }
    this.isSubmitting = true;
    this.http
      .post<{ success: boolean; message?: string }>(`${API_BASE}/register.php`, {
        restaurant_name: this.businessName.trim(),
        email: this.email,
        phone: this.phone,
        password: this.password
      })
      .subscribe({
        next: (response) => {
          const baseMessage =
            response.message || this.languageService.translate('AUTH_MESSAGES.REGISTER_SUCCESS');
          this.snackBar.open(baseMessage, undefined, { duration: 7000 });
          this.router.navigateByUrl('/login');
          this.isSubmitting = false;
        },
        error: (error) => {
          const message =
            (error?.error?.error as string | undefined) ||
            this.languageService.translate('AUTH_MESSAGES.REGISTRATION_FAILED');
          this.snackBar.open(message, undefined, { duration: 3000 });
          this.isSubmitting = false;
        }
      });
  }

  toggleLanguage(): void {
    this.languageService.toggle();
  }
}
