import { NgIf } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { TranslatePipe } from '../../i18n/language.service';
import { clearAuthSession, getAuthUser } from '../../../features/auth/auth-session';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    TranslatePipe,
    MatButtonModule,
    MatListModule,
    MatIconModule,
    NgIf,
    RouterLink,
    RouterLinkActive
  ],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {
  @Output() navigate = new EventEmitter<void>();
  readonly isAdmin = getAuthUser()?.role === 'admin';

  constructor(private router: Router) {}

  onNavigate(): void {
    this.navigate.emit();
  }

  logout(): void {
    clearAuthSession();
    this.navigate.emit();
    this.router.navigateByUrl('/login');
  }
}
