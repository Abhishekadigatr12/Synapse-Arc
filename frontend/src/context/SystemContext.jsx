import React from 'react';
export const SystemContext = React.createContext(null);
export function SystemProvider({children}){ return <SystemContext.Provider value={{}}>{children}</SystemContext.Provider>; }
