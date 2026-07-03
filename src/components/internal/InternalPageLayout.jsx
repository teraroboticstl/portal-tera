import React, { useState } from 'react';
import InternalNav from './InternalNav';
import InternalHeader from './InternalHeader';
import OnlineUsers from './OnlineUsers';
import { usePresence } from './usePresence';
import TerAIChat from '@/components/fll/TerAIChat';

export default function InternalPageLayout({ 
  children, 
  user, 
  currentPage, 
  title,
  showCountdown = true 
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Track presence
  usePresence(user, currentPage);

  return (
    <div className="min-h-screen bg-[#0B0B0D]">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block fixed left-0 top-0 bottom-0 z-50">
        <InternalNav currentPage={currentPage} isAdmin={user?.role === 'admin' || user?.member_role === 'admin'} />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div 
            className="fixed inset-0 bg-black/50" 
            onClick={() => setSidebarOpen(false)} 
          />
          <div className="fixed left-0 top-0 bottom-0">
            <InternalNav 
              currentPage={currentPage} 
              onClose={() => setSidebarOpen(false)}
              isAdmin={user?.role === 'admin' || user?.member_role === 'admin'}
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="lg:ml-64">
        <InternalHeader 
          user={user} 
          title={title}
          onMenuClick={() => setSidebarOpen(true)}
        />

        <main className="p-4 lg:p-8">
          <div className="flex gap-6 items-start">
            <div className="flex-1 min-w-0">
              {children}
            </div>
            {/* Online Users Panel - Desktop only */}
            <div className="hidden xl:block w-56 flex-shrink-0 sticky top-4">
              <OnlineUsers currentUser={user} />
            </div>
          </div>
        </main>
      </div>
      <TerAIChat />
    </div>
  );
}