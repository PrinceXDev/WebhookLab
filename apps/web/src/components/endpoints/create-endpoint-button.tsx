"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createEndpointSchema } from "@webhooklab/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import { apiClient } from "@/lib/api-client";

type FieldKey = "name" | "description" | "webhookSecret";

type FieldErrors = Partial<Record<FieldKey, string>>;

function fieldError(
  fieldErrors: FieldErrors,
  key: FieldKey,
): string | undefined {
  return fieldErrors[key];
}

export function CreateEndpointButton() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: {
      name: string;
      description?: string;
      webhookSecret?: string;
    }) => apiClient.post("/api/endpoints", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["endpoints"] });
      setOpen(false);
      setName("");
      setDescription("");
      setWebhookSecret("");
      setFieldErrors({});
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

  const clearFieldError = (key: FieldKey) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setFieldErrors({});
      createMutation.reset();
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const parsed = createEndpointSchema.safeParse({
      name,
      description: description.trim() === "" ? undefined : description,
      webhookSecret: webhookSecret.trim() === "" ? undefined : webhookSecret,
    });

    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      setFieldErrors({
        name: flat.name?.[0],
        description: flat.description?.[0],
        webhookSecret: flat.webhookSecret?.[0],
      });
      return;
    }

    setFieldErrors({});
    createMutation.mutate({
      name: parsed.data.name,
      description: parsed.data.description,
      webhookSecret: parsed.data.webhookSecret,
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Endpoint
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Webhook Endpoint</DialogTitle>
          <DialogDescription>
            Generate a unique URL to receive webhooks
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="name">
              Name{" "}
              <span className="text-destructive" aria-hidden="true">
                *
              </span>
            </Label>
            <Input
              id="name"
              placeholder="My API Webhooks"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                clearFieldError("name");
              }}
              aria-required
              aria-invalid={!!fieldError(fieldErrors, "name")}
              aria-describedby={
                fieldError(fieldErrors, "name") ? "name-error" : undefined
              }
              className={cn(
                fieldError(fieldErrors, "name") && "border-destructive",
              )}
            />
            {fieldError(fieldErrors, "name") ? (
              <p
                id="name-error"
                className="text-sm text-destructive"
                role="alert"
              >
                {fieldError(fieldErrors, "name")}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="Webhooks from Stripe payment integration"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                clearFieldError("description");
              }}
              aria-invalid={!!fieldError(fieldErrors, "description")}
              aria-describedby={
                fieldError(fieldErrors, "description")
                  ? "description-error"
                  : undefined
              }
              className={cn(
                fieldError(fieldErrors, "description") && "border-destructive",
              )}
            />
            {fieldError(fieldErrors, "description") ? (
              <p
                id="description-error"
                className="text-sm text-destructive"
                role="alert"
              >
                {fieldError(fieldErrors, "description")}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="webhookSecret">Webhook Secret</Label>
            <Input
              id="webhookSecret"
              type="password"
              placeholder="whsec_... (for signature verification)"
              value={webhookSecret}
              onChange={(e) => {
                setWebhookSecret(e.target.value);
                clearFieldError("webhookSecret");
              }}
              aria-invalid={!!fieldError(fieldErrors, "webhookSecret")}
              aria-describedby={
                fieldError(fieldErrors, "webhookSecret")
                  ? "webhookSecret-error"
                  : undefined
              }
              className={cn(
                fieldError(fieldErrors, "webhookSecret") &&
                  "border-destructive",
              )}
            />
            {fieldError(fieldErrors, "webhookSecret") ? (
              <p
                id="webhookSecret-error"
                className="text-sm text-destructive"
                role="alert"
              >
                {fieldError(fieldErrors, "webhookSecret")}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Required for verifying signatures from Stripe, GitHub, or
                Shopify
              </p>
            )}
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Creating..." : "Create Endpoint"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
