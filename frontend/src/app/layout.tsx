import type { Metadata } from 'next';
import './globals.css';
import { SocketProvider } from '../context/SocketContext';
import { AppShell } from '../components/AppShell';
import { ToastContainer } from '../components/ToastContainer';

export const metadata: Metadata = {
  title: 'Nexus Inventory | Automated Reorder & Stock Operations',
  description:
    'Real-time automated inventory tracking and intelligent reorder system with OTP authorization, BullMQ asynchronous workers, and live Socket.IO feeds.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-white text-black min-h-screen antialiased selection:bg-black selection:text-white">
        <SocketProvider>
          <AppShell>{children}</AppShell>
          <ToastContainer />
        </SocketProvider>
      </body>
    </html>
  );
}
