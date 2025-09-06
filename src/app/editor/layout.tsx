import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "License Plate Designer - Editor",
  description: "Design custom license plates with our visual editor",
};

export default function EditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen w-screen overflow-hidden bg-gray-50">
      {children}
    </div>
  );
}
