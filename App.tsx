
import React, { useState, useEffect, useCallback } from 'react';
import { generateSimulatedData, augmentDataWithBiomarker } from './services/simulation';
import { PatientData, BiomarkerDef, Timepoint } from './types';
import { BIOMARKERS, TIMEPOINT_ORDER } from './constants';
import { TrendChart } from './components/TrendChart';
import { DistributionChart } from './components/DistributionChart';
import { BiomarkerOverview } from './components/BiomarkerOverview';
import { TimepointComparison } from './components/TimepointComparison';
import { AddBiomarkerModal } from './components/AddBiomarkerModal';
import { PowerCalculator } from './components/PowerCalculator';
import { AboutModal } from './components/AboutModal';
import { 
  LayoutDashboard, 
  Activity, 
  Upload, 
  RefreshCw, 
  Filter, 
  FileText,
  Info,
  Calendar,
  Code,
  Layers,
  Plus,
  Calculator,
  BarChart2
} from 'lucide-react';

// --- Helper Components ---

const Header: React.FC<{ 
  onRegenerate: () => void; 
  onUpload: () => void; 
  activeTab: 'dashboard' | 'power';
  setActiveTab: (t: 'dashboard' | 'power') => void;
}> = ({ onRegenerate, onUpload, activeTab, setActiveTab }) => {
  const [showInfo, setShowInfo] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.csv') && !fileName.endsWith('.json')) {
      alert("Invalid file type. Please upload a .csv or .json file.");
      event.target.value = ''; // Reset input
      return;
    }

    // Valid file
    alert("Upload feature parses specifically formatted CSVs. For this prototype, please use the simulation engine.");
    // In a real implementation, you would process the file here
    event.target.value = ''; // Reset to allow re-upload
  };

  return (
    <header className="sticky top-0 z-30 w-full bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
            <Activity size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">BioTrial Analytics</h1>
            <p className="text-xs text-slate-500 font-medium">Phase IIb Clinical Study Dashboard</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-slate-100 p-1 rounded-lg self-start md:self-center">
           <button
             onClick={() => setActiveTab('dashboard')}
             className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
               activeTab === 'dashboard' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
             }`}
           >
             <BarChart2 size={16} />
             Analytics Dashboard
           </button>
           <button
             onClick={() => setActiveTab('power')}
             className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
               activeTab === 'power' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
             }`}
           >
             <Calculator size={16} />
             Power Calculator
           </button>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === 'dashboard' && (
            <button 
              onClick={onRegenerate}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <RefreshCw size={16} />
              <span className="hidden lg:inline">Simulate New Cohort</span>
              <span className="lg:hidden">Simulate</span>
            </button>
          )}
          
          <div className="relative flex items-center group">
            <label className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer transition-colors shadow-md">
              <Upload size={16} />
              <span className="hidden lg:inline">Upload Data</span>
              <span className="lg:hidden">Upload</span>
              <input 
                type="file" 
                className="hidden" 
                accept=".csv,.json" 
                onChange={handleFileChange} 
              />
            </label>
            
            <button
              className="ml-2 p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-full transition-all"
              onMouseEnter={() => setShowInfo(true)}
              onMouseLeave={() => setShowInfo(false)}
              onClick={() => setShowInfo(!showInfo)}
              aria-label="Data Format Info"
            >
              <Info size={20} />
            </button>

            {/* Data Format Tooltip */}
            <div 
              className={`absolute top-full right-0 mt-4 w-96 bg-white p-5 rounded-xl shadow-2xl border border-slate-200 text-slate-600 z-50 transition-all duration-200 transform origin-top-right ${showInfo ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'}`}
            >
              <div className="absolute -top-2 right-4 w-4 h-4 bg-white border-t border-l border-slate-200 transform rotate-45"></div>
              
              <h4 className="font-bold text-slate-800 mb-3 text-sm flex items-center gap-2">
                <Code size={16} className="text-indigo-600" />
                Supported Data Formats
              </h4>
              
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> CSV Format
                  </p>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 font-mono text-[10px] text-slate-600 overflow-x-auto whitespace-nowrap">
                    <div className="text-slate-400 select-none border-b border-slate-200 pb-1 mb-1">Header Row</div>
                    patientId, arm, biomarkerId, timepoint, value
                    <div className="text-slate-400 select-none border-t border-slate-200 pt-1 mt-1">Example Row</div>
                    PT-001, Placebo, hsCRP, Week 4, 4.5
                  </div>
                </div>
                
                <div>
                  <p className="text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> JSON Format
                  </p>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 font-mono text-[10px] text-slate-600">
