/**
 * Composant de Message d'Erreur
 * Universal Eats - Composant UI réutilisable
 */

import React from 'react';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  type?: 'error' | 'warning' | 'info';
  className?: string;
}

export default function ErrorMessage({ 
  message, 
  onRetry, 
  type = 'error',
  className = '' 
}: ErrorMessageProps) {
  const typeStyles = {
    error: {
      container: 'bg-red-50 border-red-200',
      icon: '🚫',
      titleColor: 'text-red-800',
      messageColor: 'text-red-700',
      buttonColor: 'bg-red-600 hover:bg-red-700'
    },
    warning: {
      container: 'bg-yellow-50 border-yellow-200',
      icon: '⚠️',
      titleColor: 'text-yellow-800',
      messageColor: 'text-yellow-700',
      buttonColor: 'bg-yellow-600 hover:bg-yellow-700'
    },
    info: {
      container: 'bg-blue-50 border-blue-200',
      icon: 'ℹ️',
      titleColor: 'text-blue-800',
      messageColor: 'text-blue-700',
      buttonColor: 'bg-blue-600 hover:bg-blue-700'
    }
  };

  const style = typeStyles[type];

  return (
    <div className={`rounded-lg border p-4 ${style.container} ${className}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          <span className="text-2xl">{style.icon}</span>
        </div>
        <div className="ml-3 flex-1">
          <h3 className={`text-sm font-medium ${style.titleColor}`}>
            {type === 'error' && 'Erreur'}
            {type === 'warning' && 'Attention'}
            {type === 'info' && 'Information'}
          </h3>
          <div className={`mt-2 text-sm ${style.messageColor}`}>
            <p>{message}</p>
          </div>
          {onRetry && (
            <div className="mt-4">
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={onRetry}
                  className={`rounded-md px-3 py-2 text-sm font-medium text-white ${style.buttonColor} transition-colors`}
                >
                  Réessayer
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}