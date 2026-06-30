import { createContext, useContext, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

type DashboardContextType = {
  prevLocationPath: string;
};

const DashboardContext = createContext<DashboardContextType>({ prevLocationPath: '' });

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const prevPathRef = useRef('');
  const currentPathRef = useRef(location.pathname);

  useEffect(() => {
    if (location.pathname !== currentPathRef.current) {
      prevPathRef.current = currentPathRef.current;
      currentPathRef.current = location.pathname;
    }
  }, [location.pathname]);

  return (
    <DashboardContext.Provider value={{ prevLocationPath: prevPathRef.current }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboardContext() {
  return useContext(DashboardContext);
}