<pre>{`[
  {
    "patientId": "PT-001",
    "arm": "Drug X 1mg",
    "measurements": [
      { 
        "biomarkerId": "hsCRP", 
        "timepoint": "Baseline", 
        "value": 3.2 
      }
    ]
  }
]`}</pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

const Footer: React.FC = () => (
  <footer className="bg-slate-900 text-slate-400 py-10 border-t border-slate-800 mt-auto">
    <div className="container mx-auto px-6 max-w-7xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="space-y-4">
          <h3 className="text-slate-200 font-semibold text-lg flex items-center gap-2">
            <Activity size={20} className="text-indigo-500" />
            BioTrial Analytics <span className="text-xs font-normal bg-indigo-900/50 text-indigo-300 border border-indigo-700/50 px-2 py-0.5 rounded-full">PROTOTYPE</span>
          </h3>
          <p className="text-sm leading-relaxed text-slate-400 max-w-md">
            This application is a functional prototype designed for visualizing and interpreting clinical trial biomarker data. 
            All data presented herein is simulated for demonstration purposes only and should not be used for clinical decision-making.
          </p>
          <div className="pt-2 text-sm border-t border-slate-800/50 inline-block">
            <p className="mb-1">Developed by <strong className="text-slate-200">Vivek Das</strong>.</p>
            <p className="italic opacity-70 flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              Under active development.
            </p>
          </div>
        </div>
        
        <div className="md:text-right space-y-4">
             <div>
                <h4 className="text-slate-200 font-medium mb-2 flex items-center md:justify-end gap-2">
                  <Code size={16} /> Development Stack
                </h4>
                <p className="text-sm text-slate-500 mb-3">Built using modern web technologies:</p>
                <ul className="flex flex-wrap gap-2 md:justify-end">
                  <li className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded-md text-xs font-medium border border-slate-700">React 19</li>
                  <li className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded-md text-xs font-medium border border-slate-700">TypeScript</li>
                  <li className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded-md text-xs font-medium border border-slate-700">Tailwind CSS</li>
                  <li className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded-md text-xs font-medium border border-slate-700">Recharts</li>
                </ul>
             </div>
        </div>
      </div>
      <div className="mt-8 pt-8 border-t border-slate-800 text-center text-xs text-slate-600">
        &copy; {new Date().getFullYear()} BioTrial Analytics. All rights reserved.
      </div>
    </div>
  </footer>
);

