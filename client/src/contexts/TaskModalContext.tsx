import React, { createContext, useContext, useState } from 'react';

interface TaskModalContextType {
  isTaskModalOpen: boolean;
  openTaskModal: () => void;
  closeTaskModal: () => void;
}

const TaskModalContext = createContext<TaskModalContextType | undefined>(undefined);

export function TaskModalProvider({ children }: { children: React.ReactNode }) {
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  const openTaskModal = () => setIsTaskModalOpen(true);
  const closeTaskModal = () => setIsTaskModalOpen(false);

  return (
    <TaskModalContext.Provider value={{
      isTaskModalOpen,
      openTaskModal,
      closeTaskModal,
    }}>
      {children}
    </TaskModalContext.Provider>
  );
}

export function useTaskModal() {
  const context = useContext(TaskModalContext);
  if (context === undefined) {
    throw new Error('useTaskModal must be used within a TaskModalProvider');
  }
  return context;
}