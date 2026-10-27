import { useSyncExternalStore } from "react";

export type ProjectTypeValue =
  | "Apartment Building"
  | "House"
  | "Commercial"
  | "Industrial";
export type HouseScopeValue = "whole" | "sections";

export type ProjectData = {
  projectName: string;
  company: string;
  startDate: string;
  endDate: string;
  projectType: ProjectTypeValue;
  floors: string;
  roomsPerFloor: string;
  budgetEnabled: boolean;
  budget: string;
  location: string;
  description: string;
  houseScope: HouseScopeValue;
  selectedSections: string[];
  status?: string;
};

const DEFAULT_PROJECT_DATA: ProjectData = {
  projectName: "",
  company: "",
  startDate: "",
  endDate: "",
  projectType: "Apartment Building",
  floors: "",
  roomsPerFloor: "",
  budgetEnabled: false,
  budget: "",
  location: "",
  description: "",
  houseScope: "whole",
  selectedSections: [],
};

let projectData: ProjectData = DEFAULT_PROJECT_DATA;
const listeners = new Set<() => void>();

const notify = () => {
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = () => projectData;

export function useProjectData() {
  return useSyncExternalStore(subscribe, getSnapshot);
}

export function saveProject(nextProjectData: ProjectData) {
  projectData = nextProjectData;
  notify();
}

export function getDefaultProjectData() {
  return DEFAULT_PROJECT_DATA;
}

// Maps API response data into the store's ProjectData shape
export function mapApiToProjectData(apiData: {
  name: string;
  type: string;
  startDate: string | null;
  endDate: string | null;
  numFloors: number;
  unitPerFloor?: number;
  roomsPerFloor?: number;
  budget: number;
  location: string;
  description: string;
  isWholeHouse: boolean;
  houseSections: string[];
  status?: string;
  client?: { companyName?: string };
}): ProjectData {
  return {
    projectName: apiData.name,
    company: apiData.client?.companyName ?? "",
    startDate: apiData.startDate ?? "",
    endDate: apiData.endDate ?? "",
  projectType:
      apiData.type === "apartment"
        ? "Apartment Building"
        : apiData.type === "house"
          ? "House"
          : apiData.type === "commercial"
            ? "Commercial"
            : apiData.type === "industrial"
              ? "Industrial"
              : "House",
    floors: String(apiData.numFloors),
    roomsPerFloor: String(apiData.unitPerFloor ?? apiData.roomsPerFloor ?? 0),
    budgetEnabled: apiData.budget > 0,
    budget: String(apiData.budget),
    location: apiData.location,
    description: apiData.description,
    houseScope: apiData.isWholeHouse ? "whole" : "sections",
    selectedSections: apiData.houseSections ?? [],
    status: apiData.status,
  };
}
