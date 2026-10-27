export const Language = {
  VI: "vi",
  EN: "en",
} as const;

export type Language = (typeof Language)[keyof typeof Language];
