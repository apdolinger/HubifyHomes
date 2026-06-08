import { useCallback, useEffect, useState } from "react";
import { driver, type DriveStep } from "driver.js";
import { prefStorage } from "@/lib/cookieConsent";

export type TourStep = DriveStep;

export function useTour(tourKey: string, steps: TourStep[]) {
  const storageKey = `tour_completed_${tourKey}`;

  const [hasCompleted, setHasCompleted] = useState<boolean>(() => {
    return prefStorage.getItem(storageKey) === "1";
  });

  useEffect(() => {
    const stored = prefStorage.getItem(storageKey);
    setHasCompleted(stored === "1");
  }, [storageKey]);

  const startTour = useCallback(() => {
    const driverObj = driver({
      showProgress: true,
      animate: true,
      overlayOpacity: 0.55,
      stagePadding: 8,
      stageRadius: 8,
      allowClose: true,
      nextBtnText: "Next →",
      prevBtnText: "← Back",
      doneBtnText: "Done",
      onDestroyed: () => {
        prefStorage.setItem(storageKey, "1");
        setHasCompleted(true);
      },
      steps,
    });
    driverObj.drive();
  }, [steps, storageKey]);

  return { startTour, hasCompleted };
}
