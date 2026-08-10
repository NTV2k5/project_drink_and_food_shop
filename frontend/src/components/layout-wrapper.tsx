'use client';

import { usePathname } from 'next/navigation';
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Chatbot } from "@/components/layout/chatbot";

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Kiểm tra xem trang hiện tại có phải là bản đồ không
  const isMap = pathname?.endsWith('/map');

  if (isMap) {
    // Chỉ hiển thị phần con (bản đồ), bỏ qua toàn bộ header, footer, chatbot dư thừa
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      <main className="pb-20 md:pb-0">{children}</main>
      <Footer />
      <BottomNav />
      <Chatbot />
    </>
  );
}
