import { AsyncPipe, NgIf } from '@angular/common';
import { AfterViewInit, Component, OnDestroy, ViewChild } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { MatButtonModule } from '@angular/material/button';
import { MatSidenav, MatSidenavContainer, MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { Observable, Subject, filter, map, shareReplay, takeUntil, withLatestFrom } from 'rxjs';

import { TranslatePipe, LanguageService } from '../../i18n/language.service';
import { SidebarComponent } from '../sidebar/sidebar.component';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    SidebarComponent,
    TranslatePipe,
    MatSidenavModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    AsyncPipe,
    NgIf
  ],
  templateUrl: './dashboard-layout.component.html',
  styleUrl: './dashboard-layout.component.scss'
})
export class DashboardLayoutComponent implements AfterViewInit, OnDestroy {
  @ViewChild('drawer') drawer?: MatSidenav;
  @ViewChild('sidenavContainer') sidenavContainer?: MatSidenavContainer;
  readonly isHandset$: Observable<boolean>;
  private readonly destroy$ = new Subject<void>();

  constructor(
    public languageService: LanguageService,
    private breakpointObserver: BreakpointObserver,
    private router: Router
  ) {
    this.isHandset$ = this.breakpointObserver
      .observe(Breakpoints.Handset)
      .pipe(
        map((result) => result.matches),
        shareReplay({ bufferSize: 1, refCount: true })
      );
  }

  toggleLanguage(): void {
    this.languageService.toggle();
    this.recalculateLayout();
  }

  ngAfterViewInit(): void {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        withLatestFrom(this.isHandset$),
        takeUntil(this.destroy$)
      )
      .subscribe(([, isHandset]) => {
        if (isHandset) {
          this.drawer?.close();
        }
      });

    this.languageService.language$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.recalculateLayout());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private recalculateLayout(): void {
    requestAnimationFrame(() => {
      this.sidenavContainer?.updateContentMargins();
      requestAnimationFrame(() => {
        this.sidenavContainer?.updateContentMargins();
      });
    });
  }
}
