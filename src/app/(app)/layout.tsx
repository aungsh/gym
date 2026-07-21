import { Nav } from "@/components/nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Nav />
      <main className="flex-1 px-6 md:px-12 pb-24 md:pb-12 max-w-5xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
