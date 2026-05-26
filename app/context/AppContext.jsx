"use client";

import { createContext, useContext, useState } from "react";
import { SAMPLE_RESULTS } from "../lib/data";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [results, setResults] = useState(SAMPLE_RESULTS);
  return (
    <AppContext.Provider value={{ results, setResults }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
