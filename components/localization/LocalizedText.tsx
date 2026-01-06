/**
 * COMPOSANT TEXT LOCALISÉ - Universal Eats
 * Composant pour afficher du texte traduit avec support des paramètres
 * et des variations selon le contexte
 */

import React from 'react';
import { useTranslate } from '../../hooks/use-localization';

interface LocalizedTextProps {
  /**
   * Clé de traduction
   */
  translationKey: string;
  
  /**
   * Paramètres pour la traduction (variables, pluriels, etc.)
   */
  params?: Record<string, any>;
  
  /**
   * Options de traduction
   */
  options?: {
    count?: number;
    gender?: 'masculine' | 'feminine';
    context?: string;
    fallback?: string;
  };
  
  /**
   * Classe CSS personnalisée
   */
  className?: string;
  
  /**
   * Élément HTML à utiliser (défaut: span)
   */
  as?: keyof JSX.IntrinsicElements;
  
  /**
   * Props à passer à l'élément HTML
   */
  htmlProps?: React.HTMLAttributes<HTMLElement>;
  
  /**
   * Fonction de rendu personnalisé
   */
  render?: (translatedText: string) => React.ReactNode;
}

/**
 * Composant pour afficher du texte traduit
 */
export const LocalizedText: React.FC<LocalizedTextProps> = ({
  translationKey,
  params,
  options,
  className,
  as = 'span',
  htmlProps,
  render
}) => {
  const { translate } = useTranslate();
  
  const translatedText = translate(translationKey, params, options);
  
  // Si une fonction de rendu personnalisée est fournie
  if (render) {
    return <>{render(translatedText)}</>;
  }
  
  // Créer l'élément avec les props
  const Element = as as any;
  
  return (
    <Element 
      className={className}
      {...htmlProps}
    >
      {translatedText}
    </Element>
  );
};

/**
 * Composant pour les titres localisés (h1, h2, h3, etc.)
 */
interface LocalizedHeadingProps {
  translationKey: string;
  params?: Record<string, any>;
  options?: LocalizedTextProps['options'];
  className?: string;
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  htmlProps?: React.HTMLAttributes<HTMLHeadingElement>;
}

export const LocalizedHeading: React.FC<LocalizedHeadingProps> = ({
  translationKey,
  params,
  options,
  className,
  level = 2,
  htmlProps
}) => {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;
  
  return (
    <LocalizedText
      as={Tag}
      translationKey={translationKey}
      params={params}
      options={options}
      className={className}
      htmlProps={htmlProps}
    />
  );
};

/**
 * Composant pour les boutons localisés
 */
interface LocalizedButtonProps {
  translationKey: string;
  params?: Record<string, any>;
  options?: LocalizedTextProps['options'];
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  htmlProps?: React.ButtonHTMLAttributes<HTMLButtonElement>;
}

