import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, Menu, ChevronDown, User, Settings, LogOut } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { notificationService } from '../../services/notification.service';
import { useAuth } from '../../hooks/useAuth';
import { initials } from '../../utils/formatters';
import clsx from 'clsx';

interface HeaderProps {
  title?: string;
  onMenuClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, onMenuClick }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationService.getUnreadCount(),
    refetchInterval: 60000,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/recommendations?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-banking-border bg-white px-4 shadow-sm">
      {/* Mobile menu button */}
      <button
        onClick={onMenuClick}
        className="lg:hidden text-gray-500 hover:text-gray-700 transition-colors"
      >
        <Menu size={20} />
      </button>

      {/* Page title */}
      {title && (
        <h1 className="hidden md:block text-base font-semibold text-banking-text">{title}</h1>
      )}

      {/* Search */}
      <form onSubmit={handleSearch} className="flex-1 max-w-md">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher recommandations, missions..."
            className="w-full rounded-lg border border-banking-border bg-gray-50 pl-9 pr-4 py-1.5 text-sm text-banking-text placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-secondary transition-colors"
          />
        </div>
      </form>

      <div className="flex items-center gap-2 ml-auto">
        {/* Notifications */}
        <button
          onClick={() => navigate('/notifications')}
          className="relative p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          title="Notifications"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-100 transition-colors"
          >
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary text-white text-xs font-semibold">
              {initials(user?.first_name, user?.last_name)}
            </div>
            <span className="hidden md:block text-sm font-medium text-banking-text">
              {user?.first_name}
            </span>
            <ChevronDown
              size={14}
              className={clsx(
                'text-gray-400 transition-transform',
                userMenuOpen && 'rotate-180'
              )}
            />
          </button>

          {userMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setUserMenuOpen(false)}
              />
              <div className="absolute right-0 top-full mt-2 z-50 w-48 rounded-xl border border-banking-border bg-white shadow-lg py-1">
                <div className="px-4 py-3 border-b border-banking-border">
                  <p className="text-sm font-semibold text-banking-text">{user?.full_name}</p>
                  <p className="text-xs text-banking-muted">{user?.email}</p>
                </div>
                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    navigate('/profile');
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <User size={15} className="text-gray-400" />
                  Mon profil
                </button>
                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    navigate('/admin/parameters');
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Settings size={15} className="text-gray-400" />
                  Paramètres
                </button>
                <div className="border-t border-banking-border mt-1">
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      logout();
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut size={15} />
                    Déconnexion
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
