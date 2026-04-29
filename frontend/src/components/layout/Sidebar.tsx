import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  CheckSquare,
  Paperclip,
  BarChart2,
  Bell,
  Settings,
  Users,
  Database,
  GitBranch,
  Building2,
  ShieldCheck,
  Activity,
  LogOut,
  ChevronDown,
  ChevronRight,
  Shield,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import { initials } from '../../utils/formatters';
import { useQuery } from '@tanstack/react-query';
import { notificationService } from '../../services/notification.service';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  to?: string;
  children?: NavItem[];
  adminOnly?: boolean;
  badge?: number;
}

const NavItemComponent: React.FC<{
  item: NavItem;
  depth?: number;
  onNavigate?: () => void;
}> = ({ item, depth = 0, onNavigate }) => {
  const location = useLocation();
  const [expanded, setExpanded] = useState(() => {
    if (item.children) {
      return item.children.some((c) => c.to && location.pathname.startsWith(c.to));
    }
    return false;
  });

  if (item.children) {
    const isActive = item.children.some((c) => c.to && location.pathname.startsWith(c.to));

    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className={clsx(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group',
            isActive
              ? 'text-white bg-white/10'
              : 'text-white/70 hover:text-white hover:bg-white/10'
          )}
        >
          <span className={clsx('flex-shrink-0', isActive ? 'text-white' : 'text-white/60 group-hover:text-white')}>
            {item.icon}
          </span>
          <span className="flex-1 text-left">{item.label}</span>
          {item.badge !== undefined && item.badge > 0 && (
            <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
              {item.badge > 99 ? '99+' : item.badge}
            </span>
          )}
          {expanded ? (
            <ChevronDown size={14} className="flex-shrink-0 text-white/50" />
          ) : (
            <ChevronRight size={14} className="flex-shrink-0 text-white/50" />
          )}
        </button>

        {expanded && (
          <div className="mt-1 ml-3 pl-4 border-l border-white/10 flex flex-col gap-0.5">
            {item.children.map((child) => (
              <NavItemComponent key={child.label} item={child} depth={depth + 1} onNavigate={onNavigate} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <NavLink
      to={item.to || '#'}
      end={item.to === '/'}
      onClick={onNavigate}
      className={({ isActive }) =>
        clsx(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group',
          isActive
            ? 'text-white bg-white/15 shadow-sm'
            : 'text-white/70 hover:text-white hover:bg-white/10'
        )
      }
    >
      {({ isActive }) => (
        <>
          <span className={clsx('flex-shrink-0', isActive ? 'text-white' : 'text-white/60 group-hover:text-white')}>
            {item.icon}
          </span>
          <span className="flex-1">{item.label}</span>
          {item.badge !== undefined && item.badge > 0 && (
            <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
              {item.badge > 99 ? '99+' : item.badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
};

export const Sidebar: React.FC<{ onNavigate?: () => void }> = ({ onNavigate }) => {
  const { user, logout } = useAuth();
  const { isAdmin, canManageUsers, canViewAuditLogs } = usePermissions();

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationService.getUnreadCount(),
    refetchInterval: 60000,
  });

  const navItems: NavItem[] = [
    {
      label: 'Tableau de bord',
      icon: <LayoutDashboard size={18} />,
      to: '/',
    },
    {
      label: 'Missions',
      icon: <Briefcase size={18} />,
      to: '/missions',
    },
    {
      label: 'Recommandations',
      icon: <FileText size={18} />,
      to: '/recommendations',
    },
    {
      label: "Plans d'action",
      icon: <CheckSquare size={18} />,
      to: '/action-plans',
    },
    {
      label: 'Preuves',
      icon: <Paperclip size={18} />,
      to: '/evidences',
    },
    {
      label: 'Reporting',
      icon: <BarChart2 size={18} />,
      to: '/reports',
    },
    {
      label: 'Notifications',
      icon: <Bell size={18} />,
      to: '/notifications',
      badge: unreadCount,
    },
  ];

  const adminItems: NavItem[] = [
    {
      label: 'Administration',
      icon: <Settings size={18} />,
      adminOnly: true,
      children: [
        ...(canManageUsers
          ? [{ label: 'Utilisateurs', icon: <Users size={16} />, to: '/admin/users' }]
          : []),
        { label: 'Paramètres', icon: <Database size={16} />, to: '/admin/parameters' },
        { label: 'Sources', icon: <GitBranch size={16} />, to: '/admin/sources' },
        { label: 'Entités', icon: <Building2 size={16} />, to: '/admin/entities' },
        { label: 'Rôles & droits', icon: <ShieldCheck size={16} />, to: '/admin/roles' },
        { label: 'Workflow', icon: <Activity size={16} />, to: '/admin/workflow' },
        ...(canViewAuditLogs
          ? [{ label: "Journal d'audit", icon: <Shield size={16} />, to: '/audit-logs' }]
          : []),
      ],
    },
  ];

  return (
    <div className="flex h-full flex-col bg-primary shadow-sidebar">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 flex-shrink-0">
          <Shield size={20} className="text-white" />
        </div>
        <div>
          <p className="text-white font-bold text-sm leading-none tracking-wide">RECOS-TRACKER</p>
          <p className="text-white/50 text-xs mt-0.5">Suivi des recommandations</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavItemComponent key={item.label} item={item} onNavigate={onNavigate} />
        ))}

        {isAdmin && (
          <div className="pt-4 mt-4 border-t border-white/10">
            <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">
              Administration
            </p>
            {adminItems.map((item) => (
              <NavItemComponent key={item.label} item={item} onNavigate={onNavigate} />
            ))}
          </div>
        )}
      </nav>

      {/* User info */}
      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-white text-xs font-semibold">
            {initials(user?.first_name, user?.last_name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.full_name}</p>
            <p className="text-xs text-white/50 truncate">{user?.role?.label}</p>
          </div>
          <button
            onClick={() => logout()}
            title="Déconnexion"
            className="flex-shrink-0 text-white/50 hover:text-white transition-colors rounded-lg p-1.5 hover:bg-white/10"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};
