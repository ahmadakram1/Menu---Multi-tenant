import { Routes } from '@angular/router';
import { LoginPageComponent } from './login-page/login-page.component';
import { RegisterPageComponent } from './register-page/register-page.component';
import { VerifyOtpPageComponent } from './verify-otp-page/verify-otp-page.component';

export const authRoutes: Routes = [
  { path: 'login', component: LoginPageComponent },
  { path: 'register', component: RegisterPageComponent },
  { path: 'verify-otp', component: VerifyOtpPageComponent }
];
