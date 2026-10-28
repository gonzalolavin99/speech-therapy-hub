import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

const { maybeSingle, single } = vi.hoisted(() => ({ maybeSingle: vi.fn(), single: vi.fn() }));

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "user-1" } }) }));
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle, single }) }) }),
  },
}));

import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";

beforeEach(() => {
  maybeSingle.mockReset();
  single.mockReset();
});

describe("useGoogleCalendar", () => {
  it("con una cuenta nueva sin perfil no falla (maybeSingle, sin 406)", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    const { result } = renderHook(() => useGoogleCalendar());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isConnected).toBe(false);
    expect(maybeSingle).toHaveBeenCalled();
    expect(single).not.toHaveBeenCalled();
  });

  it("detecta una conexión vigente", async () => {
    maybeSingle.mockResolvedValue({
      data: { google_calendar_token: { access_token: "t", expires_at: Date.now() + 60_000 } },
      error: null,
    });
    const { result } = renderHook(() => useGoogleCalendar());
    await waitFor(() => expect(result.current.isConnected).toBe(true));
  });
});
