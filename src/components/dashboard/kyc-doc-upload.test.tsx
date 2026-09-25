import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { KycDocUpload } from "./kyc-doc-upload";

function createMockStream() {
  return {
    getTracks: () => [{ stop: vi.fn() }],
  };
}

function setupMocks(shouldFail = false) {
  const mock = shouldFail
    ? vi.fn().mockRejectedValue(new Error("Permission denied"))
    : vi.fn().mockResolvedValue(createMockStream());
  Object.defineProperty(global.navigator, "mediaDevices", {
    value: { getUserMedia: mock },
    configurable: true,
  });
}

describe("KycDocUpload", () => {
  let onCaptureComplete: ReturnType<
    typeof vi.fn<(success: boolean, imageData?: string) => void>
  >;

  beforeEach(() => {
    onCaptureComplete = vi.fn<(success: boolean, imageData?: string) => void>();
    setupMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Initial render (intro step)", () => {
    it("renders the heading and description", () => {
      render(<KycDocUpload onCaptureComplete={onCaptureComplete} />);
      expect(screen.getByText("Upload document")).toBeInTheDocument();
      expect(screen.getByText(/We need a clear photo/)).toBeInTheDocument();
    });

    it("shows Open Camera and Upload a File buttons", () => {
      render(<KycDocUpload onCaptureComplete={onCaptureComplete} />);
      expect(screen.getByRole("button", { name: /Open Camera/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Upload a File/i })).toBeInTheDocument();
    });

    it("renders screen-reader-only description text", () => {
      render(<KycDocUpload onCaptureComplete={onCaptureComplete} />);
      const srText = screen.getByText(/Use your camera to capture/);
      expect(srText).toHaveClass("sr-only");
    });

    it("renders with a custom document label", () => {
      render(<KycDocUpload onCaptureComplete={onCaptureComplete} documentLabel="passport" />);
      expect(screen.getByText("Upload passport")).toBeInTheDocument();
    });

    it("has aria-labelledby on the region", () => {
      render(<KycDocUpload onCaptureComplete={onCaptureComplete} />);
      const region = screen.getByRole("region");
      expect(region).toHaveAttribute("aria-labelledby");
    });
  });

  describe("Camera capture flow", () => {
    beforeEach(() => {
      HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
        drawImage: vi.fn(),
      });
      HTMLCanvasElement.prototype.toDataURL = vi.fn().mockReturnValue("data:image/jpeg;base64,captured");
    });

    it("opens camera when Open Camera is clicked", async () => {
      render(<KycDocUpload onCaptureComplete={onCaptureComplete} />);
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /Open Camera/i }));
      });
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
    });

    it("shows guidance hints during capture", async () => {
      render(<KycDocUpload onCaptureComplete={onCaptureComplete} />);
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /Open Camera/i }));
      });
      expect(screen.getByText("Fit to frame")).toBeInTheDocument();
      expect(screen.getByText("Avoid glare")).toBeInTheDocument();
      expect(screen.getByText("All corners visible")).toBeInTheDocument();
    });

    it("has a capture button during camera mode", async () => {
      render(<KycDocUpload onCaptureComplete={onCaptureComplete} />);
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /Open Camera/i }));
      });
      expect(screen.getByRole("button", { name: /Capture document photo/i })).toBeInTheDocument();
    });

    it("captures frame and goes to preview step", async () => {
      render(<KycDocUpload onCaptureComplete={onCaptureComplete} />);
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /Open Camera/i }));
      });
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /Capture document photo/i }));
      });
      expect(screen.getByText("Confirm document")).toBeInTheDocument();
      expect(screen.getByText("Retake")).toBeInTheDocument();
    });

    it("shows preview image after capture", async () => {
      render(<KycDocUpload onCaptureComplete={onCaptureComplete} />);
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /Open Camera/i }));
      });
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /Capture document photo/i }));
      });
      const img = screen.getByAltText("Preview of captured document");
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute("src", "data:image/jpeg;base64,captured");
    });

    it("completes capture on confirm", async () => {
      render(<KycDocUpload onCaptureComplete={onCaptureComplete} />);
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /Open Camera/i }));
      });
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /Capture document photo/i }));
      });
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /Confirm document/i }));
      });
      expect(screen.getByText("document Captured")).toBeInTheDocument();
      expect(screen.getAllByText(/Your document has been uploaded/).length).toBeGreaterThanOrEqual(1);
      expect(onCaptureComplete).toHaveBeenCalledWith(true, expect.any(String));
    });

    it("shows final captured image thumbnail on complete", async () => {
      render(<KycDocUpload onCaptureComplete={onCaptureComplete} />);
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /Open Camera/i }));
      });
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /Capture document photo/i }));
      });
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /Confirm document/i }));
      });
      expect(screen.getByAltText("Final captured document")).toBeInTheDocument();
    });

    it("has Upload Another button on complete", async () => {
      render(<KycDocUpload onCaptureComplete={onCaptureComplete} />);
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /Open Camera/i }));
      });
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /Capture document photo/i }));
      });
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /Confirm document/i }));
      });
      const resetBtn = screen.getByRole("button", { name: /Upload another document/i });
      expect(resetBtn).toBeInTheDocument();
      await act(async () => {
        fireEvent.click(resetBtn);
      });
      expect(screen.getByText("Upload document")).toBeInTheDocument();
    });
  });

  describe("Retake workflow", () => {
    beforeEach(() => {
      HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
        drawImage: vi.fn(),
      });
      HTMLCanvasElement.prototype.toDataURL = vi.fn().mockReturnValue("data:image/jpeg;base64,captured");
    });

    it("shows retake reason selection when Retake is clicked", async () => {
      render(<KycDocUpload onCaptureComplete={onCaptureComplete} />);
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /Open Camera/i }));
      });
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /Capture document photo/i }));
      });
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /Retake/i }));
      });
      expect(screen.getByText("What went wrong with the photo?")).toBeInTheDocument();
      expect(screen.getByText("Image is blurry")).toBeInTheDocument();
      expect(screen.getByText("Glare or reflection")).toBeInTheDocument();
      expect(screen.getByText("Document is cropped")).toBeInTheDocument();
      expect(screen.getByText("Too dark")).toBeInTheDocument();
      expect(screen.getByText("Wrong angle")).toBeInTheDocument();
      expect(screen.getByText("Other reason")).toBeInTheDocument();
    });

    it("lets user select a retake reason", async () => {
      render(<KycDocUpload onCaptureComplete={onCaptureComplete} />);
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /Open Camera/i }));
      });
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /Capture document photo/i }));
      });
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /Retake/i }));
      });
      const blurryRadio = screen.getByLabelText("Image is blurry");
      await act(async () => {
        fireEvent.click(blurryRadio);
      });
      expect(blurryRadio).toBeChecked();
    });

    it("shows textarea when Other reason is selected", async () => {
      render(<KycDocUpload onCaptureComplete={onCaptureComplete} />);
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /Open Camera/i }));
      });
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /Capture document photo/i }));
      });
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /Retake/i }));
      });
      await act(async () => {
        fireEvent.click(screen.getByLabelText("Other reason"));
      });
      const textarea = screen.getByPlaceholderText("Describe what went wrong...");
      expect(textarea).toBeInTheDocument();
      await act(async () => {
        fireEvent.change(textarea, { target: { value: "Too much shadow" } });
      });
      expect(textarea).toHaveValue("Too much shadow");
    });

    it("retake button is disabled without a reason", async () => {
      render(<KycDocUpload onCaptureComplete={onCaptureComplete} />);
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /Open Camera/i }));
      });
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /Capture document photo/i }));
      });
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /Retake/i }));
      });
      const retakeBtn = screen.getByRole("button", { name: /^Retake$/ });
      expect(retakeBtn).toBeDisabled();
    });

    it("retake button is enabled after selecting a reason", async () => {
      render(<KycDocUpload onCaptureComplete={onCaptureComplete} />);
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /Open Camera/i }));
      });
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /Capture document photo/i }));
      });
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /Retake/i }));
      });
      await act(async () => {
        fireEvent.click(screen.getByLabelText("Glare or reflection"));
      });
      expect(screen.getByRole("button", { name: /^Retake$/ })).not.toBeDisabled();
    });

    it("returns to capture after retake with reason", async () => {
      render(<KycDocUpload onCaptureComplete={onCaptureComplete} />);
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /Open Camera/i }));
      });
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /Capture document photo/i }));
      });
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /Retake/i }));
      });
      await act(async () => {
        fireEvent.click(screen.getByLabelText("Image is blurry"));
      });
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /^Retake$/ }));
      });
      expect(screen.getByRole("button", { name: /Capture document photo/i })).toBeInTheDocument();
    });

    it("skip retake returns to capture without reason", async () => {
      render(<KycDocUpload onCaptureComplete={onCaptureComplete} />);
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /Open Camera/i }));
      });
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /Capture document photo/i }));
      });
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /Retake/i }));
      });
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /Skip & Retake/i }));
      });
      expect(screen.getByRole("button", { name: /Capture document photo/i })).toBeInTheDocument();
    });
  });

  describe("Text-only / file upload mode", () => {
    it("enters text-only mode when Upload a File is clicked", async () => {
      render(<KycDocUpload onCaptureComplete={onCaptureComplete} />);
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /Upload a File/i }));
      });
      expect(screen.getByText(/Text-only mode active/)).toBeInTheDocument();
      expect(screen.getByText("Choose File")).toBeInTheDocument();
    });

    it("has an accessible file input in text-only mode", async () => {
      render(<KycDocUpload onCaptureComplete={onCaptureComplete} />);
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /Upload a File/i }));
      });
      const fileInput = screen.getByLabelText("Select document image file");
      expect(fileInput).toBeInTheDocument();
      expect(fileInput).toHaveAttribute("type", "file");
      expect(fileInput).toHaveAttribute("accept", "image/*");
    });

    it("toggles Text Only button during camera mode", async () => {
      render(<KycDocUpload onCaptureComplete={onCaptureComplete} />);
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /Open Camera/i }));
      });
      const textOnlyBtn = screen.getByRole("button", { name: /Switch to text-only file upload mode/i });
      expect(textOnlyBtn).toBeInTheDocument();
      await act(async () => {
        fireEvent.click(textOnlyBtn);
      });
      expect(screen.getByText(/Text-only mode active/)).toBeInTheDocument();
    });
  });

  describe("Camera error handling", () => {
    beforeEach(() => {
      setupMocks(true);
    });

    it("shows error banner when camera access is denied", async () => {
      render(<KycDocUpload onCaptureComplete={onCaptureComplete} />);
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /Open Camera/i }));
      });
      expect(screen.getAllByText(/Camera access was denied/).length).toBeGreaterThanOrEqual(1);
    });

    it("falls back to text-only mode when camera fails", async () => {
      render(<KycDocUpload onCaptureComplete={onCaptureComplete} />);
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /Open Camera/i }));
      });
      expect(screen.getByText(/Text-only mode active/)).toBeInTheDocument();
    });
  });

  describe("Cancel / reset flow", () => {
    beforeEach(() => {
      HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
        drawImage: vi.fn(),
      });
      HTMLCanvasElement.prototype.toDataURL = vi.fn().mockReturnValue("data:image/jpeg;base64,captured");
    });

    it("Cancel button returns to intro from capture", async () => {
      render(<KycDocUpload onCaptureComplete={onCaptureComplete} />);
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /Open Camera/i }));
      });
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /Restart document upload/i }));
      });
      expect(screen.getByText("Upload document")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Open Camera/i })).toBeInTheDocument();
    });
  });

  describe("Guidance hint interactions", () => {
    beforeEach(() => {
      HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
        drawImage: vi.fn(),
      });
      HTMLCanvasElement.prototype.toDataURL = vi.fn().mockReturnValue("data:image/jpeg;base64,captured");
    });

    it("toggles glare detection simulation", async () => {
      render(<KycDocUpload onCaptureComplete={onCaptureComplete} />);
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /Open Camera/i }));
      });
      const glareBtn = screen.getByRole("button", { name: /Toggle glare detection simulation/i });
      expect(glareBtn).toHaveAttribute("aria-pressed", "false");
      await act(async () => {
        fireEvent.click(glareBtn);
      });
      expect(glareBtn).toHaveAttribute("aria-pressed", "true");
    });

    it("toggles corner visibility simulation", async () => {
      render(<KycDocUpload onCaptureComplete={onCaptureComplete} />);
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /Open Camera/i }));
      });
      const cornersBtn = screen.getByRole("button", { name: /Toggle corner visibility simulation/i });
      expect(cornersBtn).toHaveAttribute("aria-pressed", "false");
      await act(async () => {
        fireEvent.click(cornersBtn);
      });
      expect(cornersBtn).toHaveAttribute("aria-pressed", "true");
    });
  });

  describe("Accessibility", () => {
    it("has a role region with accessible name", () => {
      render(<KycDocUpload onCaptureComplete={onCaptureComplete} />);
      const region = screen.getByRole("region");
      expect(region).toBeInTheDocument();
      expect(region).toHaveAttribute("aria-labelledby");
    });

    it("has a live region for status announcements", () => {
      render(<KycDocUpload onCaptureComplete={onCaptureComplete} />);
      const liveRegion = screen.getByRole("status");
      expect(liveRegion).toBeInTheDocument();
      expect(liveRegion).toHaveAttribute("aria-live", "polite");
    });

    it("has screen-reader-only description during intro", () => {
      render(<KycDocUpload onCaptureComplete={onCaptureComplete} />);
      const srDescription = screen.getByText(/Use your camera to capture/);
      expect(srDescription).toHaveClass("sr-only");
    });

    it("guidance hints have an accessible label on the list", async () => {
      render(<KycDocUpload onCaptureComplete={onCaptureComplete} />);
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /Open Camera/i }));
      });
      const hintList = screen.getByLabelText("Document capture guidance");
      expect(hintList).toBeInTheDocument();
    });

    it("shows guidance hint items", async () => {
      render(<KycDocUpload onCaptureComplete={onCaptureComplete} />);
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /Open Camera/i }));
      });
      const hints = screen.getAllByRole("listitem");
      expect(hints.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("Edge cases", () => {
    it("handles empty documentLabel gracefully", () => {
      render(<KycDocUpload onCaptureComplete={onCaptureComplete} documentLabel="" />);
      expect(screen.getByText("Upload")).toBeInTheDocument();
    });

    it("handles rapid cancel calls without error", async () => {
      HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
        drawImage: vi.fn(),
      });
      HTMLCanvasElement.prototype.toDataURL = vi.fn().mockReturnValue("data:image/jpeg;base64,captured");

      render(<KycDocUpload onCaptureComplete={onCaptureComplete} />);
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /Open Camera/i }));
      });
      const cancelBtn = screen.getByRole("button", { name: /Restart document upload/i });
      await act(async () => {
        fireEvent.click(cancelBtn);
      });
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /Open Camera/i }));
      });
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /Restart document upload/i }));
      });
      expect(screen.getByText("Upload document")).toBeInTheDocument();
    });

    it("allows uploading another and then uploading again", async () => {
      HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
        drawImage: vi.fn(),
      });
      HTMLCanvasElement.prototype.toDataURL = vi.fn().mockReturnValue("data:image/jpeg;base64,captured");

      render(<KycDocUpload onCaptureComplete={onCaptureComplete} />);
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /Open Camera/i }));
      });
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /Capture document photo/i }));
      });
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /Confirm document/i }));
      });
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /Upload another document/i }));
      });
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /Open Camera/i }));
      });
      expect(screen.getByRole("button", { name: /Capture document photo/i })).toBeInTheDocument();
    });
  });
});
