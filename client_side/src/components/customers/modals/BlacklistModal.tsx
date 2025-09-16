// components/modals/BlacklistModal.tsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Shield,
  ShieldWarning,
  MagnifyingGlass,
  Calendar,
  User,
  Phone,
  PaperPlaneTilt,
  FileText,
  Building,
  Warning,
  Users,
  X,
} from '@phosphor-icons/react';
import { format } from 'date-fns';
import {
  getOrganizationBlacklist,
  getGlobalBlacklist,
  BlacklistEntry,
} from '@/api/customers';

interface BlacklistModalProps {
  type: 'organization' | 'global';
  trigger?: React.ReactNode;
}

const BlacklistModal: React.FC<BlacklistModalProps> = ({ type, trigger }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [blacklistData, setBlacklistData] = useState<BlacklistEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const isGlobal = type === 'global';
  const pageSize = 8;

  const fetchBlacklist = async (page = 1) => {
    setLoading(true);
    try {
      const data = isGlobal
        ? await getGlobalBlacklist(page, pageSize)
        : await getOrganizationBlacklist(page, pageSize);

      setBlacklistData(data.data || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error fetching blacklist:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchBlacklist(1);
      setSearchTerm('');
    }
  }, [isOpen, type]);

  const filteredData = blacklistData.filter(
    (entry) =>
      entry.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.customerPhone.includes(searchTerm) ||
      entry.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.reason.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const defaultTrigger = (
    <Button
      variant={isGlobal ? 'ghost' : 'outline'}
      size="sm"
      className={`
        group relative overflow-hidden transition-all duration-300 ease-in-out
        ${
          isGlobal
            ? 'bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700 shadow-lg hover:shadow-red-500/25'
            : 'border-orange-300 text-orange-700 hover:text-orange-800 hover:border-orange-400 hover:bg-orange-50 dark:text-orange-400 dark:border-orange-600 dark:hover:text-orange-300 dark:hover:border-orange-500 dark:hover:bg-orange-950/20'
        }
        transform hover:scale-105 active:scale-95
      `}
    >
      <div className="flex items-center gap-2 relative z-10">
        {isGlobal ? (
          <ShieldWarning
            size={16}
            className="transition-transform group-hover:rotate-12"
          />
        ) : (
          <Shield
            size={16}
            className="transition-transform group-hover:rotate-12"
          />
        )}
        <span className="font-medium">
          {isGlobal ? 'Global Blacklist' : 'My Blacklist'}
        </span>
        {!loading && total > 0 && (
          <Badge
            variant={isGlobal ? 'secondary' : 'outline'}
            className={`
              ml-1 transition-all duration-200
              ${
                isGlobal
                  ? 'bg-red-100 text-red-800 border-red-200'
                  : 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700'
              }
            `}
          >
            {total}
          </Badge>
        )}
      </div>
      <div
        className={`
        absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300
        ${
          isGlobal
            ? 'bg-gradient-to-r from-red-700 to-red-800'
            : 'bg-gradient-to-r from-orange-100 to-orange-200 dark:from-orange-900/20 dark:to-orange-800/20'
        }
      `}
      />
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{defaultTrigger || trigger}</DialogTrigger>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0 overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
        {/* Header - Fixed */}
        <div
          className={`
          flex-shrink-0 px-6 py-4 border-b border-gray-200 dark:border-gray-700
          ${
            isGlobal
              ? 'bg-gradient-to-r from-red-50 to-red-100 dark:from-red-950/20 dark:to-red-900/20'
              : 'bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20'
          }
        `}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between text-xl">
              <div className="flex items-center gap-3">
                <div
                  className={`
                  p-2 rounded-full
                  ${
                    isGlobal
                      ? 'bg-red-100 dark:bg-red-900/30'
                      : 'bg-orange-100 dark:bg-orange-900/30'
                  }
                `}
                >
                  {isGlobal ? (
                    <ShieldWarning
                      size={24}
                      className="text-red-600 dark:text-red-400"
                    />
                  ) : (
                    <Shield
                      size={24}
                      className="text-orange-600 dark:text-orange-400"
                    />
                  )}
                </div>
                <div>
                  <h2 className="text-gray-900 dark:text-gray-100 font-bold">
                    {isGlobal
                      ? 'Global Customer Blacklist'
                      : 'Organization Blacklist'}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-normal">
                    {isGlobal
                      ? 'View blacklisted customers across all organizations'
                      : 'View customers blacklisted by your organization'}
                  </p>
                </div>
              </div>
              <Badge
                variant="outline"
                className={`
                  px-3 py-1 text-sm font-semibold
                  ${
                    isGlobal
                      ? 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-600'
                      : 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-600'
                  }
                `}
              >
                {total} entries
              </Badge>
            </DialogTitle>
          </DialogHeader>
        </div>

        {/* Search Bar - Fixed */}
        <div className="flex-shrink-0 p-6 pb-4 bg-white dark:bg-gray-900">
          <div className="relative group">
            <MagnifyingGlass
              className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-200"
              size={18}
            />
            <Input
              placeholder="Search by name, phone, email, or reason..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-4 py-3 text-base border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 transition-all duration-200"
            />
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 min-h-0 px-6 bg-white dark:bg-gray-900">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-4">
                <div
                  className={`
                  animate-spin rounded-full h-10 w-10 border-4 border-t-transparent
                  ${isGlobal ? 'border-red-500' : 'border-orange-500'}
                `}
                ></div>
                <p className="text-gray-600 dark:text-gray-400 font-medium">
                  Loading blacklist...
                </p>
              </div>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div
                  className={`
                  mx-auto mb-6 w-20 h-20 rounded-full flex items-center justify-center
                  ${
                    isGlobal
                      ? 'bg-red-100 dark:bg-red-900/20'
                      : 'bg-orange-100 dark:bg-orange-900/20'
                  }
                `}
                >
                  <Shield
                    size={40}
                    className="text-gray-400 dark:text-gray-500"
                  />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  No blacklisted customers
                </h3>
                <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                  {searchTerm
                    ? 'No customers match your search criteria. Try adjusting your search terms.'
                    : isGlobal
                      ? 'No customers are currently blacklisted across all organizations.'
                      : 'Your organization has no blacklisted customers at this time.'}
                </p>
              </div>
            </div>
          ) : (
            <ScrollArea className="h-full pr-4">
              <div className="grid gap-4 py-2">
                {filteredData.map((entry, index) => (
                  <Card
                    key={entry.id}
                    className={`
                      group transition-all duration-300 hover:shadow-lg cursor-pointer
                      transform hover:-translate-y-1 border-l-4
                      ${
                        entry.isActive
                          ? 'border-l-red-500 bg-red-50/50 dark:bg-red-950/10 border-red-200 dark:border-red-800/50 hover:shadow-red-500/10'
                          : 'border-l-gray-400 bg-gray-50/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:shadow-gray-500/10'
                      }
                      animate-in fade-in slide-in-from-bottom-4
                    `}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          {/* Customer Info Header */}
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                              {entry.customerName
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .toUpperCase()}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">
                                  {entry.customerName}
                                </h4>
                                <Badge
                                  variant={
                                    entry.isActive ? 'destructive' : 'secondary'
                                  }
                                  className={`
                                    text-xs font-medium transition-all duration-200
                                    ${
                                      entry.isActive
                                        ? 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-600'
                                        : 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
                                    }
                                  `}
                                >
                                  {entry.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                              </div>
                            </div>
                          </div>

                          {/* Contact Details */}
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                              <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-md">
                                <Phone
                                  size={14}
                                  className="text-blue-600 dark:text-blue-400"
                                />
                              </div>
                              <span className="font-medium">
                                {entry.customerPhone}
                              </span>
                            </div>
                            {entry.customerEmail && (
                              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-md">
                                  <PaperPlaneTilt
                                    size={14}
                                    className="text-green-600 dark:text-green-400"
                                  />
                                </div>
                                <span className="font-medium truncate">
                                  {entry.customerEmail}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                              <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-md">
                                <FileText
                                  size={14}
                                  className="text-purple-600 dark:text-purple-400"
                                />
                              </div>
                              <span className="font-medium">
                                ID: {entry.customerDocumentId}
                              </span>
                            </div>
                            {isGlobal && entry.orgName && (
                              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-md">
                                  <Building
                                    size={14}
                                    className="text-indigo-600 dark:text-indigo-400"
                                  />
                                </div>
                                <span className="font-medium">
                                  {entry.orgName}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Blacklist Reason */}
                          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                              <div className="p-1 bg-amber-100 dark:bg-amber-900/40 rounded-md mt-0.5">
                                <Warning
                                  size={16}
                                  className="text-amber-600 dark:text-amber-400"
                                />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">
                                  Blacklist Reason
                                </p>
                                <p className="text-sm text-amber-700 dark:text-amber-400 leading-relaxed">
                                  {entry.reason}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Date */}
                        <div className="text-right flex-shrink-0">
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
                            <Calendar size={12} />
                            <span className="font-medium">
                              {format(
                                new Date(entry.createdAt),
                                'MMM dd, yyyy',
                              )}
                            </span>
                          </div>
                          <div className="text-xs text-gray-400 dark:text-gray-500">
                            {format(new Date(entry.createdAt), 'HH:mm')}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Pagination - Fixed */}
        {totalPages > 1 && (
          <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Showing{' '}
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {(currentPage - 1) * pageSize + 1}
                </span>{' '}
                to{' '}
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {Math.min(currentPage * pageSize, total)}
                </span>{' '}
                of{' '}
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {total}
                </span>{' '}
                entries
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchBlacklist(currentPage - 1)}
                  disabled={currentPage <= 1 || loading}
                  className="hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 disabled:opacity-50"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchBlacklist(currentPage + 1)}
                  disabled={currentPage >= totalPages || loading}
                  className="hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 disabled:opacity-50"
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BlacklistModal;
