
import React, { useState } from 'react';
import { X } from 'lucide-react';
import { BiomarkerCategory, BiomarkerDef } from '../types';

interface AddBiomarkerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (biomarker: BiomarkerDef) => void;
}

export const AddBiomarkerModal: React.FC<AddBiomarkerModalProps> = ({ isOpen, onClose, onAdd }) => {
  if (!isOpen) return null;

  const [name, setName] = useState('');
  const [category, setCategory] = useState<BiomarkerCategory>(BiomarkerCategory.CUSTOM);
  const [unit, setUnit] = useState('');
  const [direction, setDirection] = useState<'lower_is_better' | 'higher_is_better'>('lower_is_better');
  const [baselineMean, setBaselineMean] = useState('10');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = name.toLowerCase().trim().replace(/\s+/g, '-');
    onAdd({
      id,
      name,
      category,
      unit,
      direction,
      baselineMean: parseFloat(baselineMean) || 10
    });
    onClose();
    // Reset form
    setName('');
    setUnit('');
    setCategory(BiomarkerCategory.CUSTOM);
    setBaselineMean('10');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">Add Custom Biomarker</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Form Fields */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Biomarker Name</label>
            <input 
              type="text" 
              required 
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              placeholder="e.g. Serum Ferritin"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                <select 
                  value={category}
                  onChange={e => setCategory(e.target.value as BiomarkerCategory)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {Object.values(BiomarkerCategory).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
             </div>
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Unit</label>
                <input 
                  type="text" 
                  required 
                  value={unit}
                  onChange={e => setUnit(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="e.g. ng/mL"
                />
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Direction</label>
                <select 
                  value={direction}
                  onChange={e => setDirection(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="lower_is_better">Lower is Better</option>
                  <option value="higher_is_better">Higher is Better</option>
                </select>
             </div>
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Simulated Baseline</label>
                <input 
                  type="number" 
                  required 
                  value={baselineMean}
                  onChange={e => setBaselineMean(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
             </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
            >
              Add Biomarker
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
