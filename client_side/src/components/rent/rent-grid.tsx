'use client';

import { AgGridReact } from 'ag-grid-react';
import {
  ClientSideRowModelModule,
  ColDef,
  ModuleRegistry,
  NumberFilterModule,
  RowSelectionModule,
  RowStyleModule,
  TextFilterModule,
} from 'ag-grid-community';
import { useMemo, useState, useEffect } from 'react';
import { Button } from '../ui/button';
import {
  removeRent,
  getAllRentsWithCarAndCustomer,
  downloadRentContractPDF,
  getRentImages,
} from '@/api/rents';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Hammer,
  Trash,
  FileText,
  Download,
  Camera,
  Image,
} from '@phosphor-icons/react';
import { ConfirmationDialog } from '../confirmation-dialog';
import { toast } from '@/components/ui/toast';
import React from 'react';
import { EditRentFormDialog } from './edit-rent-form';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from '@/components/ui/pagination';
import { RentStatus } from '@/types/rent-status.type';
import { ImageCarousel } from '../../components/ui/image-carousel';

import { format } from 'date-fns';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Separator } from '../ui/separator';
import { ContractDialog } from '../contracts/contract-dialog';
import { downloadContractDOCX } from '@/api/contracts';
import { useTranslation } from 'react-i18next';

// IMPORTANT: Make sure you import AG Grid CSS once in your app entry (e.g., src/main.tsx):
// import 'ag-grid-community/styles/ag-grid.css';
// import 'ag-grid-community/styles/ag-theme-alpine.css';
// import 'ag-grid-community/styles/ag-theme-alpine-dark.css';

ModuleRegistry.registerModules([
  RowSelectionModule,
  TextFilterModule,
  NumberFilterModule,
  ClientSideRowModelModule,
  RowStyleModule,
]);

type RentRow = {
  id: string;
  rentContractId: string;
  rentNumber: number;
  year: number;
  isOpenContract: boolean;
  deposit?: number;
  carModel: string;
  customerName?: string;
  startDate: string | Date;
  expectedEndDate?: string | Date;
  returnedAt?: string | Date;
  pricePerDay: number;
  status?: RentStatus;
  totalPaid?: number;
  isFullyPaid?: boolean;
  totalPrice: number;
  guarantee?: number;
  lateFee?: number;
};

const createDateCellRenderer = (opts?: {
  shortFormat?: string;
  fullFormat?: string;
  openLabel?: string;
}) => {
  const shortFmt = opts?.shortFormat ?? 'dd/MM/yyyy';
  const fullFmt = opts?.fullFormat ?? 'dd/MM/yyyy HH:mm:ss';
  const openLabel = opts?.openLabel ?? 'Open';

  return (params: { value: string | Date | null | undefined }) => {
    if (!params.value) {
      return <span className="text-muted-foreground">—</span>;
    }

    try {
      const parsed = new Date(params.value);

      if (isNaN(parsed.getTime())) {
        return <span className="text-muted-foreground">—</span>;
      }

      if (parsed.getFullYear() === 9999) {
        return <span className="text-muted-foreground">{openLabel}</span>;
      }

      const shortDate = format(parsed, shortFmt);
      const fullDate = format(parsed, fullFmt);

      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-help underline decoration-dotted">
                {shortDate}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="font-mono text-xs">
              {fullDate}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    } catch {
      return <span className="text-muted-foreground">—</span>;
    }
  };
};

