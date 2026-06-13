import Sidebar from './Sidebar.jsx';
import PlanBanner from '../ui/PlanBanner.jsx';
import { Toaster } from 'react-hot-toast';

export default function Layout({ children }) {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <main className="flex-1 ml-56 overflow-hidden flex flex-col">
        <PlanBanner />
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
    </div>
  );
}
