import { useState, type Dispatch, type SetStateAction } from "react";
import type { PersonaParseResult } from "@/lib/persona-parser";

export type PersonaStateValues = {
  started: boolean;
  inputValue: string;
  selectedOptions: string[];
  pdfFile: File | null;
  personaDraft: string;
  finalPersona: PersonaParseResult | null;
  showSaveDialog: boolean;
  sidecarOpen: boolean;
  errors: string | null;
};

export type PersonaStateApi = {
  state: PersonaStateValues;
  setStarted: Dispatch<SetStateAction<boolean>>;
  setInputValue: Dispatch<SetStateAction<string>>;
  setSelectedOptions: Dispatch<SetStateAction<string[]>>;
  setPdfFile: Dispatch<SetStateAction<File | null>>;
  setPersonaDraft: Dispatch<SetStateAction<string>>;
  setFinalPersona: Dispatch<SetStateAction<PersonaParseResult | null>>;
  setShowSaveDialog: Dispatch<SetStateAction<boolean>>;
  setSidecarOpen: Dispatch<SetStateAction<boolean>>;
  setErrors: Dispatch<SetStateAction<string | null>>;
  reset: () => void;
};

export function usePersonaState(): PersonaStateApi {
  const [started, setStarted] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [personaDraft, setPersonaDraft] = useState("");
  const [finalPersona, setFinalPersona] = useState<PersonaParseResult | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [sidecarOpen, setSidecarOpen] = useState(false);
  const [errors, setErrors] = useState<string | null>(null);

  const reset = () => {
    setStarted(false);
    setInputValue("");
    setSelectedOptions([]);
    setPdfFile(null);
    setPersonaDraft("");
    setFinalPersona(null);
    setShowSaveDialog(false);
    setSidecarOpen(false);
    setErrors(null);
  };

  return {
    state: {
      started,
      inputValue,
      selectedOptions,
      pdfFile,
      personaDraft,
      finalPersona,
      showSaveDialog,
      sidecarOpen,
      errors,
    },
    setStarted,
    setInputValue,
    setSelectedOptions,
    setPdfFile,
    setPersonaDraft,
    setFinalPersona,
    setShowSaveDialog,
    setSidecarOpen,
    setErrors,
    reset,
  };
}
