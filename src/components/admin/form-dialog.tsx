"use client";

import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  isSubmitting?: boolean;
  isDismissable?: boolean;
}

export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  isSubmitting = false,
  isDismissable = true,
}: FormDialogProps) {
  return (
    <Dialog
      isOpen={open}
      onOpenChange={isSubmitting ? () => {} : onOpenChange}
      isDismissable={isDismissable && !isSubmitting}
    >
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        {description ? (
          <DialogDescription>{description}</DialogDescription>
        ) : null}
      </DialogHeader>
      {children}
    </Dialog>
  );
}
