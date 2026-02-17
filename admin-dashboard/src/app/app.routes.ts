import { NgClass, NgFor, NgIf } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CanActivateFn, Routes, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { timeout } from 'rxjs';

import { DashboardLayoutComponent } from './core/layout/dashboard-layout/dashboard-layout.component';
import { LanguageService, TranslatePipe } from './core/i18n/language.service';
import { API_BASE } from './core/api';
import { getAuthUser, getStoredToken } from './features/auth/auth-session';
import { authRoutes } from './features/auth/auth.routes';

const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const token = getStoredToken();
  if (token) {
    return true;
  }
  return router.parseUrl('/login');
};

const adminGuard: CanActivateFn = () => {
  const router = inject(Router);
  const token = getStoredToken();
  const user = getAuthUser();
  if (token && user?.role === 'admin') {
    return true;
  }
  return router.parseUrl('/admin/settings');
};

const ownerGuard: CanActivateFn = () => {
  const router = inject(Router);
  const token = getStoredToken();
  const user = getAuthUser();
  if (token && user?.role === 'owner') {
    return true;
  }
  return router.parseUrl('/admin/approvals');
};

const dashboardDefaultGuard: CanActivateFn = () => {
  const router = inject(Router);
  const user = getAuthUser();
  if (user?.role === 'admin') {
    return router.parseUrl('/admin/approvals');
  }
  return router.parseUrl('/admin/settings');
};

const storage = {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) {
        return fallback;
      }
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },
  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore storage errors for mock flow.
    }
  }
};

function authHeaders(): HttpHeaders {
  const token = getStoredToken();
  return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
}

function imageUrl(filename?: string | null): string {
  return filename ? `${API_BASE}/uploads/${filename}` : '';
}

interface RestaurantSettings {
  id?: number;
  name_ar: string;
  name_en: string;
  menu_slug?: string;
  menu_enabled?: number;
  access_start_at?: string | null;
  access_end_at?: string | null;
  logo: string;
  phone: string;
  whatsapp: string;
  instagram: string;
  theme_bg?: string | null;
  theme_card?: string | null;
  theme_text?: string | null;
  theme_muted?: string | null;
  theme_accent?: string | null;
  theme_accent2?: string | null;
  theme_border?: string | null;
  font_family?: string | null;
  logo_preview?: string;
  logo_file?: File | null;
}

type ThemePresetKey = 'classic' | 'coffee' | 'modern';

interface Category {
  id: number;
  name_ar: string;
  name_en: string;
  description_ar: string;
  description_en: string;
  image: string;
  image_preview?: string;
  image_file?: File | null;
}

interface Item {
  id: number;
  category_id: number | null;
  name_ar: string;
  name_en: string;
  description_ar: string;
  description_en: string;
  price: number | null;
  image: string;
  image_preview?: string;
  image_file?: File | null;
}


@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [MatCardModule, TranslatePipe],
  template: `
    <div class="dashboard-grid">
      <mat-card class="dashboard-card">{{ 'DASHBOARD.HOME' | t }}</mat-card>
      <mat-card class="dashboard-card">{{ 'DASHBOARD.SETTINGS' | t }}</mat-card>
      <mat-card class="dashboard-card">{{ 'DASHBOARD.CATEGORIES' | t }}</mat-card>
      <mat-card class="dashboard-card">{{ 'DASHBOARD.ITEMS' | t }}</mat-card>
    </div>
  `
})
class DashboardHomeComponent {}


