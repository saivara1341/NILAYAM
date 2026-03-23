
import React, { useState } from 'react';
import Modal from '../ui/Modal';
import { generatePropertyStructure, createPropertyWithUnits } from '../../services/api';
import { Property, PropertyType } from '../../types';
import { formatPropertyType, SparklesIcon } from '../../constants';

interface AiPropertyArchitectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newProperty: Property) => void;
}

const AiPropertyArchitectModal: React.FC<AiPropertyArchitectModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [description, setDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedData, setGeneratedData] = useState<{ building: any, units: any[] } | null>(null);

  const reset = () => {
    setDescription('');
    setGeneratedData(null);
    setError(null);
    setIsAnalyzing(false);
    setIsCreating(false);
  };

  const handleAnalyze = async () => {
    if (!description.trim()) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const result = await generatePropertyStructure(description);
      setGeneratedData(result);
    } catch (err: any) {
      setError(err.message || "Failed to analyze description. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirmCreate = async () => {
    if (!generatedData) return;
    setIsCreating(true);
    setError(null);
    try {
      const newProperty = await createPropertyWithUnits(generatedData.building, generatedData.units);
      onSuccess(newProperty);
      onClose();
      reset();
    } catch (err: any) {
      setError(err.message || "Failed to create property in database.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => { onClose(); reset(); }} title="AI Property Architect">
      <div className="space-y-4">
        {!generatedData ? (
          <>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg flex gap-3 items-start border border-blue-100 dark:border-blue-800">
               <SparklesIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400 mt-1 flex-shrink-0" />
               <div>
                   <h4 className="font-semibold text-indigo-900 dark:text-indigo-200">Describe your property naturally</h4>
                   <p className="text-sm text-indigo-800 dark:text-indigo-300 mt-1">
                       "I have a PG called 'Sunrise Stay' in Bangalore. It has 3 floors. Each floor has 4 rooms. Each room has 2 beds renting for 8000 each."
                   </p>
               </div>
            </div>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., A 5-story apartment complex called 'Galaxy Heights' in Mumbai. Each floor has 2 flats (2BHK) renting for 45k."
              rows={6}
              className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />

            {error && <p className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-2 rounded">{error}</p>}

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={onClose} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-medium">Cancel</button>
              <button 
                onClick={handleAnalyze} 
                disabled={isAnalyzing || !description.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg font-semibold shadow-md flex items-center gap-2 disabled:opacity-50"
              >
                 {isAnalyzing ? 'Architecting...' : 'Generate Structure'}
                 {!isAnalyzing && <SparklesIcon className="w-4 h-4" />}
              </button>
            </div>
          </>
        ) : (
          <div className="animate-fade-in">
             <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 mb-4">
                 <h4 className="font-bold text-lg text-slate-900 dark:text-white">{generatedData.building.name}</h4>
                 <p className="text-slate-500 dark:text-slate-400 text-sm">{generatedData.building.address}</p>
                 <span className="inline-block mt-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded">
                     {formatPropertyType(generatedData.building.property_type)}
                 </span>
             </div>

             <div className="mb-2 flex justify-between items-center">
                 <h5 className="font-semibold text-slate-700 dark:text-slate-300">Generated Units ({generatedData.units.length})</h5>
                 <button onClick={() => setGeneratedData(null)} className="text-sm text-blue-600 hover:underline">Edit Description</button>
             </div>

             <div className="max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900">
                 {generatedData.units.map((unit: any, idx: number) => (
                     <div key={idx} className="flex justify-between items-center p-3 border-b border-slate-200 dark:border-slate-700 last:border-0 text-sm">
                         <span className="font-medium text-slate-800 dark:text-slate-200">{unit.house_number}</span>
                         <span className="text-slate-600 dark:text-slate-400">₹{unit.rent_amount}</span>
                     </div>
                 ))}
             </div>

             {error && <p className="mt-4 text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-2 rounded">{error}</p>}

             <div className="flex justify-end gap-3 pt-4">
               <button onClick={reset} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-medium">Start Over</button>
               <button 
                 onClick={handleConfirmCreate} 
                 disabled={isCreating}
                 className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg font-semibold shadow-md disabled:opacity-50"
               >
                  {isCreating ? 'Building Database...' : 'Confirm & Create'}
               </button>
             </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default AiPropertyArchitectModal;
