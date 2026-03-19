import { z } from 'zod';

export const createEndpointSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  forwardingUrl: z.string().url().optional(),
});

export const updateEndpointSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  forwardingUrl: z.string().url().optional(),
  isActive: z.boolean().optional(),
});

export type CreateEndpointInput = z.infer<typeof createEndpointSchema>;
export type UpdateEndpointInput = z.infer<typeof updateEndpointSchema>;
