import React, { createContext, useContext, useState } from 'react';

interface TaskModalInitialData {
  propertyId?: number;
  contactId?: number;
}

interface TaskModalContextType {
  isTaskModalOpen: boolean;
  initialData?: TaskModalInitialData;
  openTaskModal: (data?: TaskModalInitialData) => void;
  closeTaskModal: () => void;
}

const TaskModalContext = createContext<TaskModalContextType | undefined>(undefined);

export function TaskModalProvider({ children }: { children: React.ReactNode }) {
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [initialData, setInitialData] = useState<TaskModalInitialData | undefined>(undefined);

  const openTaskModal = (data?: TaskModalInitialData) => {
    setInitialData(data);
    setIsTaskModalOpen(true);
  };
  
  const closeTaskModal = () => {
    setIsTaskModalOpen(false);
    setInitialData(undefined);
  };

  return (
    <TaskModalContext.Provider value={{
      isTaskModalOpen,
      initialData,
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