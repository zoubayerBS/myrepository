"use client"
import { cn } from "@/lib/utils"

import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { CheckCircle2, AlertCircle, Info, Bell } from "lucide-react"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        const Icon = variant === 'destructive' ? AlertCircle : (title?.toLowerCase().includes('succès') || title?.toLowerCase().includes('réussie')) ? CheckCircle2 : Bell;

        return (
          <Toast key={id} variant={variant} {...props}>
            <div className="flex gap-4">
              <div className={cn(
                "p-2 rounded-xl h-fit",
                variant === 'destructive' ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
              )}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="grid gap-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
