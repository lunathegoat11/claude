import { z } from "zod";

export const emailSchema = z.preprocess(
  (v) => (typeof v === "string" ? v.trim().toLowerCase() : v),
  z
    .string({ required_error: "Email is required" })
    .min(1, "Email is required")
    .max(254)
    .email("Enter a valid email address"),
);

export const passwordSchema = z
  .string({ required_error: "Password is required" })
  .min(10, "Use at least 10 characters")
  .max(128, "Use 128 characters or fewer")
  .refine(
    (p) => /[a-zA-Z]/.test(p) && /[0-9\W_]/.test(p),
    "Include letters and at least one number or symbol",
  );

export const signUpSchema = z.object({
  name: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v),
    z.string().min(1, "Your name is required").max(120),
  ),
  email: emailSchema,
  password: passwordSchema,
  acceptTerms: z.literal("on", {
    errorMap: () => ({ message: "Please accept the Terms of Use and Privacy Policy" }),
  }),
  healthDataConsent: z.literal("on", {
    errorMap: () => ({ message: "Kosha needs your consent to store your health information" }),
  }),
});

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required").max(128),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z
  .object({
    token: z.string().min(10).max(200),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
