import { LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTour, type TourStep } from "@/hooks/useTour";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TourButtonProps {
  tourKey: string;
  steps: TourStep[];
  className?: string;
}

export function TourButton({ tourKey, steps, className }: TourButtonProps) {
  const { startTour, hasCompleted } = useTour(tourKey, steps);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={startTour}
            className={className}
            aria-label={hasCompleted ? "Replay page tour" : "Start page tour"}
            data-testid={`tour-button-${tourKey}`}
          >
            <LifeBuoy
              className={`w-5 h-5 transition-colors ${
                hasCompleted
                  ? "text-slate-400 hover:text-slate-600"
                  : "text-teal-500 hover:text-teal-700"
              }`}
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {hasCompleted ? "Replay tour" : "Take a tour"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
