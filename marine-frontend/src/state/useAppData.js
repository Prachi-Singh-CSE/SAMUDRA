import { useContext } from "react";
import { AppDataContext } from "./AppDataContext";

export function useAppData() {
  const context = useContext(AppDataContext);

  if (!context) {
    throw new Error("useAppData must be used within AppDataProvider");
  }

  return context;
}