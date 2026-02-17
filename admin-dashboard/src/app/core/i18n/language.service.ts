import { ChangeDetectorRef, Injectable, OnDestroy, Pipe, PipeTransform } from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';

import { AppDirection, AppLanguage } from './i18n.types';
import { DirectionService } from './direction.service';
import en from '../../i18n/en.json';
import ar from '../../i18n/ar.json';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly storageKey = 'admin_language';
  private readonly translations: Record<AppLanguage, Record<string, unknown>> = {
    en,
    ar
  };
  private current$ = new BehaviorSubject<AppLanguage>(this.loadLanguage());
  readonly language$ = this.current$.asObservable();

  get language(): AppLanguage {
    return this.current$.value;
  }

  constructor(private directionService: DirectionService) {}

  init(): void {
    this.applyLanguage(this.language);
  }

  setLanguage(language: AppLanguage): void {
    if (this.language === language) {
      return;
    }
    this.current$.next(language);
    this.persistLanguage(language);
    this.applyLanguage(language);
  }

  toggle(): void {
    this.setLanguage(this.language === 'ar' ? 'en' : 'ar');
  }

  translate(key: string): string {
    const dictionary = this.translations[this.language];
    const value = this.resolvePath(dictionary, key);
    return typeof value === 'string' ? value : key;
  }

  private loadLanguage(): AppLanguage {
    try {
      const stored = localStorage.getItem(this.storageKey) as AppLanguage | null;
      return stored === 'ar' || stored === 'en' ? stored : 'en';
    } catch {
      return 'en';
    }
  }

  private persistLanguage(language: AppLanguage): void {
    try {
      localStorage.setItem(this.storageKey, language);
    } catch {
      // Ignore storage errors.
    }
  }

  private applyLanguage(language: AppLanguage): void {
    const direction: AppDirection = language === 'ar' ? 'rtl' : 'ltr';
    this.directionService.setDirection(direction);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
  }

  private resolvePath(source: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce<unknown>((acc, segment) => {
      if (acc && typeof acc === 'object' && segment in (acc as Record<string, unknown>)) {
        return (acc as Record<string, unknown>)[segment];
      }
      return undefined;
    }, source);
  }
}

@Pipe({ name: 't', standalone: true, pure: false })
export class TranslatePipe implements PipeTransform, OnDestroy {
  private sub: Subscription;

  constructor(private languageService: LanguageService, private cdr: ChangeDetectorRef) {
    this.sub = this.languageService.language$.subscribe(() => this.cdr.markForCheck());
  }

  transform(key: string): string {
    return this.languageService.translate(key);
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }
}
