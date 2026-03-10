"use client";

import LoadingScreen from "@/components/ui/LoadingScreen";

export default function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <LoadingScreen>
      {children}
    </LoadingScreen>
  );
}
