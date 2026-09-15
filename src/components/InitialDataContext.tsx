import { createContext, type ReactNode } from 'react';

export type InitialData = Record<string, unknown>;
export const InitialDataContext = createContext<InitialData>({});

export function InitialDataProvider({ data, children }: { data: InitialData; children: ReactNode }) {
  return <InitialDataContext.Provider value={data}>{children}</InitialDataContext.Provider>;
}
