import { z } from "zod";

export const ContactFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  email: z.string().email("Invalid email address"),
  message: z
    .string()
    .min(5, "Message must be at least 5 characters")
    .max(2000, "Message is too long"),
});
