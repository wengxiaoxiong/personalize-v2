import { useEffect, useState, useCallback } from "react";

export function usePaneState(initialVisible = false) {
  const [isDesktop, setIsDesktop] = useState(false);
  const [visible, setVisible] = useState(initialVisible);

  useEffect(() => {
    const update = () => setIsDesktop(window.innerWidth >= 1024);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const toggle = useCallback((value?: boolean) => {
    setVisible((prev) => (typeof value === "boolean" ? value : !prev));
  }, []);

  return {
    isDesktop,
    visible,
    toggle,
  };
}
