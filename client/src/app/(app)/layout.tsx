import Navbar from '@/components/Navbar';
import { ToastContainer } from '@/components/Toast';
import { AuthTokenInjector } from '@/components/AuthTokenInjector';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AuthTokenInjector />
      <Navbar />
      <div style={{ display: 'flex', flex: 1, minHeight: 'calc(100vh - 52px)', flexDirection: 'column' }}>
        {children}
      </div>
      <ToastContainer />
    </>
  );
}
