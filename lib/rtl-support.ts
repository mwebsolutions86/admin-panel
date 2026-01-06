/**
 * SUPPORT RTL AUTOMATIQUE - Universal Eats
 * Gestionnaire automatique du support Right-to-Left pour l'arabe
 * Détection, application des styles et adaptation des composants
 */

import { localizationService, SupportedLanguage } from './localization-service';

export interface RTLSettings {
  enabled: boolean;
  currentDirection: 'ltr' | 'rtl';
  forceDirection?: 'ltr' | 'rtl';
  animationsEnabled: boolean;
  mirrorIcons: boolean;
  mirrorNumbers: boolean;
  adaptPadding: boolean;
  swapMargins: boolean;
}

export interface RTLComponentMapping {
  [key: string]: {
    mirror?: boolean;
    swapPadding?: boolean;
    swapMargins?: boolean;
    transform?: string;
    cssClasses?: string[];
  };
}

export interface RTLBreakpointConfig {
  [key: string]: {
    padding?: { left?: string; right?: string };
    margin?: { left?: string; right?: string };
    textAlign?: string;
    float?: string;
  };
}

export class RTLSupport {
  private static instance: RTLSupport;
  private settings: RTLSettings = {
    enabled: true,
    currentDirection: 'ltr',
    animationsEnabled: true,
    mirrorIcons: true,
    mirrorNumbers: false,
    adaptPadding: true,
    swapMargins: true
  };

  private listeners: Set<() => void> = new Set();
  private componentMappings: RTLComponentMapping = {};
  private breakpointConfigs: RTLBreakpointConfig = {};

  private constructor() {
    this.initializeRTLSupport();
    this.setupEventListeners();
    this.defineComponentMappings();
    this.defineBreakpointConfigs();
  }

  public static getInstance(): RTLSupport {
    if (!RTLSupport.instance) {
      RTLSupport.instance = new RTLSupport();
    }
    return RTLSupport.instance;
  }

  /**
   * Initialise le support RTL
   */
  private async initializeRTLSupport(): Promise<void> {
    try {
      // Détecter la direction actuelle
      const currentLanguage = localizationService.getCurrentLanguage();
      const isRTL = this.isRTLLanguage(currentLanguage);
      
      this.setDirection(isRTL ? 'rtl' : 'ltr');
      
      // Appliquer les styles initiaux
      this.applyRTLStyles();
      
      console.log('🔄 Support RTL initialisé:', {
        language: currentLanguage,
        direction: this.settings.currentDirection,
        enabled: this.settings.enabled
      });
    } catch (error) {
      console.error('Erreur lors de l\'initialisation RTL:', error);
    }
  }