export const LocalizedButton: React.FC<LocalizedButtonProps> = ({
  translationKey,
  params,
  options,
  className,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
  htmlProps
}) => {
  const { translate } = useTranslate();
  
  const buttonText = translate(translationKey, params, options);
  
  const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
    outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500',
    ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-gray-500'
  };
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };
  
  const disabledClasses = disabled || loading ? 'opacity-50 cursor-not-allowed' : '';
  
  const buttonClasses = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${disabledClasses} ${className || ''}`.trim();
  
  return (
    <button
      type={type}
      className={buttonClasses}
      disabled={disabled || loading}
      onClick={onClick}
      {...htmlProps}
    >
      {loading ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {translate('ui.loading')}
        </>
      ) : (
        buttonText
      )}
    </button>
  );
};

/**
 * Composant pour les labels de formulaire localisés
 */
interface LocalizedLabelProps {
  translationKey: string;
  params?: Record<string, any>;
  options?: LocalizedTextProps['options'];
  className?: string;
  htmlFor?: string;
  required?: boolean;
  htmlProps?: React.LabelHTMLAttributes<HTMLLabelElement>;
}

export const LocalizedLabel: React.FC<LocalizedLabelProps> = ({
  translationKey,
  params,
  options,
  className,
  htmlFor,
  required = false,
  htmlProps
}) => {
  const { translate } = useTranslate();
  
  const labelText = translate(translationKey, params, options);
  
  return (
    <label
      htmlFor={htmlFor}
      className={`block text-sm font-medium text-gray-700 ${className || ''}`.trim()}
      {...htmlProps}
    >
      {labelText}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );
};

/**
 * Composant pour les messages d'erreur localisés
 */
interface LocalizedErrorProps {
  translationKey: string;
  params?: Record<string, any>;
  options?: LocalizedTextProps['options'];
  className?: string;
  variant?: 'inline' | 'alert';
  htmlProps?: React.HTMLAttributes<HTMLElement>;
}

export const LocalizedError: React.FC<LocalizedErrorProps> = ({
  translationKey,
  params,
  options,
  className,
  variant = 'inline',
  htmlProps
}) => {
  const { translate } = useTranslate();
  
  const errorText = translate(translationKey, params, options);
  
  if (variant === 'alert') {
    return (
      <div
        className={`bg-red-50 border border-red-200 rounded-md p-4 ${className || ''}`.trim()}
        role="alert"
        {...htmlProps}
      >
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <LocalizedText
              translationKey={translationKey}
              params={params}
              options={options}
              className="text-sm text-red-800"
            />
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <LocalizedText
      translationKey={translationKey}
      params={params}
      options={options}
      className={`text-sm text-red-600 ${className || ''}`.trim()}
      htmlProps={htmlProps}
    />
  );
};

/**
 * Composant pour les messages de succès localisés
 */
interface LocalizedSuccessProps {
  translationKey: string;
  params?: Record<string, any>;
  options?: LocalizedTextProps['options'];
  className?: string;
  variant?: 'inline' | 'alert';
  htmlProps?: React.HTMLAttributes<HTMLElement>;
}

export const LocalizedSuccess: React.FC<LocalizedSuccessProps> = ({
  translationKey,
  params,
  options,
  className,
  variant = 'alert',
  htmlProps
}) => {
  if (variant === 'alert') {
    return (
      <div
        className={`bg-green-50 border border-green-200 rounded-md p-4 ${className || ''}`.trim()}
        role="alert"
        {...htmlProps}
      >
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <LocalizedText
              translationKey={translationKey}
              params={params}
              options={options}
              className="text-sm text-green-800"
            />
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <LocalizedText
      translationKey={translationKey}
      params={params}
      options={options}
      className={`text-sm text-green-600 ${className || ''}`.trim()}
      htmlProps={htmlProps}
    />
  );
};

/**
 * Composant pour les tooltips localisés
 */
interface LocalizedTooltipProps {
  translationKey: string;
  params?: Record<string, any>;
  options?: LocalizedTextProps['options'];
  children: React.ReactNode;
  className?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const LocalizedTooltip: React.FC<LocalizedTooltipProps> = ({
  translationKey,
  params,
  options,
  children,
  className,
  position = 'top'
}) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const { translate } = useTranslate();
  
  const tooltipText = translate(translationKey, params, options);
  
  const positionClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2'
  };
  
  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          className={`absolute z-10 px-2 py-1 text-xs text-white bg-gray-900 rounded shadow-lg whitespace-nowrap ${positionClasses[position]} ${className || ''}`.trim()}
        >
          {tooltipText}
          <div
            className={`absolute w-2 h-2 bg-gray-900 transform rotate-45 ${
              position === 'top' ? 'top-full left-1/2 -translate-x-1/2 -mt-1' :
              position === 'bottom' ? 'bottom-full left-1/2 -translate-x-1/2 -mb-1' :
              position === 'left' ? 'left-full top-1/2 -translate-y-1/2 -ml-1' :
              'right-full top-1/2 -translate-y-1/2 -mr-1'
            }`}
          />
        </div>
      )}
    </div>
  );
};