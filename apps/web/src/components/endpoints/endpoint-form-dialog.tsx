"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createEndpointSchema,
  updateEndpointSchema,
  type UpdateEndpointInput,
} from "@webhooklab/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import type { EndpointRecord } from "@/types/endpoint";

type FieldKey = "name" | "description" | "forwardingUrl" | "webhookSecret";

type FieldErrors = Partial<Record<FieldKey, string>>;

const getSubmitButtonText = (isPending: boolean, isEdit: boolean): string => {
  if (isPending) {
    return isEdit ? "Saving…" : "Creating...";
  }
  return isEdit ? "Save changes" : "Create Endpoint";
};

interface EndpointFormDialogProps {
  mode: "create" | "edit";
  endpoint?: EndpointRecord;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormState {
  name: string;
  description: string;
  forwardingUrl: string;
  webhookSecret: string;
  isActive: boolean;
  removeWebhookSecret: boolean;
}

const initialFormState: FormState = {
  name: "",
  description: "",
  forwardingUrl: "",
  webhookSecret: "",
  isActive: true,
  removeWebhookSecret: false,
};

const buildUpdatePayload = (form: FormState): UpdateEndpointInput => {
  const payload: UpdateEndpointInput = {
    name: form.name,
    description: form.description.trim() === "" ? null : form.description.trim(),
    forwardingUrl:
      form.forwardingUrl.trim() === "" ? null : form.forwardingUrl.trim(),
    isActive: form.isActive,
  };

  if (form.removeWebhookSecret) {
    payload.webhookSecret = null;
  } else if (form.webhookSecret.trim() !== "") {
    payload.webhookSecret = form.webhookSecret.trim();
  }

  return payload;
};

const buildCreatePayload = (form: FormState) => ({
  name: form.name,
  description:
    form.description.trim() === "" ? undefined : form.description.trim(),
  forwardingUrl:
    form.forwardingUrl.trim() === "" ? undefined : form.forwardingUrl.trim(),
  webhookSecret:
    form.webhookSecret.trim() === "" ? undefined : form.webhookSecret.trim(),
});

const extractFieldErrors = (
  flat: Partial<Record<string, string[] | undefined>>,
): FieldErrors => ({
  name: flat.name?.[0],
  description: flat.description?.[0],
  forwardingUrl: flat.forwardingUrl?.[0],
  webhookSecret: flat.webhookSecret?.[0],
});

interface FormFieldProps {
  id: string;
  label: string;
  required?: boolean;
  type?: string;
  placeholder?: string;
  value: string;
  disabled?: boolean;
  error?: string;
  helpText?: string;
  onChange: (value: string) => void;
}

const FormField = ({
  id,
  label,
  required,
  type = "text",
  placeholder,
  value,
  disabled,
  error,
  helpText,
  onChange,
}: Readonly<FormFieldProps>) => (
  <div className="space-y-2">
    <Label htmlFor={id}>
      {label}
      {required ? (
        <>
          {" "}
          <span className="text-destructive" aria-hidden="true">
            *
          </span>
        </>
      ) : null}
    </Label>
    <Input
      id={id}
      type={type}
      autoComplete={type === "password" ? "off" : undefined}
      placeholder={placeholder}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      aria-required={required}
      aria-invalid={!!error}
      className={cn(error && "border-destructive")}
    />
    {error && (
      <p className="text-sm text-destructive" role="alert">
        {error}
      </p>
    )}
    {!error && helpText && (
      <p className="text-xs text-muted-foreground">{helpText}</p>
    )}
  </div>
);

export const EndpointFormDialog = ({
  mode,
  endpoint,
  open,
  onOpenChange,
}: Readonly<EndpointFormDialogProps>) => {
  const isEdit = mode === "edit";
  const queryClient = useQueryClient();

  const [form, setForm] = useState<FormState>(initialFormState);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (!open) return;

    if (isEdit && endpoint) {
      setForm({
        name: endpoint.name,
        description: endpoint.description ?? "",
        forwardingUrl: endpoint.forwardingUrl ?? "",
        webhookSecret: "",
        isActive: endpoint.isActive,
        removeWebhookSecret: false,
      });
    } else {
      setForm(initialFormState);
    }
    setFieldErrors({});
  }, [open, isEdit, endpoint]);

  const createMutation = useMutation({
    mutationFn: (data: {
      name: string;
      description?: string;
      forwardingUrl?: string;
      webhookSecret?: string;
    }) => apiClient.post<EndpointRecord>("/api/endpoints", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["endpoints"] });
      onOpenChange(false);
      toast({ title: "Endpoint created" });
    },
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Could not create endpoint",
        description:
          err instanceof Error ? err.message : "Something went wrong",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateEndpointInput) =>
      apiClient.patch<EndpointRecord>(`/api/endpoints/${endpoint!.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["endpoints"] });
      onOpenChange(false);
      toast({ title: "Endpoint updated" });
    },
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Could not update endpoint",
        description:
          err instanceof Error ? err.message : "Something went wrong",
      });
    },
  });

  const mutation = isEdit ? updateMutation : createMutation;

  const clearFieldError = (key: FieldKey) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (!next) {
      setFieldErrors({});
      mutation.reset();
    }
  };

  const updateField = <K extends keyof FormState>(
    key: K,
    value: FormState[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    clearFieldError(key as FieldKey);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isEdit) {
      const payload = buildUpdatePayload(form);
      const parsed = updateEndpointSchema.safeParse(payload);

      if (!parsed.success) {
        setFieldErrors(extractFieldErrors(parsed.error.flatten().fieldErrors));
        return;
      }

      setFieldErrors({});
      updateMutation.mutate(parsed.data);
    } else {
      const payload = buildCreatePayload(form);
      const parsed = createEndpointSchema.safeParse(payload);

      if (!parsed.success) {
        setFieldErrors(extractFieldErrors(parsed.error.flatten().fieldErrors));
        return;
      }

      setFieldErrors({});
      createMutation.mutate(parsed.data);
    }
  };

  const hasSavedSecret = isEdit && Boolean(endpoint?.webhookSecret);
  const formId = isEdit ? `edit-${endpoint?.id}` : "create";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit endpoint" : "Create Webhook Endpoint"}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? (
              <>
                Update name, forwarding URL, signing secret, or status. Webhook
                URL slug stays the same:{" "}
                <span className="font-mono text-foreground">
                  {endpoint?.slug}
                </span>
              </>
            ) : (
              "Generate a unique URL to receive webhooks"
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <FormField
            id={`${formId}-name`}
            label="Name"
            required
            placeholder="My API Webhooks"
            value={form.name}
            error={fieldErrors.name}
            onChange={(value) => updateField("name", value)}
          />

          <FormField
            id={`${formId}-description`}
            label="Description"
            placeholder="Webhooks from Stripe payment integration"
            value={form.description}
            error={fieldErrors.description}
            onChange={(value) => updateField("description", value)}
          />

          {isEdit ? (
            <FormField
              id={`${formId}-forward`}
              label="Forwarding URL"
              type="url"
              placeholder="https://example.com/webhook"
              value={form.forwardingUrl}
              error={fieldErrors.forwardingUrl}
              helpText="Leave empty to clear. Used when you add replay/forward logic on the server."
              onChange={(value) => updateField("forwardingUrl", value)}
            />
          ) : null}

          <div className="space-y-2">
            <Label htmlFor={`${formId}-secret`}>
              {isEdit ? "Webhook signing secret" : "Webhook Secret"}
            </Label>
            <Input
              id={`${formId}-secret`}
              type="password"
              autoComplete="off"
              placeholder={
                isEdit
                  ? "Enter new secret to replace the current one"
                  : "whsec_... (for signature verification)"
              }
              value={form.webhookSecret}
              disabled={form.removeWebhookSecret}
              onChange={(e) => updateField("webhookSecret", e.target.value)}
              aria-invalid={!!fieldErrors.webhookSecret}
              className={cn(fieldErrors.webhookSecret && "border-destructive")}
            />
            {hasSavedSecret ? (
              <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={form.removeWebhookSecret}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setForm((prev) => ({
                      ...prev,
                      removeWebhookSecret: checked,
                      webhookSecret: checked ? "" : prev.webhookSecret,
                    }));
                    clearFieldError("webhookSecret");
                  }}
                  className="h-4 w-4 rounded border-input"
                />
                Remove saved signing secret
              </label>
            ) : (
              <p className="text-xs text-muted-foreground">
                {isEdit
                  ? "Optional. Used to verify signatures from Stripe, GitHub, or Shopify."
                  : "Required for verifying signatures from Stripe, GitHub, or Shopify"}
              </p>
            )}
            {fieldErrors.webhookSecret ? (
              <p className="text-sm text-destructive" role="alert">
                {fieldErrors.webhookSecret}
              </p>
            ) : null}
          </div>

          {isEdit ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Status</span>
              <Button
                type="button"
                variant={form.isActive ? "default" : "secondary"}
                size="sm"
                onClick={() => updateField("isActive", !form.isActive)}
              >
                {form.isActive ? "Active" : "Inactive"}
              </Button>
            </div>
          ) : null}

          <Button
            type="submit"
            className="w-full"
            disabled={mutation.isPending}
          >
            {getSubmitButtonText(mutation.isPending, isEdit)}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