  /**
   * Configure les listeners d'événements
   */
  private setupEventListeners(): void {
    // Écouter les changements de langue
    localizationService.addListener(() => {
      this.handleLanguageChange();
    });

    // Écouter les changements de taille d'écran
    window.addEventListener('resize', this.handleResize.bind(this));
    
    // Observer les changements dans le DOM
    if (typeof MutationObserver !== 'undefined') {
      const observer = new MutationObserver((mutations) => {
        this.handleDOMChanges(mutations);
      });
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['dir', 'lang', 'class']
      });
    }
  }

  /**
   * Définit les mappings des composants pour RTL
   */
  private defineComponentMappings(): void {
    this.componentMappings = {
      // Navigation
      '.navbar': { mirror: true, swapMargins: true },
      '.sidebar': { mirror: true, swapMargins: true },
      '.breadcrumb': { mirror: true },
      
      // Layout
      '.container': { swapPadding: true },
      '.grid': { mirror: true },
      '.flex': { mirror: true },
      
      // Composants UI
      '.button': { mirror: true },
      '.dropdown': { mirror: true },
      '.modal': { mirror: true },
      '.tooltip': { mirror: true },
      
      // Texte et contenu
      '.text-left': { transform: 'text-right' },
      '.text-right': { transform: 'text-left' },
      '.float-left': { transform: 'float-right' },
      '.float-right': { transform: 'float-left' },
      
      // Bordures et séparateurs
      '.border-l': { transform: 'border-r' },
      '.border-r': { transform: 'border-l' },
      '.border-l-2': { transform: 'border-r-2' },
      '.border-r-2': { transform: 'border-l-2' },
      
      // Positions
      '.left-0': { transform: 'right-0' },
      '.right-0': { transform: 'left-0' },
      '.left-4': { transform: 'right-4' },
      '.right-4': { transform: 'left-4' },
      
      // Padding et Margin
      '.pl-4': { transform: 'pr-4' },
      '.pr-4': { transform: 'pl-4' },
      '.ml-4': { transform: 'mr-4' },
      '.mr-4': { transform: 'ml-4' },
      '.pl-8': { transform: 'pr-8' },
      '.pr-8': { transform: 'pl-8' },
      '.ml-8': { transform: 'mr-8' },
      '.mr-8': { transform: 'ml-8' },
      
      // Transformations
      '.transform.rotate-180': { transform: 'rotate-0' },
      '.translate-x-4': { transform: '-translate-x-4' },
      '.-translate-x-4': { transform: 'translate-x-4' }
    };
  }

  /**
   * Définit les configurations de breakpoint pour RTL
   */
  private defineBreakpointConfigs(): void {
    this.breakpointConfigs = {
      'sm': {
        padding: { left: '1rem', right: '1rem' },
        textAlign: 'right'
      },
      'md': {
        padding: { left: '1.5rem', right: '1.5rem' },
        textAlign: 'right'
      },
      'lg': {
        padding: { left: '2rem', right: '2rem' },
        textAlign: 'right'
      },
      'xl': {
        padding: { left: '2.5rem', right: '2.5rem' },
        textAlign: 'right'
      }
    };
  }

  /**
   * Gère le changement de langue
   */
  private handleLanguageChange(): void {
    const currentLanguage = localizationService.getCurrentLanguage();
    const isRTL = this.isRTLLanguage(currentLanguage);
    const newDirection = isRTL ? 'rtl' : 'ltr';
    
    if (newDirection !== this.settings.currentDirection) {
      this.setDirection(newDirection);
      this.applyRTLStyles();
      this.notifyListeners();
    }
  }

  /**
   * Gère le redimensionnement de la fenêtre
   */
  private handleResize(): void {
    if (this.settings.enabled && this.settings.currentDirection === 'rtl') {
      this.adaptLayoutForRTL();
    }
  }

  /**
   * Gère les changements dans le DOM
   */
  private handleDOMChanges(mutations: MutationRecord[]): void {
    if (this.settings.enabled && this.settings.currentDirection === 'rtl') {
      mutations.forEach(mutation => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          this.adaptNewElements(mutation.target as Element);
        }
      });
    }
  }

  /**
   * Définit la direction de lecture
   */
  public setDirection(direction: 'ltr' | 'rtl'): void {
    this.settings.currentDirection = direction;
    
    // Mettre à jour l'attribut dir sur l'élément HTML
    document.documentElement.dir = direction;
    document.documentElement.lang = localizationService.getCurrentLanguage();
    
    // Mettre à jour les classes CSS
    document.body.classList.remove('rtl', 'ltr');
    document.body.classList.add(direction);
    
    // Configurer la direction d'écriture pour les éléments de formulaire
    this.setupFormDirections();
    
    console.log(`📱 Direction changée vers: ${direction}`);
  }

  /**
   * Configure les directions pour les éléments de formulaire
   */
  private setupFormDirections(): void {
    const inputs = document.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      const el = input as HTMLElement;
      if (this.settings.currentDirection === 'rtl') {
        el.style.textAlign = 'right';
        if (input instanceof HTMLInputElement && input.type === 'number') {
          el.style.direction = 'ltr'; // Les nombres restent LTR
        } else {
          el.style.direction = 'rtl';
        }
      } else {
        el.style.textAlign = '';
        el.style.direction = '';
      }
    });
  }

  /**
   * Applique les styles RTL
   */
  public applyRTLStyles(): void {
    if (!this.settings.enabled) return;

    if (this.settings.currentDirection === 'rtl') {
      this.applyRTLClasses();
      this.mirrorIcons();
      this.adaptLayoutForRTL();
      this.injectRTLStyles();
    } else {
      this.removeRTLClasses();
      this.resetToLTR();
    }
  }

  /**
   * Applique les classes CSS RTL
   */
  private applyRTLClasses(): void {
    // Ajouter la classe RTL globale
    document.body.classList.add('rtl');
    document.body.classList.remove('ltr');
    
    // Appliquer les mappings de composants
    Object.entries(this.componentMappings).forEach(([selector, config]) => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        this.adaptElementForRTL(element as HTMLElement, config);
      });
    });
    
    // Créer et injecter les styles CSS RTL
    this.injectRTLStyles();
  }

  /**
   * Adapte un élément pour RTL
   */
  private adaptElementForRTL(element: HTMLElement, config: any): void {
    if (config.mirror) {
      element.classList.add('rtl-mirror');
    }
    
    if (config.swapPadding) {
      element.classList.add('rtl-swap-padding');
    }
    
    if (config.swapMargins) {
      element.classList.add('rtl-swap-margins');
    }
    
    if (config.cssClasses) {
      config.cssClasses.forEach((className: string) => {
        element.classList.add(className);
      });
    }
    
    // Appliquer les transformations
    if (config.transform) {
      element.style.transform = `scaleX(-1) ${element.style.transform}`;
    }
  }

  /**
   * Injecte les styles CSS RTL
   */
  private injectRTLStyles(): void {
    // Supprimer les anciens styles RTL
    const existingStyle = document.getElementById('rtl-styles');
    if (existingStyle) {
      existingStyle.remove();
    }
    
    // Créer les nouveaux styles
    const style = document.createElement('style');
    style.id = 'rtl-styles';
    style.textContent = this.generateRTLStyles();
    
    document.head.appendChild(style);
  }

  /**
   * Génère les styles CSS pour RTL
   */
  private generateRTLStyles(): string {
    return `
      /* Styles RTL globaux */
      .rtl {
        direction: rtl;
        text-align: right;
      }
      
      .rtl * {
        font-family: 'Segoe UI', 'Tahoma', 'Arial', sans-serif;
      }
      
      /* Miroir des éléments */
      .rtl-mirror {
        transform: scaleX(-1);
      }
      
      .rtl-mirror svg,
      .rtl-mirror img,
      .rtl-mirror .icon {
        transform: scaleX(-1);
      }
      
      /* Échange de padding */
      .rtl-swap-padding {
        padding-left: var(--rtl-padding-right, 1rem);
        padding-right: var(--rtl-padding-left, 1rem);
      }
      
      /* Échange de margin */
      .rtl-swap-margins {
        margin-left: var(--rtl-margin-right, 0);
        margin-right: var(--rtl-margin-left, 0);
      }
      
      /* Alignement du texte pour RTL */
      .rtl .text-left { text-align: right; }
      .rtl .text-right { text-align: left; }
      .rtl .text-center { text-align: center; }
      
      /* Flottants pour RTL */
      .rtl .float-left { float: right; }
      .rtl .float-right { float: left; }
      
      /* Bordures pour RTL */
      .rtl .border-l { border-right: 1px solid; border-left: none; }
      .rtl .border-r { border-left: 1px solid; border-right: none; }
      .rtl .border-l-2 { border-right-width: 2px; border-left-width: 0; }
      .rtl .border-r-2 { border-left-width: 2px; border-right-width: 0; }
      
      /* Positions pour RTL */
      .rtl .left-0 { right: 0; left: auto; }
      .rtl .right-0 { left: 0; right: auto; }
      .rtl .left-4 { right: 1rem; left: auto; }
      .rtl .right-4 { left: 1rem; right: auto; }
      .rtl .left-8 { right: 2rem; left: auto; }
      .rtl .right-8 { left: 2rem; right: auto; }
      
      /* Padding et Margin pour RTL */
      .rtl .pl-1 { padding-right: 0.25rem; padding-left: 0; }
      .rtl .pr-1 { padding-left: 0.25rem; padding-right: 0; }
      .rtl .pl-2 { padding-right: 0.5rem; padding-left: 0; }
      .rtl .pr-2 { padding-left: 0.5rem; padding-right: 0; }
      .rtl .pl-4 { padding-right: 1rem; padding-left: 0; }
      .rtl .pr-4 { padding-left: 1rem; padding-right: 0; }
      .rtl .pl-8 { padding-right: 2rem; padding-left: 0; }
      .rtl .pr-8 { padding-left: 2rem; padding-right: 0; }
      
      .rtl .ml-1 { margin-right: 0.25rem; margin-left: 0; }
      .rtl .mr-1 { margin-left: 0.25rem; margin-right: 0; }
      .rtl .ml-2 { margin-right: 0.5rem; margin-left: 0; }
      .rtl .mr-2 { margin-left: 0.5rem; margin-right: 0; }
      .rtl .ml-4 { margin-right: 1rem; margin-left: 0; }
      .rtl .mr-4 { margin-left: 1rem; margin-right: 0; }
      .rtl .ml-8 { margin-right: 2rem; margin-left: 0; }
      .rtl .mr-8 { margin-left: 2rem; margin-right: 0; }
      
      /* Flexbox pour RTL */
      .rtl .flex-row { flex-direction: row-reverse; }
      .rtl .justify-start { justify-content: flex-end; }
      .rtl .justify-end { justify-content: flex-start; }
      
      /* Grid pour RTL */
      .rtl .grid-cols-1 { direction: rtl; }
      .rtl .grid-cols-2 { direction: rtl; }
      .rtl .grid-cols-3 { direction: rtl; }
      
      /* Animations RTL */
      .rtl .slide-in-left { animation: slide-in-right 0.3s ease-out; }
      .rtl .slide-in-right { animation: slide-in-left 0.3s ease-out; }
      
      @keyframes slide-in-right {
        from { transform: translateX(-100%); }
        to { transform: translateX(0); }
      }
      
      @keyframes slide-in-left {
        from { transform: translateX(100%); }
        to { transform: translateX(0); }
      }
      
      /* Formulaires RTL */
      .rtl input,
      .rtl textarea,
      .rtl select {
        text-align: right;
        direction: rtl;
      }
      
      .rtl input[type="number"] {
        direction: ltr;
        text-align: left;
      }
      
      /* Boutons RTL */
      .rtl .btn-group .btn:first-child {
        border-top-left-radius: 0;
        border-bottom-left-radius: 0;
        border-top-right-radius: 0.375rem;
        border-bottom-right-radius: 0.375rem;
      }
      
      .rtl .btn-group .btn:last-child {
        border-top-right-radius: 0;
        border-bottom-right-radius: 0;
        border-top-left-radius: 0.375rem;
        border-bottom-left-radius: 0.375rem;
      }
      
      /* Dropdown RTL */
      .rtl .dropdown-menu {
        right: 0;
        left: auto;
        text-align: right;
      }
      
      /* Tooltip RTL */
      .rtl .tooltip {
        direction: rtl;
      }
      
      /* Modal RTL */
      .rtl .modal-header {
        flex-direction: row-reverse;
      }
      
      .rtl .modal-close {
        margin-left: 0;
        margin-right: auto;
      }
      
      /* Navigation RTL */
      .rtl .navbar-nav {
        flex-direction: row-reverse;
      }
      
      .rtl .breadcrumb {
        flex-direction: row-reverse;
      }
      
      /* Tables RTL */
      .rtl table {
        direction: rtl;
      }
      
      .rtl th:first-child,
      .rtl td:first-child {
        text-align: right;
      }
      
      .rtl th:last-child,
      .rtl td:last-child {
        text-align: left;
      }
    `;
  }

  /**
   * Miroir les icônes pour RTL
   */
  private mirrorIcons(): void {
    if (!this.settings.mirrorIcons) return;
    
    const icons = document.querySelectorAll('svg, .icon, [class*="icon"]');
    icons.forEach(icon => {
      const element = icon as HTMLElement;
      
      // Ne pas mirer certaines icônes
      const skipMirroring = [
        'arrow-right', 'chevron-right', 'angle-right',
        'play', 'forward', 'next'
      ];
      
      const iconClasses = element.className.toString().toLowerCase();
      const shouldSkip = skipMirroring.some(skip => iconClasses.includes(skip));
      
      if (!shouldSkip) {
        element.classList.add('rtl-mirror');
      }
    });
  }

  /**
   * Adapte le layout pour RTL
   */
  private adaptLayoutForRTL(): void {
    // Adapter les conteneurs
    const containers = document.querySelectorAll('.container, .container-fluid');
    containers.forEach(container => {
      const element = container as HTMLElement;
      element.classList.add('rtl-swap-padding');
    });
    
    // Adapter les grilles
    const grids = document.querySelectorAll('.grid, [class*="grid-cols"]');
    grids.forEach(grid => {
      const element = grid as HTMLElement;
      element.style.direction = 'rtl';
    });
  }

  /**
   * Adapte les nouveaux éléments ajoutés au DOM
   */
  private adaptNewElements(element: Element): void {
    if (this.settings.currentDirection !== 'rtl') return;
    
    Object.entries(this.componentMappings).forEach(([selector, config]) => {
      if (element.matches && element.matches(selector)) {
        this.adaptElementForRTL(element as HTMLElement, config);
      }
    });
  }

  /**
   * Retire les classes RTL
   */
  private removeRTLClasses(): void {
    document.body.classList.remove('rtl');
    document.body.classList.add('ltr');
    
    // Retirer les classes d'adaptation
    const adaptedElements = document.querySelectorAll('.rtl-mirror, .rtl-swap-padding, .rtl-swap-margins');
    adaptedElements.forEach(element => {
      element.classList.remove('rtl-mirror', 'rtl-swap-padding', 'rtl-swap-margins');
    });
  }

  /**
   * Remet à zéro le style LTR
   */
  private resetToLTR(): void {
    const elements = document.querySelectorAll('*');
    elements.forEach(element => {
      const el = element as HTMLElement;
      el.style.direction = '';
      el.style.textAlign = '';
      el.style.transform = '';
    });
  }

  /**
   * Vérifie si une langue utilise RTL
   */
  private isRTLLanguage(language: string): boolean {
    const supportedLanguages = localizationService.getSupportedLanguages();
    const langInfo = supportedLanguages.find(lang => lang.code === language);
    return langInfo?.direction === 'rtl';
  }

  /**
   * Active/désactive le support RTL
   */
  public setEnabled(enabled: boolean): void {
    this.settings.enabled = enabled;
    
    if (enabled) {
      this.applyRTLStyles();
    } else {
      this.removeRTLClasses();
      this.resetToLTR();
    }
    
    this.notifyListeners();
  }

  /**
   * Obtient les paramètres RTL actuels
   */
  public getSettings(): RTLSettings {
    return { ...this.settings };
  }

  /**
   * Met à jour les paramètres RTL
   */
  public updateSettings(newSettings: Partial<RTLSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    
    if (newSettings.enabled !== undefined || newSettings.currentDirection) {
      this.applyRTLStyles();
    }
    
    this.notifyListeners();
  }

  /**
   * Obtient la direction actuelle
   */
  public getCurrentDirection(): 'ltr' | 'rtl' {
    return this.settings.currentDirection;
  }

  /**
   * Vérifie si RTL est actif
   */
  public isRTL(): boolean {
    return this.settings.currentDirection === 'rtl';
  }

  /**
   * Ajoute un listener pour les changements RTL
   */
  public addListener(callback: () => void): void {
    this.listeners.add(callback);
  }

  /**
   * Retire un listener
   */
  public removeListener(callback: () => void): void {
    this.listeners.delete(callback);
  }

  /**
   * Notifie tous les listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach(callback => callback());
  }

  /**
   * Obtient les classes CSS recommandées pour RTL
   */
  public getRecommendedClasses(elementType: string): string[] {
    const recommendations: Record<string, string[]> = {
      'button': ['rtl-mirror'],
      'navbar': ['rtl-swap-margins'],
      'dropdown': ['rtl-mirror'],
      'modal': ['rtl-mirror'],
      'form': ['rtl-swap-padding'],
      'text': ['text-right'],
      'icon': ['rtl-mirror']
    };
    
    return recommendations[elementType] || [];
  }

  /**
   * Génère les styles conditionnels pour un composant
   */
  public generateConditionalStyles(baseClasses: string[], elementType: string): string {
    const recommendedClasses = this.getRecommendedClasses(elementType);
    const allClasses = [...baseClasses, ...recommendedClasses];
    
    if (this.isRTL()) {
      return allClasses.join(' ');
    }
    
    return baseClasses.join(' ');
  }

  /**
   * Nettoie les ressources
   */
  public cleanup(): void {
    this.listeners.clear();
    window.removeEventListener('resize', this.handleResize.bind(this));
    
    const style = document.getElementById('rtl-styles');
    if (style) {
      style.remove();
    }
  }
}

// Export de l'instance singleton
export const rtlSupport = RTLSupport.getInstance();