import { useEffect, useState, useRef } from 'react';
import { pdfjsLib } from '../../lib/pdfjs';
import { useDocumentStore } from '../../store/documentStore';
import { useToolsStore } from '../../store/toolsStore';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableThumbnail } from './SortableThumbnail';

export default function Sidebar() {
  const pdfJsDoc = useDocumentStore((s) => s.pdfJsDoc);
  const pages = useDocumentStore((s) => s.pages);
  const currentPage = useToolsStore((s) => s.currentPage);
  const setCurrentPage = useToolsStore((s) => s.setCurrentPage);
  const movePage = useDocumentStore((s) => s.movePage);
  const deletePageBase = useDocumentStore((s) => s.deletePage);
  const rotatePage = useDocumentStore((s) => s.rotatePage);

  const deletePage = (index: number) => deletePageBase(index, currentPage);
  const containerRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px movement required before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = pages.findIndex((p) => p.id === active.id);
      const newIndex = pages.findIndex((p) => p.id === over.id);
      movePage(oldIndex, newIndex);
    }
  };

  if (!pdfJsDoc) {
    return (
      <div className="w-64 bg-[var(--surface)] border-r border-[var(--border)] flex flex-col items-center justify-center text-sm text-[var(--text-3)] p-4 text-center">
        Upload a document to see pages here.
      </div>
    );
  }

  return (
    <div className="w-64 bg-[var(--surface-2)] border-r border-[var(--border)] flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-[var(--border)] bg-[var(--surface)]">
        <h3 className="font-semibold text-[var(--text-2)] text-sm uppercase tracking-wider">Pages ({pages.length})</h3>
      </div>
      
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext 
            items={pages.map(p => p.id)}
            strategy={verticalListSortingStrategy}
          >
            {pages.map((page, index) => {
              const pageNum = index + 1;
              const isActive = currentPage === pageNum;
              
              return (
                <SortableThumbnail
                  key={page.id}
                  page={page}
                  index={index}
                  isActive={isActive}
                  pdfJsDoc={pdfJsDoc}
                  onClick={() => setCurrentPage(pageNum)}
                  onRotate={(e) => {
                    e.stopPropagation();
                    rotatePage(index, 90);
                  }}
                  onDelete={(e) => {
                    e.stopPropagation();
                    deletePage(index);
                  }}
                />
              );
            })}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}
