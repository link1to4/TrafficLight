import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Intersection } from './types';
import IntersectionCard from './components/IntersectionCard';
import IntersectionForm from './components/IntersectionForm';
import { Plus, LayoutDashboard, Download, Upload } from 'lucide-react';
import { getSecondsFromMidnight } from './utils/timeUtils';
import { downloadJson, readJsonFile } from './utils/fileUtils';

const STORAGE_KEY = 'trafficLightsData';

const App: React.FC = () => {
  const [intersections, setIntersections] = useState<Intersection[]>([]);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load from local storage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setIntersections(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse traffic data", e);
      }
    }
  }, []);

  // Save to local storage whenever intersections change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(intersections));
  }, [intersections]);

  // Global Clock Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sort intersections: closest start time to now appears first
  const sortedIntersections = useMemo(() => {
    const nowSeconds = currentTime.getHours() * 3600 + currentTime.getMinutes() * 60 + currentTime.getSeconds();
    
    return [...intersections].sort((a, b) => {
      const startA = getSecondsFromMidnight(a.startTime);
      const startB = getSecondsFromMidnight(b.startTime);

      // Calculate shortest distance on 24h clock (handling wrapping)
      let diffA = Math.abs(nowSeconds - startA);
      if (diffA > 43200) diffA = 86400 - diffA;

      let diffB = Math.abs(nowSeconds - startB);
      if (diffB > 43200) diffB = 86400 - diffB;

      // Primary sort: Distance to now (ascending)
      // Secondary sort: Name (for stability)
      if (Math.abs(diffA - diffB) < 1) return a.name.localeCompare(b.name);
      return diffA - diffB;
    });
  }, [intersections, currentTime]);

  const handleSave = (data: Omit<Intersection, 'id'>) => {
    if (editingId) {
      setIntersections(prev => prev.map(item => 
        item.id === editingId ? { ...data, id: editingId } : item
      ));
    } else {
      const newIntersection: Intersection = {
        ...data,
        // Use simpler ID generation that works in all contexts (including non-secure/HTTP)
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
      };
      setIntersections(prev => [...prev, newIntersection]);
    }
    closeModal();
  };

  const handleDelete = (id: string) => {
    // Directly delete without confirmation as requested
    setIntersections(prev => prev.filter(item => item.id !== id));
    
    // If we are deleting the item currently being edited in the modal, close the modal
    if (editingId === id) {
      closeModal();
    }
  };

  const handleExport = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    downloadJson(intersections, `traffic-control-backup-${timestamp}.json`);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const data = await readJsonFile(file);
      
      // Basic validation
      if (!Array.isArray(data)) {
        throw new Error("檔案格式錯誤：內容必須是 JSON 陣列 (Array)。");
      }
      
      // Process and validate each item with detailed error messages
      const processedData: Intersection[] = data.map((item: any, index: number) => {
        const itemPrefix = `第 ${index + 1} 筆資料`;
        
        if (!item.name || typeof item.name !== 'string') {
          throw new Error(`${itemPrefix}缺少正確的名稱 (name)`);
        }
        if (!item.startTime || typeof item.startTime !== 'string') {
          throw new Error(`${itemPrefix}缺少正確的啟動時間 (startTime)`);
        }
        
        // Validate timings
        if (!item.timings || 
            typeof item.timings.green !== 'number' || 
            typeof item.timings.yellow !== 'number' || 
            typeof item.timings.red !== 'number') {
           throw new Error(`${itemPrefix}秒數設定 (timings) 格式錯誤，必須包含 green, yellow, red 數值`);
        }

        return {
          // If ID is missing, generate a new one to prevent import failure
          id: item.id || `import-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 5)}`,
          name: item.name,
          startTime: item.startTime,
          activeLoops: typeof item.activeLoops === 'number' ? item.activeLoops : 20,
          negativeLoops: typeof item.negativeLoops === 'number' ? item.negativeLoops : 0,
          timings: {
            green: item.timings.green,
            yellow: item.timings.yellow,
            red: item.timings.red
          }
        };
      });

      if (window.confirm(`解析成功！共 ${processedData.length} 筆資料。\n確定要匯入嗎？這將會覆蓋目前的設定。`)) {
        setIntersections(processedData);
      }
    } catch (error: any) {
      console.error(error);
      alert(`匯入失敗：${error.message || "檔案格式錯誤或損毀。"}`);
    } finally {
      // Reset input so the same file can be selected again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const openCreateModal = () => {
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (id: string) => {
    setEditingId(id);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const editingIntersection = editingId 
    ? intersections.find(i => i.id === editingId) 
    : undefined;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
        accept=".json"
      />

      {/* Navbar */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 shadow-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
               <LayoutDashboard size={24} className="text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white hidden sm:block">智慧路口 <span className="text-blue-500">中控台</span></h1>
            <h1 className="text-xl font-bold tracking-tight text-white sm:hidden">智慧路口</h1>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
             <div className="text-sm font-mono text-slate-400 bg-slate-800 px-3 py-1 rounded-md border border-slate-700 hidden md:block">
                {currentTime.toLocaleTimeString('zh-TW', { hour12: false })}
             </div>
             
             {/* Import/Export Group */}
             <div className="flex items-center bg-slate-800 rounded-lg border border-slate-700 p-1">
                <button
                  onClick={handleImportClick}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md transition-colors"
                  title="匯入設定"
                >
                  <Upload size={18} />
                </button>
                <div className="w-px h-4 bg-slate-700 mx-1"></div>
                <button
                  onClick={handleExport}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md transition-colors"
                  title="匯出設定 (JSON)"
                >
                  <Download size={18} />
                </button>
             </div>

             <button
               onClick={openCreateModal}
               className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-lg shadow-blue-900/20 active:scale-95 whitespace-nowrap"
             >
               <Plus size={18} /> <span className="hidden sm:inline">新增路口</span>
             </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        
        {intersections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center mb-6 border-2 border-slate-800 border-dashed">
               <LayoutDashboard size={48} className="opacity-50"/>
            </div>
            <h3 className="text-xl font-medium text-slate-300 mb-2">系統閒置中</h3>
            <p className="max-w-md text-center mb-8 text-slate-400">目前沒有設定任何路口。請點擊上方按鈕新增路口，或匯入之前的設定檔。</p>
            <div className="flex gap-4">
              <button
                 onClick={handleImportClick}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-6 py-3 rounded-lg font-medium transition-colors"
               >
                 <Upload size={20} /> 匯入設定
               </button>
              <button
                 onClick={openCreateModal}
                 className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 px-6 py-3 rounded-lg font-medium transition-colors"
               >
                 <Plus size={20} /> 新增第一個路口
               </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedIntersections.map(intersection => (
              <IntersectionCard
                key={intersection.id}
                data={intersection}
                currentTime={currentTime}
                onEdit={openEditModal}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>

      {/* Modals */}
      {isModalOpen && (
        <IntersectionForm
          initialData={editingIntersection}
          onSave={handleSave}
          onDelete={editingIntersection ? () => handleDelete(editingIntersection.id) : undefined}
          onCancel={closeModal}
        />
      )}
    </div>
  );
};

export default App;