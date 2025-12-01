"use client";

import { useEffect, useState } from "react";
import { getSessionUser } from "@/app/actions";

type SessionUser = {
  id: string;
  email: string;
  username: string;
} | null;

export function useSession() {
  const [user, setUser] = useState<SessionUser>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      try {
        const sessionUser = await getSessionUser();
        setUser(sessionUser);
      } catch (error) {
        console.error("Failed to fetch session", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, []);

  return { user, loading };
}