// --- Main App ---

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'power'>('dashboard');
  
  const [biomarkers, setBiomarkers] = useState<BiomarkerDef[]>(BIOMARKERS);
  const [data, setData] = useState<PatientData[]>([]);
  const [selectedBiomarkerId, setSelectedBiomarkerId] = useState<string>(BIOMARKERS[0].id);
  const [selectedTimepoint, setSelectedTimepoint] = useState<Timepoint>(Timepoint.WEEK_24);
  const [isPercentChange, setIsPercentChange] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(true);

  const loadData = useCallback(() => {
    setLoading(true);
    // Simulate async loading
    setTimeout(() => {
      // Generate data using current list of biomarkers
      const newData = generateSimulatedData(600, biomarkers);
      setData(newData);
      setLoading(false);
    }, 600);
  }, [biomarkers]);

  useEffect(() => {
    // Initial load
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  const handleAddBiomarker = (newBio: BiomarkerDef) => {
    // 1. Update biomarker definition list
    const updatedBiomarkers = [...biomarkers, newBio];
    setBiomarkers(updatedBiomarkers);

    // 2. Augment existing patient data with simulated values for this new biomarker
    const updatedData = augmentDataWithBiomarker(data, newBio);
    setData(updatedData);

    // 3. Select the new biomarker
    setSelectedBiomarkerId(newBio.id);
  };

  const activeBiomarker = biomarkers.find(b => b.id === selectedBiomarkerId) || biomarkers[0];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 flex flex-col">
      <Header 
        onRegenerate={loadData} 
        onUpload={() => {}} 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <main className="container mx-auto px-6 py-8 max-w-7xl flex-grow">
        
        {activeTab === 'dashboard' ? (
          <>
            {/* Info Banner */}
            <div className="mb-8 p-4 bg-blue-50 border border-blue-100 rounded-lg flex items-start gap-3 text-blue-800 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
              <Info className="mt-0.5 shrink-0 text-blue-600" size={18} />
              <div className="text-sm">
                <strong>Study Design:</strong> Randomized, Double-Blind, Placebo-Controlled (1:1:1). N=600. 
                Analyzing efficacy of Drug X (1mg vs 2mg) vs Placebo over 24 weeks.
                Data standardized to baseline for comparability.
              </div>
            </div>

            {/* Top Level Stats / Heatmap */}
            <section className="mb-10 animate-in fade-in duration-700">
              <div className="flex items-center gap-2 mb-4">
                <LayoutDashboard className="text-indigo-600" size={20} />
                <h2 className="text-xl font-bold text-slate-800">Study Overview</h2>
              </div>
              {loading ? (
                <div className="h-64 bg-white rounded-xl shadow-sm animate-pulse border border-slate-200"></div>
              ) : (
                <BiomarkerOverview data={data} biomarkers={biomarkers} />
              )}
            </section>

            {/* Deep Dive Section */}
            <section className="mb-10 animate-in fade-in duration-1000">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <div className="flex items-center gap-2">
                  <FileText className="text-indigo-600" size={20} />
                  <h2 className="text-xl font-bold text-slate-800">Biomarker Deep Dive</h2>
                </div>
                
                {/* Controls */}
                <div className="flex flex-wrap items-center gap-4 bg-white p-2 rounded-xl shadow-sm border border-slate-200">
                  <div className="flex items-center gap-2 px-2 border-r border-slate-200">
                    <Filter size={16} className="text-slate-400" />
                    <span className="text-xs font-semibold uppercase text-slate-500">Metric</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <select 
                      value={selectedBiomarkerId}
                      onChange={(e) => setSelectedBiomarkerId(e.target.value)}
                      className="bg-transparent text-sm font-medium text-slate-700 focus:outline-none cursor-pointer min-w-[150px]"
                    >
                      {biomarkers.map(b => (
                        <option key={b.id} value={b.id}>{b.name} ({b.category})</option>
                      ))}
                    </select>
                    <button 
                      onClick={() => setIsAddModalOpen(true)}
                      className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                      title="Add Custom Biomarker"
                    >
                      <Plus size={16} />
                    </button>
                  </div>

                  <div className="w-px h-6 bg-slate-200 mx-2"></div>

                  <div className="flex items-center gap-2 px-2 border-r border-slate-200">
                    <Calendar size={16} className="text-slate-400" />
                    <span className="text-xs font-semibold uppercase text-slate-500">Time</span>
                  </div>

                  <select 
                    value={selectedTimepoint}
                    onChange={(e) => setSelectedTimepoint(e.target.value as Timepoint)}
                    className="bg-transparent text-sm font-medium text-slate-700 focus:outline-none cursor-pointer min-w-[100px]"
                  >
                    {TIMEPOINT_ORDER.map(tp => (
                      <option key={tp} value={tp}>{tp}</option>
                    ))}
                  </select>

                  <div className="w-px h-6 bg-slate-200 mx-2"></div>

                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium transition-colors ${!isPercentChange ? 'text-indigo-600' : 'text-slate-500'}`}>Absolute</span>
                    <button 
                      onClick={() => setIsPercentChange(!isPercentChange)}
                      className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${isPercentChange ? 'bg-indigo-600' : 'bg-slate-300'}`}
                    >
                      <span 
                        className={`block w-4 h-4 bg-white rounded-full shadow transform transition-transform mt-1 ml-1 ${isPercentChange ? 'translate-x-5' : 'translate-x-0'}`} 
                      />
                    </button>
                    <span className={`text-sm font-medium transition-colors ${isPercentChange ? 'text-indigo-600' : 'text-slate-500'}`}>% Change</span>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="h-[400px] bg-white rounded-xl shadow-sm animate-pulse border border-slate-200"></div>
                      <div className="h-[400px] bg-white rounded-xl shadow-sm animate-pulse border border-slate-200"></div>
                  </div>
                  <div className="h-[300px] bg-white rounded-xl shadow-sm animate-pulse border border-slate-200"></div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <TrendChart 
                      data={data} 
                      biomarker={activeBiomarker} 
                      showPercentChange={isPercentChange}
                    />
                    <DistributionChart
                      data={data}
                      biomarker={activeBiomarker}
                      timepoint={selectedTimepoint}
                      showPercentChange={isPercentChange}
                    />
                  </div>
                  
                  {/* Comparison View */}
                  <TimepointComparison 
                    data={data}
                    biomarker={activeBiomarker}
                    showPercentChange={isPercentChange}
                  />
                </div>
              )}
            </section>
          </>
        ) : (
          <section>
             <div className="flex items-center gap-2 mb-6">
                <Calculator className="text-indigo-600" size={20} />
                <h2 className="text-xl font-bold text-slate-800">Sample Size & Power Calculator</h2>
             </div>
             <PowerCalculator />
          </section>
        )}

      </main>
      
      <Footer />

      <AddBiomarkerModal 
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddBiomarker}
      />
      
      <AboutModal 
        isOpen={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
      />
    </div>
  );
};

export default App;