@Component({
  selector: 'app-restaurant-settings',
  standalone: true,
  imports: [
    TranslatePipe,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    FormsModule,
    NgIf
  ],
  template: `
    <mat-card class="page-card">
      <mat-card-title>{{ 'SETTINGS.TITLE' | t }}</mat-card-title>
      <mat-card-content>
        <div class="loading-center" *ngIf="loading">
          <mat-progress-spinner mode="indeterminate"></mat-progress-spinner>
        </div>
        <form class="form-grid" (ngSubmit)="save()" *ngIf="!loading">
          <div class="form-actions">
            <a mat-stroked-button color="primary" [href]="menuLink" target="_blank" rel="noopener">
              Open public menu
            </a>
          </div>
          <mat-form-field appearance="outline">
            <mat-label>{{ 'SETTINGS.NAME_AR' | t }}</mat-label>
            <input matInput name="name_ar" [(ngModel)]="model.name_ar" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>{{ 'SETTINGS.NAME_EN' | t }}</mat-label>
            <input matInput name="name_en" [(ngModel)]="model.name_en" />
          </mat-form-field>

          <div>
            <label>{{ 'SETTINGS.LOGO' | t }}</label>
            <input type="file" accept="image/*" (change)="onLogoSelected($event)" />
          </div>

          <div class="image-preview" *ngIf="model.logo_preview">
            <img [src]="model.logo_preview" alt="Logo preview" />
          </div>

          <mat-form-field appearance="outline">
            <mat-label>{{ 'SETTINGS.PHONE' | t }}</mat-label>
            <input matInput name="phone" [(ngModel)]="model.phone" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>{{ 'SETTINGS.WHATSAPP' | t }}</mat-label>
            <input matInput name="whatsapp" [(ngModel)]="model.whatsapp" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>{{ 'SETTINGS.INSTAGRAM' | t }}</mat-label>
            <input matInput name="instagram" [(ngModel)]="model.instagram" />
          </mat-form-field>

          <div class="theme-presets">
            <div class="theme-presets-title">{{ 'SETTINGS.THEME_PRESETS' | t }}</div>
            <div class="theme-presets-actions">
              <button
                mat-stroked-button
                type="button"
                [class.active-filter]="currentPreset === 'classic'"
                (click)="applyThemePreset('classic')"
              >
                {{ 'SETTINGS.PRESET_CLASSIC' | t }}
              </button>
              <button
                mat-stroked-button
                type="button"
                [class.active-filter]="currentPreset === 'coffee'"
                (click)="applyThemePreset('coffee')"
              >
                {{ 'SETTINGS.PRESET_COFFEE' | t }}
              </button>
              <button
                mat-stroked-button
                type="button"
                [class.active-filter]="currentPreset === 'modern'"
                (click)="applyThemePreset('modern')"
              >
                {{ 'SETTINGS.PRESET_MODERN' | t }}
              </button>
            </div>
            <div class="theme-preview-title">{{ 'SETTINGS.THEME_PREVIEW' | t }}</div>
            <div
              class="theme-preview-card"
              [style.background]="model.theme_bg || '#f5f6f8'"
              [style.border-color]="model.theme_border || '#e5e7eb'"
            >
              <div
                class="theme-preview-inner"
                [style.background]="model.theme_card || '#ffffff'"
                [style.border-color]="model.theme_border || '#e5e7eb'"
              >
                <div class="theme-preview-head">
                  <div class="theme-preview-dot" [style.background]="model.theme_accent || '#0f766e'"></div>
                  <div class="theme-preview-title-text" [style.color]="model.theme_text || '#1f2937'">
                    Menu Preview
                  </div>
                </div>
                <div class="theme-preview-line" [style.background]="model.theme_muted || '#6b7280'"></div>
                <button
                  type="button"
                  class="theme-preview-button"
                  [style.background]="model.theme_accent || '#0f766e'"
                >
                  Accent
                </button>
              </div>
            </div>
          </div>

          <div class="form-actions">
            <button mat-raised-button color="primary" type="submit">
              {{ 'COMMON.SAVE' | t }}
            </button>
          </div>
        </form>
      </mat-card-content>
    </mat-card>
  `
})
class RestaurantSettingsComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly snackBar = inject(MatSnackBar);
  private readonly language = inject(LanguageService);
  loading = false;
  fonts = [
    { value: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif", label: 'System' },
    { value: "'Segoe UI', Arial, sans-serif", label: 'Segoe UI' },
    { value: "Roboto, Arial, sans-serif", label: 'Roboto' },
    { value: "Arial, sans-serif", label: 'Arial' }
  ];
  model: RestaurantSettings = {
    name_ar: '',
    name_en: '',
    logo: '',
    phone: '',
    whatsapp: '',
    instagram: '',
    theme_bg: '#f5f6f8',
    theme_card: '#ffffff',
    theme_text: '#1f2937',
    theme_muted: '#6b7280',
    theme_accent: '#0f766e',
    theme_accent2: '#14b8a6',
    theme_border: '#e5e7eb',
    font_family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    logo_preview: '',
    logo_file: null
  };
  private readonly themePresets: Record<
    ThemePresetKey,
    {
      theme_bg: string;
      theme_card: string;
      theme_text: string;
      theme_muted: string;
      theme_accent: string;
      theme_accent2: string;
      theme_border: string;
    }
  > = {
    classic: {
      theme_bg: '#f5f6f8',
      theme_card: '#ffffff',
      theme_text: '#1f2937',
      theme_muted: '#6b7280',
      theme_accent: '#0f766e',
      theme_accent2: '#14b8a6',
      theme_border: '#e5e7eb'
    },
    coffee: {
      theme_bg: '#f7f3ed',
      theme_card: '#fffdf9',
      theme_text: '#3a2b20',
      theme_muted: '#7d6b5d',
      theme_accent: '#8b5e3c',
      theme_accent2: '#b07c4f',
      theme_border: '#e6d8c8'
    },
    modern: {
      theme_bg: '#eef2ff',
      theme_card: '#ffffff',
      theme_text: '#111827',
      theme_muted: '#64748b',
      theme_accent: '#2563eb',
      theme_accent2: '#06b6d4',
      theme_border: '#dbeafe'
    }
  };

  ngOnInit(): void {
    this.fetch();
  }

  get menuLink(): string {
    const slug = (this.model.menu_slug || '').trim();
    return slug ? `http://localhost/Menu/${slug}` : 'http://localhost/StoreMenu/public-menu/index.html';
  }

  get currentPreset(): ThemePresetKey | null {
    const entries = Object.entries(this.themePresets) as Array<
      [ThemePresetKey, (typeof this.themePresets)[ThemePresetKey]]
    >;
    for (const [key, preset] of entries) {
      if (
        this.model.theme_bg === preset.theme_bg &&
        this.model.theme_card === preset.theme_card &&
        this.model.theme_text === preset.theme_text &&
        this.model.theme_muted === preset.theme_muted &&
        this.model.theme_accent === preset.theme_accent &&
        this.model.theme_accent2 === preset.theme_accent2 &&
        this.model.theme_border === preset.theme_border
      ) {
        return key;
      }
    }
    return null;
  }

  private fetch(): void {
    this.loading = true;
    this.http
      .get<RestaurantSettings[]>(`${API_BASE}/admin/restaurants.php`, { headers: authHeaders() })
      .subscribe({
        next: (data) => {
          const first = data[0];
          if (first) {
            this.model = {
              ...first,
              logo_preview: imageUrl(first.logo),
              logo_file: null
            };
            storage.set('settings', {
              name_ar: first.name_ar,
              name_en: first.name_en,
              logo_data_url: imageUrl(first.logo),
              phone: first.phone,
              whatsapp: first.whatsapp,
              instagram: first.instagram,
              theme_bg: first.theme_bg,
              theme_card: first.theme_card,
              theme_text: first.theme_text,
              theme_muted: first.theme_muted,
              theme_accent: first.theme_accent,
              theme_accent2: first.theme_accent2,
              theme_border: first.theme_border,
              font_family: first.font_family
            });
          }
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.snackBar.open(this.language.translate('COMMON.ERROR'), undefined, { duration: 2000 });
        }
      });
  }

  save(): void {
    const hasFile = !!this.model.logo_file;
    this.loading = true;

    if (this.model.id && !hasFile) {
      this.http
        .put(
          `${API_BASE}/admin/restaurants.php`,
          {
            id: this.model.id,
            name_ar: this.model.name_ar,
            name_en: this.model.name_en,
            phone: this.model.phone,
            whatsapp: this.model.whatsapp,
            instagram: this.model.instagram,
            theme_bg: this.model.theme_bg,
            theme_card: this.model.theme_card,
            theme_text: this.model.theme_text,
            theme_muted: this.model.theme_muted,
            theme_accent: this.model.theme_accent,
            theme_accent2: this.model.theme_accent2,
            theme_border: this.model.theme_border,
            font_family: this.model.font_family
          },
          { headers: authHeaders() }
        )
        .pipe(timeout(12000))
        .subscribe({
          next: () => {
            this.afterSave('COMMON.SAVED');
          },
          error: (error) => this.onError(error)
        });
      return;
    }

    const form = new FormData();
    if (this.model.id) {
      form.append('id', String(this.model.id));
      form.append('_method', 'PUT');
    }
    form.append('name_ar', this.model.name_ar);
    form.append('name_en', this.model.name_en);
    form.append('phone', this.model.phone);
    form.append('whatsapp', this.model.whatsapp);
    form.append('instagram', this.model.instagram);
    form.append('theme_bg', this.model.theme_bg || '');
    form.append('theme_card', this.model.theme_card || '');
    form.append('theme_text', this.model.theme_text || '');
    form.append('theme_muted', this.model.theme_muted || '');
    form.append('theme_accent', this.model.theme_accent || '');
    form.append('theme_accent2', this.model.theme_accent2 || '');
    form.append('theme_border', this.model.theme_border || '');
    form.append('font_family', this.model.font_family || '');
    if (this.model.logo_file) {
      form.append('logo', this.model.logo_file);
    }

    this.http
      .post(`${API_BASE}/admin/restaurants.php`, form, { headers: authHeaders() })
      .pipe(timeout(12000))
      .subscribe({
        next: () => {
          this.afterSave('COMMON.SAVED');
          this.fetch();
        },
        error: (error) => this.onError(error)
      });
  }

  private afterSave(messageKey: string): void {
    storage.set('settings', {
      name_ar: this.model.name_ar,
      name_en: this.model.name_en,
      logo_data_url: this.model.logo_preview || imageUrl(this.model.logo),
      phone: this.model.phone,
      whatsapp: this.model.whatsapp,
      instagram: this.model.instagram,
      theme_bg: this.model.theme_bg,
      theme_card: this.model.theme_card,
      theme_text: this.model.theme_text,
      theme_muted: this.model.theme_muted,
      theme_accent: this.model.theme_accent,
      theme_accent2: this.model.theme_accent2,
      theme_border: this.model.theme_border,
      font_family: this.model.font_family
    });
    this.loading = false;
    this.snackBar.open(this.language.translate(messageKey), undefined, { duration: 2000 });
  }

  private onError(error?: unknown): void {
    this.loading = false;
    const fallback = this.language.translate('COMMON.ERROR');
    const message =
      typeof error === 'object' && error && 'error' in error && typeof error.error === 'object'
        ? (error.error as { error?: string }).error || fallback
        : fallback;
    this.snackBar.open(message, undefined, { duration: 2500 });
  }

  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    this.model.logo_file = file;
    const reader = new FileReader();
    reader.onload = () => {
      this.model.logo_preview = String(reader.result ?? '');
    };
    reader.readAsDataURL(file);
  }

  applyThemePreset(preset: ThemePresetKey): void {
    this.model = {
      ...this.model,
      ...this.themePresets[preset]
    };
  }
}

