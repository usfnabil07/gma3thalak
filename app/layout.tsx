import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'منصة جمعتهالك — البوابة الأكاديمية',
  description: 'منصة متكاملة بها كل ما يحتاجه طلاب جامعة بدر أسيوط ليتفوقوا — حاسبة GPA، المواد الدراسية، البروفايل الأكاديمي',
  keywords: 'جمعتهالك, جامعة بدر, GPA, أسيوط, طلاب, مواد دراسية',
};

import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { AuthProvider } from '@/components/providers/AuthProvider';
import ChatWidget from '@/components/chat/ChatWidget';
import { ChatProvider } from '@/components/chat/ChatContext';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Alexandria:wght@300;400;500;600;700;800;900&family=Tajawal:wght@300;400;500;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider attribute="data-theme" defaultTheme="light" enableSystem={false}>
          <AuthProvider>
            <ChatProvider>
              {children}
              <ChatWidget />
            </ChatProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
