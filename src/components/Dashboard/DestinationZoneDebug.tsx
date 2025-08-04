import React from 'react';
import { useDestinationZone } from '../../hooks/useDestinationZone';

export const DestinationZoneDebug: React.FC = () => {
  const { zone: destinationZone, loading: zoneLoading, error: zoneError, gigId } = useDestinationZone();

  return (
    <div className="fixed top-4 right-4 bg-white rounded-lg shadow-lg p-4 border border-gray-200 z-50 max-w-sm">
      <h3 className="text-sm font-semibold text-gray-800 mb-2">🌍 Zone de Destination Debug</h3>
      
      <div className="space-y-2 text-xs">
        <div>
          <span className="font-medium">Gig ID:</span>
          <span className="ml-2 text-gray-600">{gigId || 'Non défini'}</span>
        </div>
        
        <div>
          <span className="font-medium">Zone:</span>
          <span className={`ml-2 ${destinationZone ? 'text-green-600' : 'text-gray-500'}`}>
            {destinationZone || 'Non définie'}
          </span>
        </div>
        
        <div>
          <span className="font-medium">Chargement:</span>
          <span className={`ml-2 ${zoneLoading ? 'text-blue-600' : 'text-gray-500'}`}>
            {zoneLoading ? '⏳ En cours...' : '✅ Terminé'}
          </span>
        </div>
        
        {zoneError && (
          <div>
            <span className="font-medium text-red-600">Erreur:</span>
            <span className="ml-2 text-red-500 text-xs">{zoneError}</span>
          </div>
        )}
        
        <div>
          <span className="font-medium">Environnement:</span>
          <span className="ml-2 text-gray-600">
            {import.meta.env.DEV ? 'DEV' : 'PROD'}
          </span>
        </div>
        
        <div>
          <span className="font-medium">API URL:</span>
          <span className="ml-2 text-gray-600 text-xs">
            {import.meta.env.VITE_GIGS_API || 'Non configuré'}
          </span>
        </div>
      </div>
      
      {destinationZone && (
        <div className="mt-3 p-2 bg-green-50 rounded border border-green-200">
          <div className="text-xs text-green-800">
            <div className="font-medium">Langue attendue:</div>
            <div>
              {destinationZone === 'FR' ? 'Français (fr-FR)' : 
               destinationZone === 'DE' ? 'Allemand (de-DE)' :
               destinationZone === 'ES' ? 'Espagnol (es-ES)' :
               destinationZone === 'MA' ? 'Arabe (ar-MA)' :
               destinationZone === 'GB' ? 'Anglais (en-GB)' : 
               `Zone ${destinationZone} (détection automatique)`}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 