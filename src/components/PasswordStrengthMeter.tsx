import { useMemo } from "react";
import { Progress } from "@/components/ui/progress";
import { Check, X } from "lucide-react";

interface PasswordStrengthMeterProps {
  password: string;
}

export const PasswordStrengthMeter = ({ password }: PasswordStrengthMeterProps) => {
  const checks = useMemo(() => {
    return {
      length: password.length >= 3,
      numeric: /^[0-9]+$/.test(password),
    };
  }, [password]);

  const strength = useMemo(() => {
    const score = Object.values(checks).filter(Boolean).length;
    return {
      score,
      percentage: (score / 2) * 100,
      label: score === 0 ? "" : score === 1 ? "Incompleta" : "Válida",
      color: score === 0 ? "" : score === 1 ? "bg-warning" : "bg-success",
    };
  }, [checks]);

  if (!password) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Progress value={strength.percentage} className="h-2" />
        {strength.label && (
          <span className="text-xs font-medium text-muted-foreground min-w-[48px]">
            {strength.label}
          </span>
        )}
      </div>
      
      <div className="space-y-1">
        <RequirementItem met={checks.length} text="Mínimo de 3 caracteres" />
        <RequirementItem met={checks.numeric} text="Apenas números" />
      </div>
    </div>
  );
};

const RequirementItem = ({ met, text }: { met: boolean; text: string }) => (
  <div className="flex items-center gap-2 text-xs">
    {met ? (
      <Check className="w-3 h-3 text-success" />
    ) : (
      <X className="w-3 h-3 text-muted-foreground" />
    )}
    <span className={met ? "text-success" : "text-muted-foreground"}>
      {text}
    </span>
  </div>
);