interface CategoryDialogData {
  mode: 'create' | 'edit';
  category: Category;
}

interface ConfirmDialogData {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
}

@Component({
  selector: 'app-confirm-action-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <div mat-dialog-content>{{ data.message }}</div>
    <div mat-dialog-actions align="end">
      <button mat-button type="button" (click)="close(false)">{{ data.cancelLabel }}</button>
      <button mat-raised-button color="primary" type="button" (click)="close(true)">
        {{ data.confirmLabel }}
      </button>
    </div>
  `
})
class ConfirmActionDialogComponent {
  readonly data = inject(MAT_DIALOG_DATA) as ConfirmDialogData;
  private readonly dialogRef = inject(MatDialogRef<ConfirmActionDialogComponent>);

  close(confirmed: boolean): void {
    this.dialogRef.close(confirmed);
  }
}

@Component({
  selector: 'app-category-dialog',
  standalone: true,
  imports: [
    TranslatePipe,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    NgIf
  ],
  template: `
    <h2 mat-dialog-title>
      {{ data.mode === 'create' ? ('CATEGORIES.CREATE' | t) : ('CATEGORIES.EDIT' | t) }}
    </h2>
    <div mat-dialog-content>
      <form class="form-grid">
        <mat-form-field appearance="outline">
          <mat-label>{{ 'CATEGORIES.NAME_AR' | t }}</mat-label>
          <input matInput name="name_ar" [(ngModel)]="category.name_ar" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>{{ 'CATEGORIES.NAME_EN' | t }}</mat-label>
          <input matInput name="name_en" [(ngModel)]="category.name_en" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>{{ 'CATEGORIES.DESC_AR' | t }}</mat-label>
          <input matInput name="desc_ar" [(ngModel)]="category.description_ar" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>{{ 'CATEGORIES.DESC_EN' | t }}</mat-label>
          <input matInput name="desc_en" [(ngModel)]="category.description_en" />
        </mat-form-field>
        <div>
          <label>{{ 'CATEGORIES.IMAGE' | t }}</label>
          <input type="file" accept="image/*" (change)="onImageSelected($event)" />
        </div>
        <div class="image-preview" *ngIf="category.image_preview">
          <img [src]="category.image_preview" alt="Category preview" />
        </div>
      </form>
    </div>
    <div mat-dialog-actions align="end">
      <button mat-button type="button" (click)="cancel()">{{ 'COMMON.CANCEL' | t }}</button>
      <button mat-raised-button color="primary" type="button" (click)="save()">
        {{ 'COMMON.SAVE' | t }}
      </button>
    </div>
  `
})
class CategoryDialogComponent {
  readonly data = inject(MAT_DIALOG_DATA) as CategoryDialogData;
  private readonly dialogRef = inject(MatDialogRef<CategoryDialogComponent>);
  category: Category = { ...this.data.category };

  save(): void {
    this.dialogRef.close(this.category);
  }

  cancel(): void {
    this.dialogRef.close();
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    this.category.image_file = file;
    const reader = new FileReader();
    reader.onload = () => {
      this.category.image_preview = String(reader.result ?? '');
    };
    reader.readAsDataURL(file);
  }
}

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [
    TranslatePipe,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    NgFor,
    NgIf
  ],
  template: `
    <div class="page-toolbar">
      <h2>{{ 'CATEGORIES.TITLE' | t }}</h2>
      <button mat-raised-button color="primary" type="button" (click)="openCreate()">
        <mat-icon>add</mat-icon>
        {{ 'COMMON.ADD' | t }}
      </button>
    </div>

    <div class="loading-center" *ngIf="loading">
      <mat-progress-spinner mode="indeterminate"></mat-progress-spinner>
    </div>

    <div class="card-grid" *ngIf="!loading">
      <mat-card class="card-item" *ngFor="let category of categories">
        <div class="card-item-header">
          <div>
            <div class="card-item-title">{{ category.name_ar }} / {{ category.name_en }}</div>
            <div class="card-item-subtitle">{{ 'CATEGORIES.TITLE' | t }}</div>
          </div>
          <img
            *ngIf="category.image_preview"
            class="card-item-thumb"
            [src]="category.image_preview"
            alt=""
          />
        </div>
        <mat-card-content class="card-item-body">
          <p>{{ category.description_ar }}</p>
          <p>{{ category.description_en }}</p>
        </mat-card-content>
        <mat-card-actions class="card-item-actions">
          <button mat-button type="button" (click)="openEdit(category)">
            {{ 'COMMON.EDIT' | t }}
          </button>
          <button mat-button color="warn" type="button" (click)="remove(category)">
            {{ 'COMMON.DELETE' | t }}
          </button>
        </mat-card-actions>
      </mat-card>
    </div>
  `
})
class CategoriesComponent implements OnInit {
  private readonly dialog = inject(MatDialog);
  private readonly http = inject(HttpClient);
  private readonly snackBar = inject(MatSnackBar);
  private readonly language = inject(LanguageService);
  loading = false;
  categories: Category[] = [];

  ngOnInit(): void {
    this.fetch();
  }

  private fetch(): void {
    this.loading = true;
    this.http
      .get<Category[]>(`${API_BASE}/admin/categories.php`, { headers: authHeaders() })
      .subscribe({
        next: (data) => {
          this.categories = data.map((item) => ({
            ...item,
            image_preview: imageUrl(item.image),
            image_file: null
          }));
          storage.set('categories', this.categories.map((item) => ({
            id: item.id,
            name_ar: item.name_ar,
            name_en: item.name_en,
            description_ar: item.description_ar,
            description_en: item.description_en,
            image_data_url: item.image_preview || ''
          })));
          this.loading = false;
        },
        error: () => this.onError()
      });
  }

  openCreate(): void {
    const dialogRef = this.dialog.open(CategoryDialogComponent, {
      data: { mode: 'create', category: this.emptyCategory() }
    });

    dialogRef.afterClosed().subscribe((result: Category | undefined) => {
      if (!result) {
        return;
      }
      this.saveCategory(result, 'create');
    });
  }

  openEdit(category: Category): void {
    const dialogRef = this.dialog.open(CategoryDialogComponent, {
      data: { mode: 'edit', category }
    });

    dialogRef.afterClosed().subscribe((result: Category | undefined) => {
      if (!result) {
        return;
      }
      this.saveCategory({ ...result, id: category.id }, 'edit');
    });
  }

  remove(category: Category): void {
    const snack = this.snackBar.open(
      this.language.translate('COMMON.CONFIRM_DELETE'),
      this.language.translate('COMMON.DELETE_ACTION'),
      { duration: 6000 }
    );
    snack.onAction().subscribe(() => {
      this.loading = true;
      this.http
        .request('delete', `${API_BASE}/admin/categories.php`, {
          body: { id: category.id },
          headers: authHeaders()
        })
        .subscribe({
          next: () => {
            this.fetch();
            this.snackBar.open(this.language.translate('COMMON.DELETED'), undefined, {
              duration: 2000
            });
          },
          error: () => this.onError()
        });
    });
  }

  private saveCategory(category: Category, mode: 'create' | 'edit'): void {
    const hasFile = !!category.image_file;
    this.loading = true;

    if (mode === 'edit' && !hasFile) {
      this.http
        .put(
          `${API_BASE}/admin/categories.php`,
          {
            id: category.id,
            name_ar: category.name_ar,
            name_en: category.name_en,
            description_ar: category.description_ar,
            description_en: category.description_en
          },
          { headers: authHeaders() }
        )
        .subscribe({
          next: () => {
            this.fetch();
            this.snackBar.open(this.language.translate('COMMON.SAVED'), undefined, { duration: 2000 });
          },
          error: () => this.onError()
        });
      return;
    }

    const form = new FormData();
    if (mode === 'edit') {
      form.append('id', String(category.id));
      form.append('_method', 'PUT');
    }
    form.append('name_ar', category.name_ar);
    form.append('name_en', category.name_en);
    form.append('description_ar', category.description_ar);
    form.append('description_en', category.description_en);
    if (category.image_file) {
      form.append('image', category.image_file);
    }

    this.http
      .post(`${API_BASE}/admin/categories.php`, form, { headers: authHeaders() })
      .subscribe({
        next: () => {
          this.fetch();
          this.snackBar.open(this.language.translate('COMMON.SAVED'), undefined, { duration: 2000 });
        },
        error: () => this.onError()
      });
  }

  private onError(): void {
    this.loading = false;
    this.snackBar.open(this.language.translate('COMMON.ERROR'), undefined, { duration: 2000 });
  }

  private emptyCategory(): Category {
    return {
      id: 0,
      name_ar: '',
      name_en: '',
      description_ar: '',
      description_en: '',
      image: '',
      image_preview: '',
      image_file: null
    };
  }
}

interface ItemDialogData {
  mode: 'create' | 'edit';
  item: Item;
  categories: Category[];
}

@Component({
  selector: 'app-item-dialog',
  standalone: true,
  imports: [
    TranslatePipe,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    NgFor,
    NgIf
  ],
  template: `
    <h2 mat-dialog-title>
      {{ data.mode === 'create' ? ('ITEMS.CREATE' | t) : ('ITEMS.EDIT' | t) }}
    </h2>
    <div mat-dialog-content>
      <form class="form-grid">
        <mat-form-field appearance="outline">
          <mat-label>{{ 'ITEMS.NAME_AR' | t }}</mat-label>
          <input matInput name="name_ar" [(ngModel)]="item.name_ar" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>{{ 'ITEMS.NAME_EN' | t }}</mat-label>
          <input matInput name="name_en" [(ngModel)]="item.name_en" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>{{ 'ITEMS.PRICE' | t }}</mat-label>
          <input matInput type="number" name="price" [(ngModel)]="item.price" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>{{ 'ITEMS.CATEGORY' | t }}</mat-label>
          <mat-select name="category" [(ngModel)]="item.category_id">
            <mat-option *ngFor="let category of data.categories" [value]="category.id">
              {{ category.name_ar }} / {{ category.name_en }}
            </mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>{{ 'ITEMS.DESC_AR' | t }}</mat-label>
          <input matInput name="desc_ar" [(ngModel)]="item.description_ar" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>{{ 'ITEMS.DESC_EN' | t }}</mat-label>
          <input matInput name="desc_en" [(ngModel)]="item.description_en" />
        </mat-form-field>
        <div>
          <label>{{ 'ITEMS.IMAGE' | t }}</label>
          <input type="file" accept="image/*" (change)="onImageSelected($event)" />
        </div>
        <div class="image-preview" *ngIf="item.image_preview">
          <img [src]="item.image_preview" alt="Item preview" />
        </div>
      </form>
    </div>
    <div mat-dialog-actions align="end">
      <button mat-button type="button" (click)="cancel()">{{ 'COMMON.CANCEL' | t }}</button>
      <button mat-raised-button color="primary" type="button" (click)="save()">
        {{ 'COMMON.SAVE' | t }}
      </button>
    </div>
  `
})
class ItemDialogComponent {
  readonly data = inject(MAT_DIALOG_DATA) as ItemDialogData;
  private readonly dialogRef = inject(MatDialogRef<ItemDialogComponent>);
  item: Item = { ...this.data.item };

  save(): void {
    this.dialogRef.close(this.item);
  }

  cancel(): void {
    this.dialogRef.close();
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    this.item.image_file = file;
    const reader = new FileReader();
    reader.onload = () => {
      this.item.image_preview = String(reader.result ?? '');
    };
    reader.readAsDataURL(file);
  }
}

@Component({
  selector: 'app-items',
  standalone: true,
  imports: [
    TranslatePipe,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    NgFor,
    NgIf
  ],
  template: `
    <div class="page-toolbar">
      <h2>{{ 'ITEMS.TITLE' | t }}</h2>
      <button mat-raised-button color="primary" type="button" (click)="openCreate()">
        <mat-icon>add</mat-icon>
        {{ 'COMMON.ADD' | t }}
      </button>
    </div>

    <div class="page-toolbar" *ngIf="!loading">
      <div>
        <button mat-stroked-button type="button" (click)="setCategoryFilter(null)">
          {{ 'ITEMS.ALL_CATEGORIES' | t }}
        </button>
        <button
          mat-stroked-button
          type="button"
          *ngFor="let category of categories"
          (click)="setCategoryFilter(category.id)"
        >
          {{ category.name_ar }} / {{ category.name_en }}
        </button>
      </div>
      <div>
        <button mat-button type="button" (click)="prevPage()" [disabled]="page === 1">Prev</button>
        <span>{{ page }} / {{ totalPages }}</span>
        <button mat-button type="button" (click)="nextPage()" [disabled]="page >= totalPages">
          Next
        </button>
      </div>
    </div>

    <div class="loading-center" *ngIf="loading">
      <mat-progress-spinner mode="indeterminate"></mat-progress-spinner>
    </div>

    <div class="card-grid" *ngIf="!loading">
      <mat-card class="card-item" *ngFor="let item of pagedItems">
        <div class="card-item-header">
          <div>
            <div class="card-item-title">{{ item.name_ar }} / {{ item.name_en }}</div>
            <div class="card-item-subtitle">{{ categoryLabel(item.category_id) }}</div>
          </div>
          <img *ngIf="item.image_preview" class="card-item-thumb" [src]="item.image_preview" alt="" />
        </div>
        <mat-card-content class="card-item-body">
          <p>{{ item.description_ar }}</p>
          <p>{{ item.description_en }}</p>
          <div class="card-item-meta">
            <span>{{ 'ITEMS.PRICE' | t }}: {{ item.price ?? '-' }}</span>
            <span>{{ 'ITEMS.CATEGORY' | t }}: {{ categoryLabel(item.category_id) }}</span>
          </div>
        </mat-card-content>
        <mat-card-actions class="card-item-actions">
          <button mat-button type="button" (click)="openEdit(item)">
            {{ 'COMMON.EDIT' | t }}
          </button>
          <button mat-button color="warn" type="button" (click)="remove(item)">
            {{ 'COMMON.DELETE' | t }}
          </button>
        </mat-card-actions>
      </mat-card>
    </div>
  `
})
class ItemsComponent implements OnInit {
  private readonly dialog = inject(MatDialog);
  private readonly http = inject(HttpClient);
  private readonly snackBar = inject(MatSnackBar);
  private readonly language = inject(LanguageService);
  loading = false;
  items: Item[] = [];
  categories: Category[] = [];
  selectedCategoryId: number | null = null;
  page = 1;
  readonly pageSize = 8;

  ngOnInit(): void {
    this.fetchCategories();
    this.fetchItems();
  }

  private fetchCategories(): void {
    this.http
      .get<Category[]>(`${API_BASE}/admin/categories.php`, { headers: authHeaders() })
      .subscribe({
        next: (data) => {
          this.categories = data.map((item) => ({
            ...item,
            image_preview: imageUrl(item.image),
            image_file: null
          }));
        },
        error: () => {
          this.snackBar.open(this.language.translate('COMMON.ERROR'), undefined, { duration: 2000 });
        }
      });
  }

  private fetchItems(): void {
    this.loading = true;
    this.http
      .get<Item[]>(`${API_BASE}/admin/items.php`, { headers: authHeaders() })
      .subscribe({
        next: (data) => {
          this.items = data.map((item) => ({
            ...item,
            image_preview: imageUrl(item.image),
            image_file: null
          }));
          this.page = 1;
          storage.set('items', this.items.map((item) => ({
            id: item.id,
            category_id: item.category_id,
            name_ar: item.name_ar,
            name_en: item.name_en,
            description_ar: item.description_ar,
            description_en: item.description_en,
            price: item.price,
            image_data_url: item.image_preview || ''
          })));
          this.loading = false;
        },
        error: () => this.onError()
      });
  }

  openCreate(): void {
    const dialogRef = this.dialog.open(ItemDialogComponent, {
      data: { mode: 'create', item: this.emptyItem(), categories: this.categories }
    });

    dialogRef.afterClosed().subscribe((result: Item | undefined) => {
      if (!result) {
        return;
      }
      this.saveItem(result, 'create');
    });
  }

  setCategoryFilter(categoryId: number | null): void {
    this.selectedCategoryId = categoryId;
    this.page = 1;
  }

  get filteredItems(): Item[] {
    if (!this.selectedCategoryId) {
      return this.items;
    }
    return this.items.filter((item) => item.category_id === this.selectedCategoryId);
  }

  get totalPages(): number {
    const total = Math.ceil(this.filteredItems.length / this.pageSize);
    return total > 0 ? total : 1;
  }

  get pagedItems(): Item[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filteredItems.slice(start, start + this.pageSize);
  }

  nextPage(): void {
    if (this.page < this.totalPages) {
      this.page += 1;
    }
  }

  prevPage(): void {
    if (this.page > 1) {
      this.page -= 1;
    }
  }

  openEdit(item: Item): void {
    const dialogRef = this.dialog.open(ItemDialogComponent, {
      data: { mode: 'edit', item, categories: this.categories }
    });

    dialogRef.afterClosed().subscribe((result: Item | undefined) => {
      if (!result) {
        return;
      }
      this.saveItem({ ...result, id: item.id }, 'edit');
    });
  }

  remove(item: Item): void {
    const snack = this.snackBar.open(
      this.language.translate('COMMON.CONFIRM_DELETE'),
      this.language.translate('COMMON.DELETE_ACTION'),
      { duration: 6000 }
    );
    snack.onAction().subscribe(() => {
      this.loading = true;
      this.http
        .request('delete', `${API_BASE}/admin/items.php`, {
          body: { id: item.id },
          headers: authHeaders()
        })
        .subscribe({
          next: () => {
            this.fetchItems();
            this.snackBar.open(this.language.translate('COMMON.DELETED'), undefined, {
              duration: 2000
            });
          },
          error: () => this.onError()
        });
    });
  }

  categoryLabel(categoryId: number | null): string {
    if (!categoryId) {
      return '-';
    }
    const category = this.categories.find((item) => item.id === categoryId);
    return category ? `${category.name_ar} / ${category.name_en}` : '-';
  }

  private saveItem(item: Item, mode: 'create' | 'edit'): void {
    const hasFile = !!item.image_file;
    this.loading = true;

    if (mode === 'edit' && !hasFile) {
      this.http
        .put(
          `${API_BASE}/admin/items.php`,
          {
            id: item.id,
            name_ar: item.name_ar,
            name_en: item.name_en,
            price: item.price,
            description_ar: item.description_ar,
            description_en: item.description_en,
            category_id: item.category_id
          },
          { headers: authHeaders() }
        )
        .subscribe({
          next: () => {
            this.fetchItems();
            this.snackBar.open(this.language.translate('COMMON.SAVED'), undefined, { duration: 2000 });
          },
          error: () => this.onError()
        });
      return;
    }

    const form = new FormData();
    if (mode === 'edit') {
      form.append('id', String(item.id));
      form.append('_method', 'PUT');
    }
    form.append('name_ar', item.name_ar);
    form.append('name_en', item.name_en);
    form.append('price', item.price ? String(item.price) : '0');
    form.append('description_ar', item.description_ar);
    form.append('description_en', item.description_en);
    form.append('category_id', item.category_id ? String(item.category_id) : '');
    if (item.image_file) {
      form.append('image', item.image_file);
    }

    this.http
      .post(`${API_BASE}/admin/items.php`, form, { headers: authHeaders() })
      .subscribe({
        next: () => {
          this.fetchItems();
          this.snackBar.open(this.language.translate('COMMON.SAVED'), undefined, { duration: 2000 });
        },
        error: () => this.onError()
      });
  }

  private onError(): void {
    this.loading = false;
    this.snackBar.open(this.language.translate('COMMON.ERROR'), undefined, { duration: 2000 });
  }

  private emptyItem(): Item {
    return {
      id: 0,
      category_id: null,
      name_ar: '',
      name_en: '',
      description_ar: '',
      description_en: '',
      price: null,
      image: '',
      image_preview: '',
      image_file: null
    };
  }
}

interface RegistrationRequest {
  id: number;
  restaurant_id: number;
  email: string;
  phone: string;
  status: string;
  email_verified_at: string | null;
  created_at: string;
  name_ar: string;
  name_en: string;
  menu_slug: string;
  menu_enabled: number;
  access_start_at: string | null;
  access_end_at: string | null;
  access_start_input?: string;
  access_end_input?: string;
  menu_enabled_bool?: boolean;
  edit_email?: string;
  edit_password?: string;
  email_template?: 'bilingual' | 'ar' | 'en';
}

@Component({
  selector: 'app-registrations-approvals',
  standalone: true,
  imports: [
    TranslatePipe,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    NgClass,
    NgFor,
    NgIf
  ],
  template: `
    <div class="admin-page-shell">
      <div class="page-toolbar">
        <div>
          <h2>{{ 'APPROVALS.TITLE' | t }}</h2>
          <p class="page-subtitle">{{ 'APPROVALS.SUBTITLE' | t }}</p>
        </div>
      </div>

      <div class="approval-stats" *ngIf="!loading">
        <mat-card class="approval-stat-card">
          <div class="approval-stat-label">{{ 'APPROVALS.REGISTERED_COUNT' | t }}</div>
          <div class="approval-stat-value">{{ totalCount }}</div>
        </mat-card>
        <mat-card class="approval-stat-card">
          <div class="approval-stat-label">{{ 'APPROVALS.APPROVED_COUNT' | t }}</div>
          <div class="approval-stat-value">{{ approvedCount }}</div>
        </mat-card>
        <mat-card class="approval-stat-card">
          <div class="approval-stat-label">{{ 'APPROVALS.PENDING' | t }}</div>
          <div class="approval-stat-value">{{ pendingCount }}</div>
        </mat-card>
        <mat-card class="approval-stat-card">
          <div class="approval-stat-label">{{ 'APPROVALS.REJECTED' | t }}</div>
          <div class="approval-stat-value">{{ rejectedCount }}</div>
        </mat-card>
      </div>

      <div class="approval-filters" *ngIf="!loading">
        <button mat-stroked-button type="button" [class.active-filter]="statusFilter === 'all'" (click)="setFilter('all')">
          {{ 'APPROVALS.ALL' | t }}
        </button>
        <button mat-stroked-button type="button" [class.active-filter]="statusFilter === 'pending_approval'" (click)="setFilter('pending_approval')">
          {{ 'APPROVALS.PENDING' | t }}
        </button>
        <button mat-stroked-button type="button" [class.active-filter]="statusFilter === 'approved'" (click)="setFilter('approved')">
          {{ 'APPROVALS.APPROVED' | t }}
        </button>
        <button mat-stroked-button type="button" [class.active-filter]="statusFilter === 'rejected'" (click)="setFilter('rejected')">
          {{ 'APPROVALS.REJECTED' | t }}
        </button>
      </div>

      <div class="loading-center" *ngIf="loading">
        <mat-progress-spinner mode="indeterminate"></mat-progress-spinner>
      </div>

      <div class="approvals-grid" *ngIf="!loading">
        <mat-card class="approval-card" *ngFor="let row of filteredRequests">
          <mat-card-content class="approval-body">
            <div class="approval-header">
              <div>
                <div class="approval-title">{{ row.name_ar }} / {{ row.name_en }}</div>
                <div class="approval-subtitle">{{ row.email }} - {{ row.phone }}</div>
              </div>
              <div class="approval-status" [ngClass]="statusClass(row.status)">
                {{ statusText(row.status) }}
              </div>
            </div>

            <div class="approval-link-row">
              <span>{{ 'APPROVALS.MENU_LINK' | t }}:</span>
              <a [href]="'http://localhost/Menu/' + row.menu_slug" target="_blank" rel="noopener">
                http://localhost/Menu/{{ row.menu_slug }}
              </a>
            </div>

            <mat-form-field appearance="outline">
              <mat-label>{{ 'APPROVALS.EMAIL_TEMPLATE' | t }}</mat-label>
              <mat-select [(ngModel)]="row.email_template" [ngModelOptions]="{ standalone: true }">
                <mat-option value="bilingual">{{ 'APPROVALS.EMAIL_TEMPLATE_BILINGUAL' | t }}</mat-option>
                <mat-option value="ar">{{ 'APPROVALS.EMAIL_TEMPLATE_AR' | t }}</mat-option>
                <mat-option value="en">{{ 'APPROVALS.EMAIL_TEMPLATE_EN' | t }}</mat-option>
              </mat-select>
            </mat-form-field>
          </mat-card-content>

          <mat-card-actions class="approval-actions">
            <button mat-raised-button color="primary" type="button" (click)="updateStatus(row, 'approved')">
              {{ 'APPROVALS.APPROVE' | t }}
            </button>
            <button mat-stroked-button color="warn" type="button" (click)="updateStatus(row, 'rejected')">
              {{ 'APPROVALS.REJECT' | t }}
            </button>
          </mat-card-actions>
        </mat-card>
      </div>
    </div>
  `
})
class RegistrationsApprovalsComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly snackBar = inject(MatSnackBar);
  private readonly language = inject(LanguageService);
  loading = false;
  requests: RegistrationRequest[] = [];
  statusFilter: 'all' | 'pending_approval' | 'approved' | 'rejected' = 'all';

  ngOnInit(): void {
    this.fetch();
  }

  private fetch(): void {
    this.loading = true;
    this.http
      .get<RegistrationRequest[]>(`${API_BASE}/admin/registrations.php`, { headers: authHeaders() })
      .subscribe({
        next: (data) => {
          this.requests = data.map((row) => ({
            ...row,
            email_template: 'bilingual'
          }));
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.snackBar.open(this.language.translate('COMMON.ERROR'), undefined, { duration: 2500 });
        }
      });
  }

  updateStatus(row: RegistrationRequest, status: 'approved' | 'rejected'): void {
    const payload: Record<string, unknown> = {
      account_id: row.id,
      status,
      email_template: row.email_template || 'bilingual'
    };

    this.http
      .post(
        `${API_BASE}/admin/registrations.php`,
        payload,
        { headers: authHeaders() }
      )
      .subscribe({
        next: (response) => {
          const emailSent = (response as { email_sent?: boolean | null })?.email_sent;
          const message = emailSent === false
            ? this.language.translate('APPROVALS.SAVED_WITH_EMAIL_WARNING')
            : this.language.translate('APPROVALS.SAVED_WITH_EMAIL');
          this.snackBar.open(message, undefined, { duration: 2600 });
          this.fetch();
        },
        error: () => {
          this.snackBar.open(this.language.translate('COMMON.ERROR'), undefined, { duration: 2500 });
        }
      });
  }

  setFilter(filter: 'all' | 'pending_approval' | 'approved' | 'rejected'): void {
    this.statusFilter = filter;
  }

  get filteredRequests(): RegistrationRequest[] {
    if (this.statusFilter === 'all') {
      return this.requests;
    }
    return this.requests.filter((row) => row.status === this.statusFilter);
  }

  get totalCount(): number {
    return this.requests.length;
  }

  get approvedCount(): number {
    return this.requests.filter((row) => row.status === 'approved').length;
  }

  get pendingCount(): number {
    return this.requests.filter((row) => row.status === 'pending_approval').length;
  }

  get rejectedCount(): number {
    return this.requests.filter((row) => row.status === 'rejected').length;
  }

  get approvalRate(): number {
    return this.totalCount ? (this.approvedCount / this.totalCount) * 100 : 0;
  }

  get pendingRate(): number {
    return this.totalCount ? (this.pendingCount / this.totalCount) * 100 : 0;
  }

  statusText(status: string): string {
    if (status === 'approved') {
      return this.language.translate('APPROVALS.APPROVED');
    }
    if (status === 'rejected') {
      return this.language.translate('APPROVALS.REJECTED');
    }
    return this.language.translate('APPROVALS.PENDING');
  }

  statusClass(status: string): string {
    if (status === 'approved') {
      return 'approval-status-approved';
    }
    if (status === 'rejected') {
      return 'approval-status-rejected';
    }
    return 'approval-status-pending';
  }
}

@Component({
  selector: 'app-admin-menu-access',
  standalone: true,
  imports: [
    TranslatePipe,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    NgClass,
    NgFor,
    NgIf
  ],
  template: `
    <div class="admin-page-shell">
      <div class="page-toolbar">
        <div>
          <h2>{{ 'MENU_ACCESS.TITLE' | t }}</h2>
          <p class="page-subtitle">{{ 'MENU_ACCESS.SUBTITLE' | t }}</p>
        </div>
      </div>

      <div class="loading-center" *ngIf="loading">
        <mat-progress-spinner mode="indeterminate"></mat-progress-spinner>
      </div>

      <div class="approvals-grid" *ngIf="!loading">
        <mat-card class="approval-card" *ngFor="let row of requests">
          <mat-card-content class="approval-body">
            <div class="approval-header">
              <div>
                <div class="approval-title">{{ row.name_ar }} / {{ row.name_en }}</div>
                <div class="approval-subtitle">{{ row.email }}</div>
              </div>
              <div class="approval-status" [ngClass]="statusClass(row.status)">
                {{ statusText(row.status) }}
              </div>
            </div>

            <div class="approval-link-row">
              <span>{{ 'APPROVALS.MENU_LINK' | t }}:</span>
              <a [href]="'http://localhost/Menu/' + row.menu_slug" target="_blank" rel="noopener">
                http://localhost/Menu/{{ row.menu_slug }}
              </a>
            </div>

            <div class="approval-access-grid">
              <label>
                <span>{{ 'APPROVALS.START_DATE' | t }}</span>
                <input
                  class="approval-input"
                  type="month"
                  [value]="row.access_start_input || ''"
                  (input)="row.access_start_input = textValue($event)"
                />
              </label>

              <label>
                <span>{{ 'APPROVALS.END_DATE' | t }}</span>
                <input
                  class="approval-input"
                  type="month"
                  [value]="row.access_end_input || ''"
                  (input)="row.access_end_input = textValue($event)"
                />
              </label>
            </div>

            <mat-form-field appearance="outline">
              <mat-label>{{ 'APPROVALS.EMAIL_TEMPLATE' | t }}</mat-label>
              <mat-select [(ngModel)]="row.email_template" [ngModelOptions]="{ standalone: true }">
                <mat-option value="bilingual">{{ 'APPROVALS.EMAIL_TEMPLATE_BILINGUAL' | t }}</mat-option>
                <mat-option value="ar">{{ 'APPROVALS.EMAIL_TEMPLATE_AR' | t }}</mat-option>
                <mat-option value="en">{{ 'APPROVALS.EMAIL_TEMPLATE_EN' | t }}</mat-option>
              </mat-select>
            </mat-form-field>
          </mat-card-content>

          <mat-card-actions class="approval-actions">
            <button
              mat-raised-button
              color="primary"
              type="button"
              [class.active-filter]="row.menu_enabled_bool"
              (click)="toggleMenuEnabled(row)"
            >
              {{
                row.menu_enabled_bool
                  ? ('APPROVALS.MENU_DISABLE' | t)
                  : ('APPROVALS.MENU_ENABLE' | t)
              }}
            </button>
          </mat-card-actions>
        </mat-card>
      </div>
    </div>
  `
})
class AdminMenuAccessComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly language = inject(LanguageService);
  loading = false;
  requests: RegistrationRequest[] = [];

  ngOnInit(): void {
    this.fetch();
  }

  private fetch(): void {
    this.loading = true;
    this.http
      .get<RegistrationRequest[]>(`${API_BASE}/admin/registrations.php`, { headers: authHeaders() })
      .subscribe({
        next: (data) => {
          this.requests = data.map((row) => ({
            ...row,
            menu_enabled_bool: Number(row.menu_enabled) === 1,
            access_start_input: this.toInputMonth(row.access_start_at),
            access_end_input: this.toInputMonth(row.access_end_at),
            email_template: 'bilingual'
          }));
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.snackBar.open(this.language.translate('COMMON.ERROR'), undefined, { duration: 2500 });
        }
      });
  }

  toggleMenuEnabled(row: RegistrationRequest): void {
    const nextEnabled = !row.menu_enabled_bool;
    const dialogRef = this.dialog.open(ConfirmActionDialogComponent, {
      data: {
        title: this.language.translate('MENU_ACCESS.CONFIRM_TITLE'),
        message: nextEnabled
          ? this.language.translate('MENU_ACCESS.CONFIRM_ENABLE')
          : this.language.translate('MENU_ACCESS.CONFIRM_DISABLE'),
        confirmLabel: this.language.translate('MENU_ACCESS.CONFIRM_ACTION'),
        cancelLabel: this.language.translate('COMMON.CANCEL')
      } as ConfirmDialogData
    });
    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) {
        return;
      }
      this.http
        .post(
          `${API_BASE}/admin/registrations.php`,
          {
            account_id: row.id,
            menu_enabled: nextEnabled,
            email_template: row.email_template || 'bilingual',
            notify_menu_email: true,
            access_start_at: this.fromInputMonthStart(row.access_start_input),
            access_end_at: this.fromInputMonthEnd(row.access_end_input)
          },
          { headers: authHeaders() }
        )
        .subscribe({
          next: () => {
            row.menu_enabled_bool = nextEnabled;
            this.snackBar.open(this.language.translate('APPROVALS.SAVED_WITH_EMAIL'), undefined, { duration: 2400 });
          },
          error: () => {
            this.snackBar.open(this.language.translate('COMMON.ERROR'), undefined, { duration: 2500 });
          }
        });
    });
  }

  statusText(status: string): string {
    if (status === 'approved') {
      return this.language.translate('APPROVALS.APPROVED');
    }
    if (status === 'rejected') {
      return this.language.translate('APPROVALS.REJECTED');
    }
    return this.language.translate('APPROVALS.PENDING');
  }

  statusClass(status: string): string {
    if (status === 'approved') {
      return 'approval-status-approved';
    }
    if (status === 'rejected') {
      return 'approval-status-rejected';
    }
    return 'approval-status-pending';
  }

  private toInputMonth(value: string | null | undefined): string {
    if (!value) {
      return '';
    }
    const date = new Date(value.replace(' ', 'T'));
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    const pad = (v: number) => String(v).padStart(2, '0');
    const y = date.getFullYear();
    const m = pad(date.getMonth() + 1);
    return `${y}-${m}`;
  }

  private fromInputMonthStart(value: string | null | undefined): string | null {
    if (!value || value.trim() === '') {
      return null;
    }
    const [yearRaw, monthRaw] = value.split('-');
    const year = Number(yearRaw);
    const month = Number(monthRaw);
    if (!year || !month) {
      return null;
    }
    return `${year}-${String(month).padStart(2, '0')}-01 00:00:00`;
  }

  private fromInputMonthEnd(value: string | null | undefined): string | null {
    if (!value || value.trim() === '') {
      return null;
    }
    const [yearRaw, monthRaw] = value.split('-');
    const year = Number(yearRaw);
    const month = Number(monthRaw);
    if (!year || !month) {
      return null;
    }
    const lastDay = new Date(year, month, 0).getDate();
    return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')} 23:59:59`;
  }

  textValue(event: Event): string {
    const target = event.target as HTMLInputElement | null;
    return target?.value || '';
  }
}