export const RentsGrid = () => {
  const { t } = useTranslation('rent');

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedRentForEdit, setSelectedRentForEdit] =
    useState<null | RentRow>(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [selectedRows, setSelectedRows] = useState<any[]>([]);
  const [contractOpen, setContractOpen] = useState(false);
  const [contractId, setContractId] = useState<string | null>(null);
  const gridStyle = useMemo(() => ({ height: '100%', width: '100%' }), []);
  const queryClient = useQueryClient();

  // responsive
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1700 ? 7 : 12;
    }
    return 10;
  });

  const [isSmallScreen, setIsSmallScreen] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 640 : false,
  );

  const [carouselOpen, setCarouselOpen] = useState(false);
  const [carouselImages, setCarouselImages] = useState<any[]>([]);
  const [carouselTitle, setCarouselTitle] = useState('');

  useEffect(() => {
    const handleResize = () => {
      setPageSize(window.innerWidth < 1700 ? 7 : 12);
      setIsSmallScreen(window.innerWidth < 640);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // fetch rents
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['rents', page, pageSize],
    queryFn: () => getAllRentsWithCarAndCustomer(page, pageSize),
    placeholderData: (previousData) => previousData,
    refetchOnWindowFocus: false,
    refetchInterval: 60000,
  });

  useEffect(() => {
    if (!isFetching) setLastUpdated(new Date());
  }, [isFetching]);

  // Actual status (mirrors backend)
  const getActualStatus = (rent: RentRow): RentStatus => {
    const now = new Date();
    const startDate = new Date(rent.startDate);
    const returnedAt = rent.returnedAt ? new Date(rent.returnedAt) : null;

    if (rent.status === 'canceled') return 'canceled';
    if (returnedAt && returnedAt <= now) return 'completed';
    if (startDate > now) return 'reserved';
    return 'active';
  };

  // can delete?
  const canBeDeleted = (rent: RentRow): boolean => {
    return getActualStatus(rent) !== 'active';
  };

  // delete mutation
  const deleteMutation = useMutation({
    mutationFn: removeRent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rents'] });
      toast({
        type: 'success',
        title: t('toasts.delete_success_title', 'Success!'),
        description: t(
          'toasts.delete_success_desc',
          'Rent contract(s) deleted successfully.',
        ),
      });
    },
    onError: (error: any) => {
      const msg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        t(
          'toasts.delete_error_desc',
          'An error occurred while deleting the rent contract.',
        );
      toast({
        type: 'error',
        title: t('common.error', { ns: 'common', defaultValue: 'Error' }),
        description: msg,
      });
    },
  });

  const handleDelete = async () => {
    const deletableRows = selectedRows.filter(canBeDeleted);
    const activeRows = selectedRows.filter((row) => !canBeDeleted(row));

    if (activeRows.length > 0) {
      toast({
        type: 'warning',
        title: t('grid.delete_some_title', 'Some rentals cannot be deleted'),
        description: t(
          'grid.delete_some_desc',
          '{{active}} active rental(s) cannot be deleted. Only {{del}} rental(s) will be deleted.',
          { active: activeRows.length, del: deletableRows.length },
        ),
      });
    }

    if (deletableRows.length === 0) {
      toast({
        type: 'error',
        title: t('grid.cannot_delete_title', 'Cannot delete'),
        description: t(
          'grid.cannot_delete_desc',
          'No rentals can be deleted. Active rentals must be completed or canceled first.',
        ),
      });
      setShowDeleteDialog(false);
      return;
    }

    try {
      await Promise.allSettled(
        deletableRows.map((row) => deleteMutation.mutateAsync(row.id)),
      );
      setSelectedRows([]);
    } catch {
      // noop
    }

    setShowDeleteDialog(false);
  };

  // currency

  const formatDateToDDMMYYYY = (params: any) => {
    if (!params.value) return '';
    const date = new Date(params.value);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const statusFormatter = (params: any) => {
    const actualStatus = getActualStatus(params.data);
    const now = new Date();
    const returnedAt = params.data.returnedAt
      ? new Date(params.data.returnedAt)
      : null;
    const isOverdue =
      actualStatus === 'active' && returnedAt && returnedAt < now;

    if (isOverdue) {
      return (
        <span className="bg-yellow-200 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300 px-2 py-1 rounded">
          {t('grid.overdue', 'Overdue')}
        </span>
      );
    }

    const statusMap: Record<RentStatus, { label: string; className: string }> =
      {
        reserved: {
          label: t('status.reserved', 'Reserved'),
          className:
            'bg-purple-200 dark:bg-purple-900 text-purple-800 dark:text-purple-300 px-2 py-1 rounded',
        },
        active: {
          label: t('status.active', 'Active'),
          className:
            'bg-green-200 dark:bg-green-900 text-green-800 dark:text-green-300 px-2 py-1 rounded',
        },
        completed: {
          label: t('status.completed', 'Completed'),
          className:
            'bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-300 px-2 py-1 rounded',
        },
        canceled: {
          label: t('status.canceled', 'Canceled'),
          className:
            'bg-red-200 dark:bg-red-900 text-red-800 dark:text-red-300 px-2 py-1 rounded',
        },
      };

    const s = statusMap[actualStatus] || {
      label: String(actualStatus),
      className: '',
    };
    return <span className={s.className}>{s.label}</span>;
  };

  const rowClassRules = useMemo(() => {
    const n = (v: any) =>
      typeof v === 'number' ? v : Number(String(v ?? '').replace(/,/g, ''));
    const EPS = 0.0001;

    const isOpenContractUnreturned = (d: any) => {
      const { isOpenContract, returnedAt } = d || {};
      if (!isOpenContract) return false;
      if (!returnedAt) return true;
      const ret = new Date(returnedAt);
      return isNaN(ret.getTime()) || ret.getFullYear() === 9999;
    };

    return {
      // GREEN: fully paid flag OR paid >= total (only when not an open-unreturned contract)
      'green-row': (p: any) => {
        const d = p.data || {};
        if (isOpenContractUnreturned(d)) return false; // keep open-unreturned as not green
        return (
          d.isFullyPaid === true || n(d.totalPaid) + EPS >= n(d.totalPrice)
        );
      },

      // RED: open-unreturned OR (explicitly not fully paid AND paid < total)
      'red-row': (p: any) => {
        const d = p.data || {};
        if (isOpenContractUnreturned(d)) return true; // force red until returned
        return (
          d.isFullyPaid === false && n(d.totalPaid) + EPS < n(d.totalPrice)
        );
      },

      'yellow-row': (p: any) => {
        const actualStatus = getActualStatus(p.data);
        const { returnedAt } = p.data || {};
        return (
          actualStatus === 'active' &&
          returnedAt &&
          new Date(returnedAt) < new Date()
        );
      },

      'purple-row': (p: any) => getActualStatus(p.data) === 'reserved',
    };
  }, []);

  const rowData = useMemo(() => {
    return data?.data ? [...data.data] : [];
  }, [data?.data]);

  const dateCellRenderer = useMemo(
    () => createDateCellRenderer({ openLabel: t('grid.open', 'Open') }),
    [t],
  );

  const colDefs: ColDef[] = [
    {
      headerName: '',
      checkboxSelection: true,
      headerCheckboxSelection: true,
      width: 50,
      pinned: 'left',
      lockPinned: true,
      suppressMovable: true,
      cellClassRules: {
        'left-border-green': (p: any) => {
          const n = (v: any) =>
            typeof v === 'number'
              ? v
              : Number(String(v ?? '').replace(/,/g, ''));
          const EPS = 0.0001;
          const d = p.data || {};
          const isOpenContractUnreturned = (() => {
            const { isOpenContract, returnedAt } = d || {};
            if (!isOpenContract) return false;
            if (!returnedAt) return true;
            const ret = new Date(returnedAt);
            return isNaN(ret.getTime()) || ret.getFullYear() === 9999;
          })();
          if (isOpenContractUnreturned) return false;
          return (
            d.isFullyPaid === true || n(d.totalPaid) + EPS >= n(d.totalPrice)
          );
        },

        'left-border-red': (p: any) => {
          const n = (v: any) =>
            typeof v === 'number'
              ? v
              : Number(String(v ?? '').replace(/,/g, ''));
          const EPS = 0.0001;
          const d = p.data || {};
          const isOpenContractUnreturned = (() => {
            const { isOpenContract, returnedAt } = d || {};
            if (!isOpenContract) return false;
            if (!returnedAt) return true;
            const ret = new Date(returnedAt);
            return isNaN(ret.getTime()) || ret.getFullYear() === 9999;
          })();
          if (isOpenContractUnreturned) return true; // force red
          return (
            d.isFullyPaid === false && n(d.totalPaid) + EPS < n(d.totalPrice)
          );
        },

        'left-border-yellow': (params) => {
          const actualStatus = getActualStatus(params.data);
          const { returnedAt } = params.data || {};
          return (
            actualStatus === 'active' &&
            returnedAt &&
            new Date(returnedAt) < new Date()
          );
        },
      },
    },
    {
      field: 'rentContractId',
      headerName: t('grid.contract', 'Contract #'),
      width: 120,
      sortable: true,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: any) => {
        const { rentContractId, rentNumber, year, id } = params.data;
        const displayId =
          rentContractId ||
          (rentNumber && year
            ? `${String(rentNumber).padStart(3, '0')}/${year}`
            : `#${id.slice(0, 8)}`);

        return (
          <div className="flex flex-col">
            <span className="font-semibold text-blue-600 dark:text-blue-400">
              {displayId}
            </span>
          </div>
        );
      },
    },
    {
      field: 'carModel',
      headerName: t('grid.car_model', 'Car Model'),
      width: 150,
      sortable: true,
      filter: 'agTextColumnFilter',
    },
    {
      field: 'customerName',
      headerName: t('grid.customer', 'Customer'),
      width: 150,
      sortable: true,
      filter: 'agTextColumnFilter',
    },
    {
      field: 'startDate',
      headerName: t('grid.start_date', 'Start Date'),
      width: 120,
      sortable: true,
      filter: 'agTextColumnFilter',
      valueFormatter: formatDateToDDMMYYYY,
      cellRenderer: dateCellRenderer,
    },
    {
      field: 'expectedEndDate',
      headerName: t('grid.expected_end_date', 'Expected End Date'),
      width: 150,
      sortable: true,
      filter: 'agTextColumnFilter',
      cellRenderer: dateCellRenderer,
      valueFormatter: (params) =>
        params.data?.expectedEndDate
          ? formatDateToDDMMYYYY({ value: params.data.expectedEndDate })
          : t('grid.open', 'Open'),
    },
    {
      field: 'returnedAt',
      headerName: t('grid.returned_at', 'Returned At'),
      width: 141,
      sortable: true,
      filter: 'agTextColumnFilter',
      cellRenderer: dateCellRenderer,
      valueFormatter: (params) => {
        if (!params.data?.returnedAt) return t('grid.open', 'Open');
        const date = new Date(params.data.returnedAt);
        if (date.getFullYear() === 9999) return t('grid.open', 'Open');
        return formatDateToDDMMYYYY({ value: params.data.returnedAt });
      },
    },
    {
      field: 'totalPrice',
      headerName: t('grid.total_price', 'Total Price'),
      width: 140,
      valueGetter: (params) => {
        const {
          isOpenContract,
          totalPrice,
          startDate,
          returnedAt,
          pricePerDay,
        } = params.data || {};
        if (
          isOpenContract &&
          (!returnedAt || new Date(returnedAt).getFullYear() === 9999)
        ) {
          return null;
        }
        if (isOpenContract && returnedAt && startDate && pricePerDay) {
          const start = new Date(startDate);
          const end = new Date(returnedAt);
          if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end > start) {
            const days = Math.ceil(
              (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
            );
            return days * pricePerDay;
          }
        }
        return totalPrice || 0;
      },
      valueFormatter: (params) => {
        if (params.value === null || params.value === undefined) {
          return t('grid.open', 'Open');
        }
        return `${Number(params.value).toLocaleString('en-US')} ${t('currency', 'DHS')}`;
      },
      filter: 'agNumberColumnFilter',
      sortable: true,
    },
    {
      headerName: t('grid.payment_progress', 'Payment Progress'),
      width: 220,
      cellRenderer: (params: {
        data: {
          totalPaid: number;
          totalPrice: number;
          isOpenContract: boolean;
          returnedAt?: string;
          startDate?: string;
          pricePerDay?: number;
        };
      }) => {
        const {
          totalPaid,
          totalPrice,
          isOpenContract,
          returnedAt,
          startDate,
          pricePerDay,
        } = params.data;
        const paid = totalPaid || 0;
        let total = totalPrice || 0;

        const isReturnedAtPlaceholder =
          returnedAt && new Date(returnedAt).getFullYear() === 9999;

        if (isOpenContract && (!returnedAt || isReturnedAtPlaceholder)) {
          return (
            <div className="flex flex-col items-center justify-center w-full h-full">
              <span className="text-xs text-muted-foreground">
                {t('grid.open_contract', 'Open Contract')}
              </span>
              <span className="text-xs">
                {t('grid.paid', 'Paid')}: {paid.toLocaleString('en-US')}{' '}
                {t('currency', 'DHS')}
              </span>
            </div>
          );
        }

        if (isOpenContract && returnedAt && startDate && pricePerDay) {
          const start = new Date(startDate);
          const end = new Date(returnedAt);
          if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end > start) {
            const days = Math.ceil(
              (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
            );
            total = days * pricePerDay;
          }
        }

        const percent = total > 0 ? Math.round((paid / total) * 100) : 0;
        const displayPercent = percent > 100 ? 100 : percent;

        return (
          <div className="flex flex-col items-center justify-center w-full h-full">
            <div className="w-4/5 bg-gray-200 dark:bg-gray-700 rounded h-3 mb-1">
              <div
                className="bg-green-500 h-3 rounded"
                style={{ width: `${displayPercent}%` }}
              />
            </div>
            <span className="text-xs">
              {percent}% — {t('grid.paid', 'Paid')}:{' '}
              {paid.toLocaleString('en-US')} / {total.toLocaleString('en-US')}{' '}
              {t('currency', 'DHS')}
            </span>
          </div>
        );
      },
    },
    {
      field: 'status',
      headerName: t('grid.status', 'Status'),
      width: 160,
      filter: 'agSetColumnFilter',
      filterParams: { values: ['reserved', 'active', 'completed', 'canceled'] },
      cellRenderer: statusFormatter,
    },
    {
      field: 'isOpenContract',
      headerName: t('grid.open_contract_col', 'Open Contract'),
      width: 150,
      filter: 'agSetColumnFilter',
      filterParams: { values: ['Yes', 'No'] },
      valueFormatter: (params: any) =>
        params.value ? t('grid.yes', 'Yes') : t('grid.no', 'No'),
    },
    {
      headerName: t('grid.images', 'Images'),
      width: 100,
      cellRenderer: (params: any) => {
        const imageCount = [
          params.data.carImg1Id,
          params.data.carImg2Id,
          params.data.carImg3Id,
          params.data.carImg4Id,
        ].filter(Boolean).length;

        if (imageCount === 0) {
          return (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <Camera className="h-4 w-4" />
            </div>
          );
        }

        return (
          <div className="flex items-center justify-center h-full ">
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                try {
                  const images = await getRentImages(params.data.id);
                  if (images.length > 0) {
                    setCarouselImages(images);
                    setCarouselOpen(true);
                    setCarouselTitle(
                      `${params.data.carMake} ${params.data.carModel} - ${t('grid.images', 'Images')}`,
                    );
                  } else {
                    toast({
                      type: 'info',
                      title: t('grid.no_images_title', 'No Images'),
                      description: t(
                        'grid.no_images_desc',
                        'No images found for this rental.',
                      ),
                    });
                  }
                } catch {
                  toast({
                    type: 'error',
                    title: t('common.error', {
                      ns: 'common',
                      defaultValue: 'Error',
                    }),
                    description: t(
                      'grid.images_failed',
                      'Failed to load images.',
                    ),
                  });
                }
              }}
              className="h-8 px-2 text-blue-600 hover:text-blue-700"
            >
              <Image />
              {imageCount}
            </Button>
          </div>
        );
      },
    },
    {
      headerName: t('grid.actions', 'Actions'),
      pinned: 'right',
      width: isSmallScreen ? 80 : 120, // responsive like CarsGrid
      cellRenderer: (params: any) => {
        // Disable edit for fully paid and returned
        const fullyPaid = params.data.totalPaid === params.data.totalPrice;
        const hasReturnedAt = Boolean(params.data.returnedAt);
        const isActuallyReturned =
          hasReturnedAt && new Date(params.data.returnedAt) <= new Date();
        const shouldDisableEdit = fullyPaid && isActuallyReturned;

        return (
          <div className="flex gap-2 items-center h-full">
            {/* Edit */}
            <Button
              variant="outline"
              disabled={shouldDisableEdit}
              title={
                shouldDisableEdit
                  ? t(
                      'grid.cannot_edit_returned',
                      'Cannot edit a fully paid and returned contract',
                    )
                  : t('grid.edit_rent', 'Edit rent')
              }
              onClick={() => {
                setSelectedRentForEdit(params.data);
                setEditDialogOpen(true);
              }}
              className="gap-1"
            >
              <Hammer size={16} />
              <span className="hidden sm:inline">{t('grid.edit', 'Edit')}</span>
            </Button>
          </div>
        );
      },
    },
  ];

  const totalPages = data?.totalPages || 1;
  const getPageNumbers = () => {
    if (!totalPages) return [];
    const pages: number[] = [];
    for (let p = 1; p <= totalPages; p++) {
      if (p === 1 || p === totalPages || (p >= page - 2 && p <= page + 2)) {
        pages.push(p);
      }
    }
    return pages;
  };

  const deletableCount = selectedRows.filter(canBeDeleted).length;
  const activeCount = selectedRows.length - deletableCount;

  return (
    <div
      className="ag-theme-alpine-dark flex flex-col"
      style={{ width: '100%', height: 'calc(100vh - 100px)' }}
    >
      <h2 className="text-xl mb-4 font-bold">
        {t('grid.title', 'Rent Contracts Dashboard')}
      </h2>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-sm">
            {t('grid.manage_hint', 'Manage your rent contracts below:')}
          </p>
          <p className="text-xs text-gray-500">
            {t('grid.last_updated', 'Last updated')}:{' '}
            {lastUpdated.toLocaleTimeString()}
          </p>
        </div>

        <div className="flex flex-wrap gap-3 sm:gap-4 text-xs items-center">
          <div className="flex items-center gap-1">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: '#33B074' }}
            />
            {t('grid.legend_fully_paid', 'Fully Paid')}
          </div>
          <div className="flex items-center gap-1">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: '#EC6142' }}
            />
            {t('grid.legend_not_fully_paid', 'Not Fully Paid')}
          </div>
          <div className="flex items-center gap-1">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: '#eab308' }}
            />
            {t('grid.legend_overdue', 'Overdue')}
          </div>
        </div>
      </div>

      {selectedRows.length > 0 && (
        <div
          className="
            mb-4 rounded-lg border
            bg-gray-50 dark:bg-gray-800
            p-3 sm:p-3
            flex flex-col gap-3
            sm:flex-row sm:items-center sm:gap-2
          "
        >
          {/* Left cluster: count + divider + inline actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 w-full sm:w-auto">
            <span className="text-sm font-medium">
              {selectedRows.length} {t('grid.rent', 'Rent')}
              {selectedRows.length > 1 ? 's' : ''}{' '}
              {t('grid.selected', 'selected')}
            </span>

            {/* Divider: Horizontal on mobile, Vertical on desktop */}
            <Separator orientation="horizontal" className="my-2 sm:hidden" />
            <Separator orientation="vertical" className="hidden sm:block h-4" />

            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              {/* View single */}
              {selectedRows.length === 1 && (
                <Button
                  variant="outline"
                  onClick={() => {
                    const id = selectedRows[0]?.id;
                    if (!id) {
                      toast({
                        type: 'error',
                        title: t('grid.missing_id', 'Missing ID'),
                        description: t(
                          'grid.missing_id_desc',
                          'Selected row does not contain a contract ID.',
                        ),
                      });
                      return;
                    }
                    setContractId(id);
                    setContractOpen(true);
                  }}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2"
                >
                  <FileText size={20} />
                  {t('grid.view', 'View')}
                </Button>
              )}

              {/* Single PDF */}
              {selectedRows.length === 1 && (
                <Button
                  variant="outline"
                  onClick={async () => {
                    // ... your existing PDF logic
                    const row = selectedRows[0];
                    try {
                      await downloadRentContractPDF(row.id);
                      toast({
                        type: 'success',
                        title: t(
                          'contract.download.started_title',
                          'Download Started',
                        ),
                        description: t(
                          'contract.download.pdf_started',
                          'PDF is being downloaded.',
                        ),
                      });
                    } catch (error: any) {
                      const msg =
                        error?.response?.data?.message ||
                        error?.response?.data?.error ||
                        error?.message ||
                        t(
                          'contract.download.pdf_failed_desc',
                          'Failed to download PDF',
                        );
                      toast({
                        type: 'error',
                        title: t(
                          'contract.download.failed_title',
                          'Download Failed',
                        ),
                        description: msg,
                      });
                    }
                  }}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2"
                >
                  <Download size={20} />
                  {t('contract.actions.pdf', 'PDF')}
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white"
              onClick={() => setShowDeleteDialog(true)}
              disabled={selectedRows.length === 0}
            >
              <Trash size={20} />
              {t('grid.delete_with_counts', 'Delete ({{a}}/{{b}})', {
                a: deletableCount,
                b: selectedRows.length,
              })}
            </Button>
            {activeCount > 0 && (
              <span className="text-xs text-yellow-600">
                {t(
                  'grid.active_cannot_delete',
                  '{{n}} active rental(s) cannot be deleted',
                  { n: activeCount },
                )}
              </span>
            )}
          </div>
        </div>
      )}

      {isLoading || isFetching ? (
        <p className="text-center">
          {t('grid.loading', 'Loading rent contracts...')}
        </p>
      ) : (
        <>
          <div className="flex flex-col h-[calc(100vh-265px)]">
            <div className="flex-1 overflow-y-auto" style={gridStyle}>
              <AgGridReact
                rowHeight={60}
                rowData={rowData}
                columnDefs={colDefs}
                rowSelection="multiple"
                pagination={false}
                rowClassRules={rowClassRules}
                onSelectionChanged={(event) => {
                  const selectedNodes = event.api.getSelectedRows();
                  setSelectedRows(selectedNodes);
                }}
              />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <Pagination className="mt-4">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    aria-disabled={page === 1}
                  />
                </PaginationItem>
                {(() => {
                  const pages = getPageNumbers();
                  return pages.map((p, idx, arr) => (
                    <React.Fragment key={p}>
                      {idx > 0 && p - arr[idx - 1] > 1 && (
                        <PaginationItem>
                          <PaginationEllipsis />
                        </PaginationItem>
                      )}
                      <PaginationItem>
                        <PaginationLink
                          isActive={p === page}
                          onClick={() => setPage(p)}
                        >
                          {p}
                        </PaginationLink>
                      </PaginationItem>
                    </React.Fragment>
                  ));
                })()}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    aria-disabled={page === totalPages}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </>
      )}

      <ImageCarousel
        images={carouselImages}
        open={carouselOpen}
        onOpenChange={setCarouselOpen}
        title={carouselTitle}
      />

      <ConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDelete}
        title={t('grid.confirm_title', 'Confirmation')}
        description={
          activeCount > 0
            ? t(
                'grid.confirm_desc_partial',
                '{{del}} rental(s) will be deleted. {{act}} active rental(s) will be skipped as they cannot be deleted.',
                { del: deletableCount, act: activeCount },
              )
            : t(
                'grid.confirm_desc_full',
                'Are you sure you want to delete the selected {{del}} rental contract(s)?',
                { del: deletableCount },
              )
        }
        confirmText={t('common.delete', {
          ns: 'common',
          defaultValue: 'Delete',
        })}
        cancelText={t('common.cancel', {
          ns: 'common',
          defaultValue: 'Cancel',
        })}
        loadingText={t('grid.deleting', 'Deleting...')}
        variant="destructive"
      />

      <ContractDialog
        open={contractOpen}
        onOpenChange={setContractOpen}
        contractId={contractId}
        title={
          selectedRows.length === 1
            ? `${selectedRows[0]?.carModel ?? t('contract.preview_title', 'Contract Preview')}`
            : t('contract.preview_title', 'Contract Preview')
        }
      />

      {selectedRentForEdit && (
        <EditRentFormDialog
          open={editDialogOpen}
          onOpenChange={(open) => {
            setEditDialogOpen(open);
            if (!open) setSelectedRentForEdit(null);
          }}
          rentId={selectedRentForEdit.id}
          carModel={selectedRentForEdit.carModel}
          customerName={selectedRentForEdit.customerName}
          startDate={selectedRentForEdit.startDate}
          pricePerDay={selectedRentForEdit.pricePerDay}
          status={selectedRentForEdit.status}
          totalPaid={selectedRentForEdit.totalPaid}
          isFullyPaid={selectedRentForEdit.isFullyPaid}
          totalPrice={selectedRentForEdit.totalPrice}
          isOpenContract={selectedRentForEdit.isOpenContract}
          deposit={selectedRentForEdit.deposit}
          guarantee={selectedRentForEdit.guarantee}
          lateFee={selectedRentForEdit.lateFee}
          returnedAt={selectedRentForEdit.returnedAt}
          rentContractId={selectedRentForEdit.rentContractId}
          rentNumber={selectedRentForEdit.rentNumber}
          year={selectedRentForEdit.year}
          onRentUpdated={() => {
            queryClient.invalidateQueries({ queryKey: ['rents'] });
            queryClient.refetchQueries({ queryKey: ['rents', page, pageSize] });
          }}
        />
      )}
    </div>
  );
};
