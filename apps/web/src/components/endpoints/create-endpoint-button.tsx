"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { EndpointFormDialog } from "./endpoint-form-dialog";

export function CreateEndpointButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        New Endpoint
      </Button>
      <EndpointFormDialog mode="create" open={open} onOpenChange={setOpen} />
    </>
  );
}
