import { vi } from "vitest";
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import TwoFactorEnroll from './two-factor-enroll';

describe('TwoFactorEnroll Component', () => {
  beforeEach(() => {
    window.URL.createObjectURL = vi.fn(() => 'mock-url');
    window.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders intro step initially', () => {
    render(<TwoFactorEnroll />);
    expect(screen.getByText(/Set Up Two-Factor Authentication/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Begin Setup/i })).toBeInTheDocument();
  });

  it('navigates to QR step', async () => {
    const user = userEvent.setup();
    render(<TwoFactorEnroll />);
    await user.click(screen.getByRole('button', { name: /Begin Setup/i }));
    expect(screen.getByText(/SCAN QR CODE/i)).toBeInTheDocument();
  });

  it('navigates to verify step', async () => {
    const user = userEvent.setup();
    render(<TwoFactorEnroll />);
    await user.click(screen.getByRole('button', { name: /Begin Setup/i }));
    await user.click(screen.getByRole('button', { name: /I Have Scanned It/i }));
    
    expect(screen.getByLabelText(/Enter the 6-digit code/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Verify Code/i })).toBeDisabled();
  });

  it('handles paste correctly and navigates to recovery', async () => {
    const user = userEvent.setup();
    render(<TwoFactorEnroll />);
    await user.click(screen.getByRole('button', { name: /Begin Setup/i }));
    await user.click(screen.getByRole('button', { name: /I Have Scanned It/i }));
    
    const input = screen.getByLabelText(/Enter the 6-digit code/i);
    // Paste 6 digits
    fireEvent.paste(input, { clipboardData: { getData: () => '123456' } });
    
    expect(input).toHaveValue('123456');
    const verifyButton = screen.getByRole('button', { name: /Verify Code/i });
    expect(verifyButton).toBeEnabled();
    
    await user.click(verifyButton);
    expect(screen.getByText(/Save Your Recovery Codes/i)).toBeInTheDocument();
  });

  it('shows error on invalid code and clears it on input change', async () => {
    const user = userEvent.setup();
    render(<TwoFactorEnroll />);
    await user.click(screen.getByRole('button', { name: /Begin Setup/i }));
    await user.click(screen.getByRole('button', { name: /I Have Scanned It/i }));
    
    const input = screen.getByLabelText(/Enter the 6-digit code/i);
    await user.type(input, '000000');
    
    await user.click(screen.getByRole('button', { name: /Verify Code/i }));
    expect(screen.getByText(/Invalid code/i)).toBeInTheDocument();
    
    await user.type(input, '{backspace}1');
    expect(screen.queryByText(/Invalid code/i)).not.toBeInTheDocument();
  });

  it('completes setup successfully', async () => {
    const user = userEvent.setup();
    const mockOnComplete = vi.fn();
    render(<TwoFactorEnroll onComplete={mockOnComplete} />);
    
    await user.click(screen.getByRole('button', { name: /Begin Setup/i }));
    await user.click(screen.getByRole('button', { name: /I Have Scanned It/i }));
    
    const input = screen.getByLabelText(/Enter the 6-digit code/i);
    fireEvent.paste(input, { clipboardData: { getData: () => '123456' } });
    await user.click(screen.getByRole('button', { name: /Verify Code/i }));
    
    const checkbox = screen.getByRole('checkbox', { name: /I have saved these recovery codes/i });
    const completeButton = screen.getByRole('button', { name: /Complete Setup/i });
    
    expect(completeButton).toBeDisabled();
    await user.click(checkbox);
    expect(completeButton).toBeEnabled();
    
    await user.click(completeButton);
    expect(screen.getByText(/2FA Enabled Successfully/i)).toBeInTheDocument();
    
    await user.click(screen.getByRole('button', { name: /Return to Settings/i }));
    expect(mockOnComplete).toHaveBeenCalled();
  });

  it('has no accessibility violations on intro step', async () => {
    const { container } = render(<TwoFactorEnroll />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
