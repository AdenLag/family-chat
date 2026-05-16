"use client";

type Props = {
  children: React.ReactNode;
};

export default function HomeScreen({ children }: Props) {
  return (
    <main className="min-h-screen bg-black text-white">
      {children}
    </main>
  );
}

