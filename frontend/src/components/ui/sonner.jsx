import { useTheme } from "next-themes"
import { Toaster as Sonner, toast } from "sonner"

const Toaster = ({
  ...props
}) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:rounded-[24px] group-[.toaster]:border-border/80 group-[.toaster]:bg-[rgba(255,255,255,0.94)] group-[.toaster]:px-4 group-[.toaster]:py-3 group-[.toaster]:text-foreground group-[.toaster]:shadow-[0_24px_60px_-32px_rgba(18,37,29,0.35)] group-[.toaster]:backdrop-blur-xl",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props} />
  );
}

export { Toaster, toast }
