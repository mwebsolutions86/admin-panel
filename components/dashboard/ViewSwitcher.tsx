'use client'

import { LayoutGrid, Kanban, List, TableProperties } from 'lucide-react'

export type ViewMode = 'grid' | 'kanban' | 'list'

interface ViewSwitcherProps {
  currentView: ViewMode
  onChange: (view: ViewMode) => void
}

export default function ViewSwitcher({ currentView, onChange }: ViewSwitcherProps) {
  return (
    <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
      <button
        onClick={() => onChange('grid')}
        className={`p-2 rounded-md transition-all flex items-center gap-2 text-sm font-medium ${
          currentView === 'grid' 
            ? 'bg-white text-blue-600 shadow-sm' 
            : 'text-slate-500 hover:text-slate-700'
        }`}
        title="Vue Grille"
      >
        <LayoutGrid size={18} />
        <span className="hidden sm:inline">Grille</span>
      </button>

      <button
        onClick={() => onChange('kanban')}
        className={`p-2 rounded-md transition-all flex items-center gap-2 text-sm font-medium ${
          currentView === 'kanban' 
            ? 'bg-white text-blue-600 shadow-sm' 
            : 'text-slate-500 hover:text-slate-700'
        }`}
        title="Vue Kanban"
      >
        <Kanban size={18} />
        <span className="hidden sm:inline">Kanban</span>
      </button>

      <button
        onClick={() => onChange('list')}
        className={`p-2 rounded-md transition-all flex items-center gap-2 text-sm font-medium ${
          currentView === 'list' 
            ? 'bg-white text-blue-600 shadow-sm' 
            : 'text-slate-500 hover:text-slate-700'
        }`}
        title="Vue Liste"
      >
        <TableProperties size={18} />
        <span className="hidden sm:inline">Liste</span>
      </button>
    </div>
  )
}