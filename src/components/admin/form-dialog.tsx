"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Konten form (fields). Form action di-handle di dalam children. */
  children: React.ReactNode;
  /** Tombol submit di footer — default: tombol "Simpan" type submit. */
  submitLabel?: string;
  isSubmitting?: boolean;
  isDismissable?: boolean;
}

/**
 * Dialog form admin — wrapper Dialog shadcn (react-aria).
 * Anak diharapkan <form action={...}> agar tombol Simpan submit form-nya.
 */
export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  submitLabel = "Simpan",
  isSubmitting = false,
  isDismissable = true,
}: FormDialogProps) {
  return (
    <Dialog
      isOpen={open}
      onOpenChange={onOpenChange}
      isDismissable={isDismissable}
    >
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        {description ? (
          <DialogDescription>{description}</DialogDescription>
        ) : null}
      </DialogHeader>
      {children}
      <DialogFooter>
        <DialogClose
          type="button"
          variant="outline"
          isDisabled={isSubmitting}
          onPress={() => onOpenChange(false)}
        >
          Batal
        </DialogClose>
        <Button type="submit" isDisabled={isSubmitting}>
          {isSubmitting ? "Menyimpan…" : submitLabel}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
