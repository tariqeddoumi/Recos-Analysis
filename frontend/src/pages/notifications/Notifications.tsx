import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, CheckCheck, Trash2, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { notificationService } from '../../services/notification.service';
import { Notification, NotificationType } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Tabs } from '../../components/ui/Tabs';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatRelativeDate } from '../../utils/formatters';
import clsx from 'clsx';

const NOTIFICATION_LABELS: Record<NotificationType, { label: string; color: string }> = {
  deadline_approaching: { label: 'Échéance proche', color: 'text-yellow-600 bg-yellow-100' },
  deadline_overdue: { label: 'Échéance dépassée', color: 'text-red-600 bg-red-100' },
  status_changed: { label: 'Statut modifié', color: 'text-blue-600 bg-blue-100' },
  comment_added: { label: 'Nouveau commentaire', color: 'text-gray-600 bg-gray-100' },
  evidence_submitted: { label: 'Preuve soumise', color: 'text-blue-600 bg-blue-100' },
  evidence_approved: { label: 'Preuve approuvée', color: 'text-green-600 bg-green-100' },
  evidence_rejected: { label: 'Preuve rejetée', color: 'text-red-600 bg-red-100' },
  extension_requested: { label: 'Prolongation demandée', color: 'text-orange-600 bg-orange-100' },
  extension_approved: { label: 'Prolongation approuvée', color: 'text-green-600 bg-green-100' },
  extension_rejected: { label: 'Prolongation rejetée', color: 'text-red-600 bg-red-100' },
  assigned: { label: 'Assignation', color: 'text-purple-600 bg-purple-100' },
  reminder: { label: 'Rappel', color: 'text-gray-600 bg-gray-100' },
};

export const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('all');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', page, activeTab],
    queryFn: () =>
      notificationService.getAll({
        page,
        limit: 20,
        is_read: activeTab === 'unread' ? false : undefined,
      }),
  });

  const { mutate: markRead } = useMutation({
    mutationFn: (id: number) => notificationService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const { mutate: markAllRead, isPending: markingAll } = useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => {
      toast.success('Toutes les notifications marquées comme lues');
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const { mutate: deleteNotif } = useMutation({
    mutationFn: (id: number) => notificationService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const unreadCount = data?.data?.filter((n) => !n.is_read).length || 0;

  const tabs = [
    { id: 'all', label: 'Toutes', badge: data?.total },
    { id: 'unread', label: 'Non lues', badge: unreadCount },
  ];

  const handleNotifClick = (notif: Notification) => {
    if (!notif.is_read) markRead(notif.id);
    if (notif.link) navigate(notif.link);
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-banking-text">Notifications</h1>
          <p className="text-sm text-banking-muted">
            {data?.total ?? 0} notification{(data?.total ?? 0) !== 1 ? 's' : ''}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          leftIcon={<CheckCheck size={14} />}
          isLoading={markingAll}
          onClick={() => markAllRead()}
        >
          Tout marquer lu
        </Button>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {isLoading ? (
        <LoadingSpinner label="Chargement des notifications..." />
      ) : !data?.data || data.data.length === 0 ? (
        <EmptyState
          icon={<Bell size={28} className="text-gray-400" />}
          title="Aucune notification"
          description="Vous n'avez pas de nouvelles notifications."
        />
      ) : (
        <div className="space-y-2">
          {data.data.map((notif) => {
            const typeConfig = NOTIFICATION_LABELS[notif.type] || {
              label: notif.type,
              color: 'text-gray-600 bg-gray-100',
            };

            return (
              <Card
                key={notif.id}
                padding="sm"
                hover
                onClick={() => handleNotifClick(notif)}
                className={clsx(
                  'cursor-pointer transition-all',
                  !notif.is_read && 'border-l-4 border-l-secondary bg-blue-50/30'
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={clsx(
                      'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                      typeConfig.color
                    )}
                  >
                    <Bell size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={clsx('text-xs font-medium rounded px-1.5 py-0.5', typeConfig.color)}>
                        {typeConfig.label}
                      </span>
                      <span className="text-xs text-banking-muted ml-auto flex-shrink-0">
                        {formatRelativeDate(notif.created_at)}
                      </span>
                    </div>
                    <p className={clsx('text-sm font-medium', !notif.is_read ? 'text-banking-text' : 'text-gray-500')}>
                      {notif.title}
                    </p>
                    <p className="text-xs text-banking-muted mt-0.5">{notif.message}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!notif.is_read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markRead(notif.id);
                        }}
                        className="p-1 rounded text-gray-400 hover:text-accent transition-colors"
                        title="Marquer comme lu"
                      >
                        <Check size={14} />
                      </button>
                    )}
                    {notif.link && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(notif.link!);
                        }}
                        className="p-1 rounded text-gray-400 hover:text-secondary transition-colors"
                        title="Voir"
                      >
                        <ExternalLink size={14} />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotif(notif.id);
                      }}
                      className="p-1 rounded text-gray-400 hover:text-red-500 transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {(data?.total_pages ?? 0) > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Précédent
          </Button>
          <span className="flex items-center text-sm text-banking-muted">
            Page {page} / {data?.total_pages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={page >= (data?.total_pages ?? 1)}
            onClick={() => setPage((p) => p + 1)}
          >
            Suivant
          </Button>
        </div>
      )}
    </div>
  );
};
