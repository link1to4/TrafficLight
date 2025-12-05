import React, { useState, useEffect } from 'react';
import { Intersection } from './types';
import IntersectionCard from './components/IntersectionCard';
import IntersectionForm from './components/IntersectionForm';
import { Plus, LayoutDashboard } from 'lucide-react';

const STORAGE_KEY = 'trafficLightsData';

const App: React.FC = () => {
  const [intersections, setIntersections] = useState<Intersection[]>([]);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

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
      {/* Navbar */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 shadow-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
               <LayoutDashboard size={24} className="text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">智慧路口 <span className="text-blue-500">中控台</span></h1>
          </div>
          <div className="flex items-center gap-4">
             <div className="text-sm font-mono text-slate-400 bg-slate-800 px-3 py-1 rounded-md border border-slate-700 hidden sm:block">
                {currentTime.toLocaleTimeString('zh-TW', { hour12: false })}
             </div>
             <button
               onClick={openCreateModal}
               className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-lg shadow-blue-900/20 active:scale-95"
             >
               <Plus size={18} /> 新增路口
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
            <p className="max-w-md text-center mb-8 text-slate-400">目前沒有設定任何路口。請點擊上方按鈕新增路口以開始監控與模擬。</p>
            <button
               onClick={openCreateModal}
               className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 px-6 py-3 rounded-lg font-medium transition-colors"
             >
               <Plus size={20} /> 新增第一個路口
             </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {intersections.map(intersection => (
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

      {/* Modal */}
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