"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "next-themes";
import { useSession } from "next-auth/react";
import { updateUserTheme } from "@/app/actions/settings";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const ThemeSwitch = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  const { resolvedTheme, setTheme } = useTheme();
  const { data: session } = useSession();
  const [checked, setChecked] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => setChecked(resolvedTheme === "dark"), [resolvedTheme]);

  // Sincronizar tema con la sesión al montar por primera vez
  useEffect(() => {
    if (session?.user && (session.user as any).theme && mounted) {
      const userTheme = (session.user as any).theme;
      if (userTheme !== resolvedTheme) {
        setTheme(userTheme);
      }
    }
  }, [session, mounted]);

  const handleCheckedChange = useCallback(
    async (isChecked: boolean) => {
      const newTheme = isChecked ? "dark" : "light";
      setChecked(isChecked);
      setTheme(newTheme);
      
      // Guardar en la base de datos si hay sesión
      if (session?.user) {
        try {
          await updateUserTheme((session.user as any).id, newTheme);
        } catch (error) {
          console.error('Error saving theme preference:', error);
        }
      }
    },
    [setTheme, session],
  );

  if (!mounted) return null;

  return (
    <div
      className={cn(
        "relative flex items-center justify-center", // center the whole control
        "h-9 w-20", // track sized to hug the icons
        className
      )}
      {...props}
    >
      {/* The real shadcn Switch (full-size, same structure) */}
      <Switch
        checked={checked}
        onCheckedChange={handleCheckedChange}
        className={cn(
          // root (track)
          "peer absolute inset-0 h-full w-full rounded-full bg-[#111111]/10 dark:bg-white/10 transition-colors border-none",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          // thumb size & z-index
          "data-[state=unchecked]:bg-[#DEDAD0] data-[state=checked]:bg-[#111111]/40",
          "[&>span]:h-7 [&>span]:w-7 [&>span]:rounded-full [&>span]:bg-white dark:[&>span]:bg-[#EDE9E0] [&>span]:shadow-md [&>span]:z-10",
          // translate distances
          "data-[state=unchecked]:[&>span]:translate-x-1",
          "data-[state=checked]:[&>span]:translate-x-[44px]" 
        )}
      />

      {/* Icons overlaid inside the track */}
      <span
        className={cn(
          "pointer-events-none absolute left-2 inset-y-0 z-0",
          "flex items-center justify-center"
        )}
      >
        <SunIcon
          size={16}
          className={cn(
            "transition-all duration-200 ease-out",
            checked ? "text-[#6F6F6F]/50" : "text-[#111111] scale-110"
          )}
        />
      </span>

      <span
        className={cn(
          "pointer-events-none absolute right-2 inset-y-0 z-0",
          "flex items-center justify-center"
        )}
      >
        <MoonIcon
          size={16}
          className={cn(
            "transition-all duration-200 ease-out",
            checked ? "text-[#F36A2D] scale-110" : "text-[#6F6F6F]/50"
          )}
        />
      </span>
    </div>
  );
};

export default ThemeSwitch;