@Component({
  selector: 'app-admin-access-control',
  standalone: true,
  imports: [TranslatePipe, FormsModule, MatCardModule, MatButtonModule, MatSnackBarModule, MatProgressSpinnerModule, NgClass, NgFor, NgIf],
  template: `
    <div class="admin-page-shell">
      <div class="page-toolbar">
        <div>
          <h2>{{ 'ACCESS.TITLE' | t }}</h2>
          <p class="page-subtitle">{{ 'ACCESS.SUBTITLE' | t }}</p>
        </div>
      </div>

      <div class="loading-center" *ngIf="loading">
        <mat-progress-spinner mode="indeterminate"></mat-progress-spinner>
      </div>

      <div class="approvals-grid" *ngIf="!loading">
        <mat-card class="approval-card" *ngFor="let row of requests">
          <mat-card-content class="approval-body">
            <div class="approval-header">
              <div>
                <div class="approval-title">{{ row.name_ar }} / {{ row.name_en }}</div>
                <div class="approval-subtitle">{{ row.email }}</div>
              </div>
              <div class="approval-status" [ngClass]="statusClass(row.status)">
                {{ statusText(row.status) }}
              </div>
            </div>

            <div class="approval-credentials-grid">
              <label>
                <span>{{ 'APPROVALS.CLIENT_EMAIL' | t }}</span>
                <input
                  class="approval-input"
                  type="email"
                  [value]="row.edit_email || ''"
                  (input)="row.edit_email = textValue($event)"
                />
              </label>
              <label>
                <span>{{ 'APPROVALS.CLIENT_PASSWORD' | t }}</span>
                <input
                  class="approval-input"
                  type="password"
                  [value]="row.edit_password || ''"
                  (input)="row.edit_password = textValue($event)"
                />
              </label>
              <div class="approval-credentials-action">
                <button mat-stroked-button type="button" (click)="updateClientCredentials(row)">
                  {{ 'APPROVALS.SAVE_CREDENTIALS' | t }}
                </button>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `
})
class AdminAccessControlComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly snackBar = inject(MatSnackBar);
  private readonly language = inject(LanguageService);
  loading = false;
  requests: RegistrationRequest[] = [];

  ngOnInit(): void {
    this.fetch();
  }

  private fetch(): void {
    this.loading = true;
    this.http
      .get<RegistrationRequest[]>(`${API_BASE}/admin/registrations.php`, { headers: authHeaders() })
      .subscribe({
        next: (data) => {
          this.requests = data.map((row) => ({
            ...row,
            edit_email: row.email,
            edit_password: ''
          }));
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.snackBar.open(this.language.translate('COMMON.ERROR'), undefined, { duration: 2500 });
        }
      });
  }

  statusText(status: string): string {
    if (status === 'approved') {
      return this.language.translate('APPROVALS.APPROVED');
    }
    if (status === 'rejected') {
      return this.language.translate('APPROVALS.REJECTED');
    }
    return this.language.translate('APPROVALS.PENDING');
  }

  statusClass(status: string): string {
    if (status === 'approved') {
      return 'approval-status-approved';
    }
    if (status === 'rejected') {
      return 'approval-status-rejected';
    }
    return 'approval-status-pending';
  }

  textValue(event: Event): string {
    const target = event.target as HTMLInputElement | null;
    return target?.value || '';
  }

  updateClientCredentials(row: RegistrationRequest): void {
    this.http
      .post(
        `${API_BASE}/admin/credentials.php`,
        {
          target: 'merchant',
          account_id: row.id,
          email: (row.edit_email || '').trim(),
          password: (row.edit_password || '').trim()
        },
        { headers: authHeaders() }
      )
      .subscribe({
        next: () => {
          row.email = (row.edit_email || row.email).trim();
          row.edit_password = '';
          this.snackBar.open(this.language.translate('COMMON.SAVED'), undefined, { duration: 2000 });
        },
        error: (error) => {
          const message =
            (error?.error?.error as string | undefined) || this.language.translate('COMMON.ERROR');
          this.snackBar.open(message, undefined, { duration: 2500 });
        }
      });
  }
}

