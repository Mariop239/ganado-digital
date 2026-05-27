import { WifiOff } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { cn } from "@/lib/utils";

type Props = Omit<ButtonProps, "type" | "children"> & {
  label: string;
  submitting?: boolean;
};

/**
 * Botón de submit que se deshabilita y avisa cuando no hay conexión a internet,
 * para evitar perder datos enviando mutaciones a Supabase sin red.
 */
export function OfflineAwareSubmit({
  label,
  submitting,
  disabled,
  size = "lg",
  className,
  ...rest
}: Props) {
  const { offline } = useNetworkStatus();
  return (
    <Button
      type="submit"
      size={size}
      disabled={offline || submitting || disabled}
      title={offline ? "Sin conexión — no se pueden guardar cambios" : undefined}
      className={cn("min-h-12", className)}
      {...rest}
    >
      {offline ? (
        <>
          <WifiOff className="mr-2 h-4 w-4" /> Sin conexión
        </>
      ) : (
        label
      )}
    </Button>
  );
}