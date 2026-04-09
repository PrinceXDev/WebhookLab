export const getWebhookUrl = (slug: string): string => {
  return `${process.env.NEXT_PUBLIC_API_URL}/hook/${slug}`;
};

export const ENDPOINT_STATUS = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
} as const;

export const NO_DESCRIPTION_TEXT = "No description";
