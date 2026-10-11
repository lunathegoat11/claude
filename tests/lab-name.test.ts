import { describe, expect, it } from "vitest";
import { tidyLabName } from "@/server/extraction/lab-parser";
import { isCameraFileName } from "@/server/services/documents";

describe("tidying a lab name read from a photo", () => {
  it("drops stray marks, rejoins broken words and restores letters hidden by a logo", () => {
    const footer = "Email:admin@anandrishiji.com | Website :anandrishijihospital.com";
    expect(tidyLabName("'h,andrishiji Hospital & Medical Research Cent e", footer)).toBe(
      "Anandrishiji Hospital & Medical Research Centre",
    );
  });
  it("fixes small misreads of common words but leaves real names alone", () => {
    expect(tidyLabName("Sunrise Hospita1 & Research Centre")).toBe(
      "Sunrise Hospita1 & Research Centre",
    );
    expect(tidyLabName("City Pathology Labs")).toBe("City Pathology Labs");
    expect(tidyLabName("Kamala Diagnostlcs")).toBe("Kamala Diagnostics");
    expect(tidyLabName("Apollo Hospitals")).toBe("Apollo Hospitals");
  });
  it("doesn't invent letters without a matching website", () => {
    expect(tidyLabName("andrishiji Hospital")).toBe("Andrishiji Hospital");
  });
});

describe("camera file names", () => {
  it("are recognised so the report's own name can be used instead", () => {
    for (const n of [
      "2",
      "IMG 20250531 103612",
      "WhatsApp Image 2025 05 31 at 10.36.12",
      "PXL 20250531",
      "Screenshot 2025-05-31",
    ])
      expect(isCameraFileName(n)).toBe(true);
    for (const n of ["Blood test May", "KFT LFT Anandrishiji", "Thyroid report"])
      expect(isCameraFileName(n)).toBe(false);
  });
});
