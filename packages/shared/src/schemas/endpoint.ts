import { z } from 'zod';

export const createEndpointSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(100, 'Name must be at most 100 characters'),
  description: z
    .string()
    .trim()
    .max(500, 'Description must be at most 500 characters')
    .optional(),
  forwardingUrl: z.string().url('Enter a valid URL').optional(),
  webhookSecret: z
    .string()
    .trim()
    .max(2048, 'Webhook secret must be at most 2048 characters')
    .optional(),
});

export const updateEndpointSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(100, 'Name must be at most 100 characters')
    .optional(),
  description: z
    .union([
      z
        .string()
        .trim()
        .max(500, 'Description must be at most 500 characters'),
      z.null(),
    ])
    .optional(),
  forwardingUrl: z
    .union([
      z.string().url('Enter a valid URL'),
      z.null(),
    ])
    .optional(),
  webhookSecret: z
    .union([
      z
        .string()
        .trim()
        .max(2048, 'Webhook secret must be at most 2048 characters'),
      z.null(),
    ])
    .optional(),
  isActive: z.boolean().optional(),
});

export type CreateEndpointInput = z.infer<typeof createEndpointSchema>;
export type UpdateEndpointInput = z.infer<typeof updateEndpointSchema>;
