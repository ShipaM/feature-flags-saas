import { z } from "zod";

// Reusable ID validation
export const id = z.number().int().positive();