@Component({
  selector: 'app-admin-security',
  standalone: true,
  imports: [TranslatePipe, FormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatSnackBarModule, NgIf],
  template: `
    <mat-card class="page-card">
      <mat-card-title>{{ 'SECURITY.TITLE' | t }}</mat-card-title>
      <mat-card-content>
        <form class="form-grid" (ngSubmit)="save()">
          <mat-form-field appearance="outline">
            <mat-label>{{ 'SECURITY.ADMIN_EMAIL' | t }}</mat-label>
            <input matInput name="email" [(ngModel)]="email" type="email" required />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>{{ 'SECURITY.NEW_PASSWORD' | t }}</mat-label>
            <input matInput name="password" [(ngModel)]="password" type="password" />
          </mat-form-field>
          <div class="form-actions">
            <button mat-raised-button color="primary" type="submit">{{ 'SECURITY.SAVE' | t }}</button>
          </div>
        </form>
      </mat-card-content>
    </mat-card>
  `
})
class AdminSecurityComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly snackBar = inject(MatSnackBar);
  private readonly language = inject(LanguageService);
  email = '';
  password = '';

  ngOnInit(): void {
    this.http
      .get<{ admin: { email: string } }>(`${API_BASE}/admin/credentials.php`, { headers: authHeaders() })
      .subscribe({
        next: (data) => {
          this.email = data.admin?.email || '';
        },
        error: () => {
          this.snackBar.open(this.language.translate('COMMON.ERROR'), undefined, { duration: 2500 });
        }
      });
  }

  save(): void {
    this.http
      .post(
        `${API_BASE}/admin/credentials.php`,
        {
          target: 'admin',
          email: this.email.trim(),
          password: this.password.trim()
        },
        { headers: authHeaders() }
      )
      .subscribe({
        next: () => {
          this.password = '';
          this.snackBar.open(this.language.translate('COMMON.SAVED'), undefined, { duration: 2000 });
        },
        error: (error) => {
          const message =
            (error?.error?.error as string | undefined) || this.language.translate('COMMON.ERROR');
          this.snackBar.open(message, undefined, { duration: 2500 });
        }
      });
  }
}

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  ...authRoutes,
  {
    path: 'admin',
    component: DashboardLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', canActivate: [dashboardDefaultGuard], component: DashboardHomeComponent },
      { path: 'settings', component: RestaurantSettingsComponent, canActivate: [ownerGuard] },
      { path: 'categories', component: CategoriesComponent, canActivate: [ownerGuard] },
      { path: 'items', component: ItemsComponent, canActivate: [ownerGuard] },
      { path: 'security', component: AdminSecurityComponent, canActivate: [adminGuard] },
      { path: 'approvals', component: RegistrationsApprovalsComponent, canActivate: [adminGuard] },
      { path: 'access', component: AdminAccessControlComponent, canActivate: [adminGuard] },
      { path: 'menu-access', component: AdminMenuAccessComponent, canActivate: [adminGuard] }
    ]
  },
  { path: '**', redirectTo: 'login' }
];
