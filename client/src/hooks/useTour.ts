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
    let reachedLastStep = false;

    const driverRef: { current: ReturnType<typeof driver> | null } = { current: null };

    driverRef.current = driver({
      showProgress: true,
      animate: true,
      overlayOpacity: 0.55,
      stagePadding: 8,
      stageRadius: 8,
      allowClose: true,
      nextBtnText: "Next →",
      prevBtnText: "← Back",
      doneBtnText: "Done",
      onDestroyStarted: () => {
        if (driverRef.current?.isLastStep()) {
          reachedLastStep = true;
        }
      },
      onDestroyed: () => {
        if (reachedLastStep) {
          prefStorage.setItem(storageKey, "1");
          setHasCompleted(true);
        }
      },
      steps,
    });

    driverRef.current.drive();
  }, [steps, storageKey]);

  return { startTour, hasCompleted };
}
