'use client';

import { AgGridReact } from 'ag-grid-react';
import {
  ClientSideRowModelModule,
  ColDef,
  ModuleRegistry,
  NumberFilterModule,
  RowSelectionModule,
  RowSelectionOptions,
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
} from '@/api/rents'; // 🆕 Added downloadRentContractPDF
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  PencilSimple,
  Trash,
  FileText,
  Download,
  Camera,
  Image,
} from '@phosphor-icons/react'; // 🆕 Added FileText and Download icons
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
const createDateCellRenderer = (
  shortFormat: string = 'dd/MM/yyyy',
  fullFormat: string = 'dd/MM/yyyy HH:mm:ss',
) => {
  return (params: { value: string | Date | null | undefined }) => {
    if (!params.value) {
      return <span className="text-muted-foreground">—</span>;
    }

    try {
      const parsed = new Date(params.value);

      // Check if date is valid
      if (isNaN(parsed.getTime())) {
        return <span className="text-muted-foreground">—</span>;
      }

      // Check for open contract dates (year 9999)
      if (parsed.getFullYear() === 9999) {
        return <span className="text-muted-foreground">Open</span>;
      }

      const shortDate = format(parsed, shortFormat);
      const fullDate = format(parsed, fullFormat);

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
    } catch (error) {
      return <span className="text-muted-foreground">—</span>;
    }
  };
};
export const RentsGrid = () => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedRentForEdit, setSelectedRentForEdit] =
    useState<null | RentRow>(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [selectedRows, setSelectedRows] = useState<any[]>([]);
  const [contractOpen, setContractOpen] = useState(false);
  const [contractId, setContractId] = useState<string | null>(null);
  const containerStyle = useMemo(() => ({ width: '100%', height: '100%' }), []);
  const gridStyle = useMemo(() => ({ height: '100%', width: '100%' }), []);

  const queryClient = useQueryClient();

  // Responsive pageSize
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1700 ? 7 : 12;
    }
    return 10;
  });
  const [carouselOpen, setCarouselOpen] = useState(false);
  const [carouselImages, setCarouselImages] = useState<any[]>([]);
  const [carouselTitle, setCarouselTitle] = useState('');
  useEffect(() => {
    const handleResize = () => {
      setPageSize(window.innerWidth < 1700 ? 7 : 12);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch paginated rents
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['rents', page, pageSize],
    queryFn: () => getAllRentsWithCarAndCustomer(page, pageSize),
    placeholderData: (previousData) => previousData,
    refetchOnWindowFocus: false,
    refetchInterval: 60000, // 1 minute
  });

  useEffect(() => {
    if (!isFetching) setLastUpdated(new Date());
  }, [isFetching]);

  // Helper function to determine actual status (matching backend logic)
  const getActualStatus = (rent: RentRow): RentStatus => {
    const now = new Date();
    const startDate = new Date(rent.startDate);
    const returnedAt = rent.returnedAt ? new Date(rent.returnedAt) : null;
    const expectedEndDate = rent.expectedEndDate
      ? new Date(rent.expectedEndDate)
      : null;

    if (rent.status === 'canceled') return 'canceled';
    if (returnedAt && returnedAt <= now) return 'completed';
    if (startDate > now) return 'reserved';
    return 'active';
  };

  // Helper function to check if a rental can be deleted
  const canBeDeleted = (rent: RentRow): boolean => {
    return getActualStatus(rent) !== 'active';
  };

  // DELETE LOGIC
  const deleteMutation = useMutation({
    mutationFn: removeRent, // ✅ now points to /soft-delete endpoint
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rents'] });
      toast({
        type: 'success',
        title: 'Success!',
        description: 'Rent contract(s) deleted successfully.',
      });
    },
    onError: (error: any) => {
      let errorMessage = 'An error occurred while deleting the rent contract.';
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      toast({
        type: 'error',
        title: 'Error',
        description: errorMessage,
      });
    },
  });

  const handleDelete = async () => {
    const deletableRows = selectedRows.filter(canBeDeleted);
    const activeRows = selectedRows.filter((row) => !canBeDeleted(row));

    if (activeRows.length > 0) {
      toast({
        type: 'warning',
        title: 'Some rentals cannot be deleted',
        description: `${activeRows.length} active rental(s) cannot be deleted. Only ${deletableRows.length} rental(s) will be deleted.`,
      });
    }

    if (deletableRows.length === 0) {
      toast({
        type: 'error',
        title: 'Cannot delete',
        description:
          'No rentals can be deleted. Active rentals must be completed or canceled first.',
      });
      setShowDeleteDialog(false);
      return;
    }

    try {
      await Promise.allSettled(
        deletableRows.map((row) => deleteMutation.mutateAsync(row.id)),
      );
      setSelectedRows([]);
    } catch (error) {
      console.error('Delete error:', error);
    }

    setShowDeleteDialog(false);
  };

  // 🆕 Drop-in replacement: bulk open contracts reliably
  const handleViewContracts = (e?: React.MouseEvent) => {
    if (e?.preventDefault) e.preventDefault();

    const rows = Array.isArray(selectedRows) ? selectedRows : [];
    if (rows.length === 0) {
      toast({
        type: 'info',
        title: 'No selection',
        description: 'Please select at least one contract.',
      });
      return;
    }

    // Collect IDs synchronously
    const ids: string[] = [];
    for (const r of rows) {
      const id = r?.id;
      if (id) ids.push(id);
    }

    if (ids.length === 0) {
      toast({
        type: 'error',
        title: 'Missing IDs',
        description: 'Selected rows do not contain contract IDs.',
      });
      return;
    }

    // Pre-open about:blank tabs within the same user gesture
    const windows: (Window | null)[] = [];
    for (let i = 0; i < ids.length; i++) {
      windows.push(window.open('about:blank', '_blank', 'noopener,noreferrer'));
    }

    // Point them to the target URLs
    let opened = 0;
    for (let i = 0; i < ids.length; i++) {
      const w = windows[i];
      if (w) {
        try {
          w.location.href = `/contracts/${ids[i]}`;
          opened++;
        } catch {
          // ignore
        }
      }
    }

    // Feedback toast AFTER all window.open calls
    if (opened === ids.length) {
      toast({
        type: 'success',
        title: 'Opening Contracts',
        description: `Opened ${opened} contract(s) in new tabs.`,
      });
    } else if (opened > 0) {
      toast({
        type: 'warning',
        title: 'Partially blocked',
        description: `Opened ${opened} of ${ids.length} contract(s). Pop‑ups may be blocked.`,
      });
    } else {
      toast({
        type: 'warning',
        title: 'Pop‑ups blocked',
        description:
          'Your browser blocked pop‑ups. Please allow pop‑ups for this site and click again.',
      });
    }
  };
  // 🆕 Handle bulk PDF downloads
  const handleDownloadPDFs = async () => {
    if (selectedRows.length === 1) {
      // Single PDF download
      const row = selectedRows[0];
      const contractId =
        row.rentContractId ||
        (row.rentNumber && row.year
          ? `${String(row.rentNumber).padStart(3, '0')}/${row.year}`
          : `#${row.id.slice(0, 8)}`);

      try {
        await downloadRentContractPDF(row.id);
        toast({
          type: 'success',
          title: 'Download Started',
          description: `Contract ${contractId} is being downloaded.`,
        });
      } catch (error) {
        toast({
          type: 'error',
          title: 'Download Failed',
          description: 'Failed to download contract. Please try again.',
        });
      }
    } else {
      // Multiple PDF downloads
      toast({
        type: 'info',
        title: 'Starting Downloads',
        description: `Downloading ${selectedRows.length} contracts...`,
      });

      let successCount = 0;
      let failCount = 0;

      for (const row of selectedRows) {
        try {
          await downloadRentContractPDF(row.id);
          successCount++;
        } catch (error) {
          failCount++;
        }
        // Small delay between downloads to avoid overwhelming the server
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      if (failCount === 0) {
        toast({
          type: 'success',
          title: 'Downloads Complete',
          description: `Successfully downloaded ${successCount} contract(s).`,
        });
      } else {
        toast({
          type: 'warning',
          title: 'Downloads Partial',
          description: `Downloaded ${successCount} contract(s), ${failCount} failed.`,
        });
      }
    }
  };

  const currencyFormatter = (params: any) =>
    params.value ? `${params.value.toLocaleString()} DHS` : '';

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
          Overdue
        </span>
      );
    }

    const statusMap: Record<RentStatus, { label: string; className: string }> =
      {
        reserved: {
          label: 'Reserved',
          className:
            'bg-purple-200 dark:bg-purple-900 text-purple-800 dark:text-purple-300 px-2 py-1 rounded',
        },
        active: {
          label: 'Active',
          className:
            'bg-green-200 dark:bg-green-900 text-green-800 dark:text-green-300 px-2 py-1 rounded',
        },
        completed: {
          label: 'Completed',
          className:
            'bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-300 px-2 py-1 rounded',
        },
        canceled: {
          label: 'Canceled',
          className:
            'bg-red-200 dark:bg-red-900 text-red-800 dark:text-red-300 px-2 py-1 rounded',
        },
      };

    const s = statusMap[actualStatus] || {
      label: actualStatus,
      className: '',
    };
    return <span className={s.className}>{s.label}</span>;
  };

  const rowClassRules = useMemo(
    () => ({
      'green-row': (params: any) => {
        const { isFullyPaid, totalPaid, totalPrice } = params.data || {};
        return (
          isFullyPaid === true ||
          (isFullyPaid === false && Number(totalPaid) === Number(totalPrice))
        );
      },
      'red-row': (params: any) => {
        const { isFullyPaid, totalPaid, totalPrice } = params.data || {};
        return (
          isFullyPaid === false && Number(totalPaid) !== Number(totalPrice)
        );
      },
      'yellow-row': (params: any) => {
        const actualStatus = getActualStatus(params.data);
        const { returnedAt } = params.data || {};
        return (
          actualStatus === 'active' &&
          returnedAt &&
          new Date(returnedAt) < new Date()
        );
      },
      'purple-row': (params: any) =>
        getActualStatus(params.data) === 'reserved',
    }),
    [],
  );

  const rowData = useMemo(() => {
    return data?.data ? [...data.data] : [];
  }, [data?.data]);

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
        'left-border-green': (params) => {
          const { isFullyPaid, totalPaid, totalPrice } = params.data || {};
          return (
            isFullyPaid === true ||
            (isFullyPaid === false && Number(totalPaid) === Number(totalPrice))
          );
        },
        'left-border-red': (params) => {
          const { isFullyPaid, totalPaid, totalPrice } = params.data || {};
          return (
            isFullyPaid === false && Number(totalPaid) !== Number(totalPrice)
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
      field: 'rentContractId', // 🔄 Use the formatted contract ID
      headerName: 'Contract #',
      width: 120,
      sortable: true,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: any) => {
        const { rentContractId, rentNumber, year, id } = params.data;

        // Show formatted contract ID if available, otherwise fallback
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
      headerName: 'Car Model',
      width: 150,
      sortable: true,
      filter: 'agTextColumnFilter',
    },
    {
      field: 'customerName',
      headerName: 'Customer',
      width: 150,
      sortable: true,
      filter: 'agTextColumnFilter',
    },
    {
      field: 'startDate',
      headerName: 'Start Date',
      width: 120,
      sortable: true,
      filter: 'agDateColumnFilter',
      valueFormatter: formatDateToDDMMYYYY,
      cellRenderer: createDateCellRenderer(),
    },
    {
      field: 'expectedEndDate',
      headerName: 'Expected End Date',
      width: 150,
      sortable: true,
      filter: 'agDateColumnFilter',
      cellRenderer: createDateCellRenderer(),
      valueFormatter: (params) =>
        params.data?.expectedEndDate
          ? formatDateToDDMMYYYY({ value: params.data.expectedEndDate })
          : 'Open',
    },
    {
      field: 'returnedAt',
      headerName: 'Returned At',
      width: 141,
      sortable: true,
      filter: 'agDateColumnFilter',
      cellRenderer: createDateCellRenderer(),
      valueFormatter: (params) => {
        if (!params.data?.returnedAt) return 'Open';
        const date = new Date(params.data.returnedAt);
        if (date.getFullYear() === 9999) return 'Open';
        return formatDateToDDMMYYYY({ value: params.data.returnedAt });
      },
    },
    {
      field: 'totalPrice',
      headerName: 'Total Price',
      width: 140,

      valueGetter: (params) => {
        const {
          isOpenContract,
          totalPrice,
          startDate,
          returnedAt,
          pricePerDay,
        } = params.data || {};

        // 🚨 Skip if returnedAt is null or 9999
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
          return 'Open';
        }
        return `${params.value.toLocaleString()} DHS`;
      },
      filter: 'agNumberColumnFilter',
      sortable: true,
    },
    {
      headerName: 'Payment Progress',
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

        // 🚨 Detect placeholder 9999-12-31
        const isReturnedAtPlaceholder =
          returnedAt && new Date(returnedAt).getFullYear() === 9999;

        // If open contract (no return date or placeholder)
        if (isOpenContract && (!returnedAt || isReturnedAtPlaceholder)) {
          return (
            <div className="flex flex-col items-center justify-center w-full h-full">
              <span className="text-xs text-muted-foreground">
                Open Contract
              </span>
              <span className="text-xs">Paid: {paid.toLocaleString()} DHS</span>
            </div>
          );
        }

        // If open contract but has a real return date → calculate normally
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
              ></div>
            </div>
            <span className="text-xs">
              {percent}% — Paid: {paid.toLocaleString()} /{' '}
              {total.toLocaleString()} DHS
            </span>
          </div>
        );
      },
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 160,
      filter: 'agSetColumnFilter',
      filterParams: { values: ['reserved', 'active', 'completed', 'canceled'] },
      cellRenderer: statusFormatter,
    },
    {
      field: 'isOpenContract',
      headerName: 'Open Contract',
      width: 150,
      filter: 'agSetColumnFilter',
      filterParams: { values: ['Yes', 'No'] },
      valueFormatter: (params: any) => (params.value ? 'Yes' : 'No'),
    },
    {
      headerName: 'Images',
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
                  console.log('Images returned from API:', images); // 🆕 Debug log

                  if (images.length > 0) {
                    console.log('Setting carousel images:', images); // 🆕 Debug log
                    setCarouselImages(images);
                    setCarouselOpen(true);
                    setCarouselTitle(
                      `${params.data.carMake} ${params.data.carModel} - Images`,
                    );
                  } else {
                    toast({
                      type: 'info',
                      title: 'No Images',
                      description: 'No images found for this rental.',
                    });
                  }
                } catch (error) {
                  console.error('Error loading images:', error); // 🆕 Debug log
                  toast({
                    type: 'error',
                    title: 'Error',
                    description: 'Failed to load images.',
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
      headerName: 'Actions',
      pinned: 'right',
      width: 100, // 🔄 Reduced width since only Edit button
      cellRenderer: (params: any) => {
        const actualStatus = getActualStatus(params.data);
        const fullyPaid = params.data.totalPaid === params.data.totalPrice;
        const hasReturnedAt = Boolean(params.data.returnedAt);
        const isActuallyReturned =
          hasReturnedAt && new Date(params.data.returnedAt) <= new Date();
        const shouldDisableEdit = fullyPaid && isActuallyReturned;

        return (
          <div className="flex gap-2 items-center h-full">
            {/* 🔄 Only Edit Button */}
            <Button
              variant="ghost"
              disabled={shouldDisableEdit}
              title={
                shouldDisableEdit
                  ? 'Cannot edit a fully paid and returned contract'
                  : 'Edit rent'
              }
              onClick={() => {
                setSelectedRentForEdit(params.data);
                setEditDialogOpen(true);
              }}
            >
              <PencilSimple size={16} /> Edit
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
      <h2 className="text-xl mb-1 font-bold">Rent Contracts Dashboard</h2>
      <p className="text-xs text-gray-500 mb-4">
        Last updated: {lastUpdated.toLocaleTimeString()}
      </p>

      <div className="flex justify-between mb-4 items-center">
        <div className="flex  space-x-4 items-center mb-2">
          <p>Manage your rent contracts below:</p>
        </div>

        <div className="flex gap-4 text-xs items-center">
          <div className="flex items-center gap-1">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: '#33B074' }}
            ></span>
            Fully Paid
          </div>
          <div className="flex items-center gap-1">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: '#EC6142' }}
            ></span>
            Not Fully Paid
          </div>
          <div className="flex items-center gap-1">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: '#eab308' }}
            ></span>
            Overdue
          </div>
        </div>
      </div>
      {selectedRows.length > 0 && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border">
          <div className="flex items-center gap-2 ">
            <span className="text-sm font-medium">
              {selectedRows.length} Rent
              {selectedRows.length > 1 ? 's' : ''} selected
            </span>
            <Separator orientation="vertical" className="h-4" />
            {/* View button: only when exactly 1 selected */}
            {selectedRows.length === 1 && (
              <Button
                variant="outline"
                onClick={() => {
                  const id = selectedRows[0]?.id;
                  if (!id) {
                    toast({
                      type: 'error',
                      title: 'Missing ID',
                      description:
                        'Selected row does not contain a contract ID.',
                    });
                    return;
                  }
                  setContractId(id);
                  setContractOpen(true);
                }}
                className="inline-flex items-center gap-2"
              >
                <FileText size={20} />
                View
              </Button>
            )}

            {/* PDF button: only when exactly 1 selected */}
            {selectedRows.length === 1 && (
              <Button
                variant="outline"
                onClick={async () => {
                  const row = selectedRows[0];
                  const contractId =
                    row?.rentContractId ||
                    (row?.rentNumber && row?.year
                      ? `${String(row.rentNumber).padStart(3, '0')}/${row.year}`
                      : `#${String(row?.id || '').slice(0, 8)}`);

                  try {
                    // Ensure downloadRentContractPDF triggers a browser download
                    // and throws on non-200 responses.
                    await downloadRentContractPDF(row.id);
                    toast({
                      type: 'success',
                      title: 'Download Started',
                      description: `Contract ${contractId} is being downloaded.`,
                    });
                  } catch (error: any) {
                    const msg =
                      error?.response?.data?.message ||
                      error?.response?.data?.error ||
                      error?.message ||
                      'Failed to download contract. Please try again.';
                    toast({
                      type: 'error',
                      title: 'Download Failed',
                      description: msg,
                    });
                  }
                }}
              >
                <Download size={20} />
                PDF
              </Button>
            )}

            {/* Delete button: still supports multiple */}
            <Button
              variant="secondary"
              className="ml-auto flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white"
              onClick={() => setShowDeleteDialog(true)}
              disabled={selectedRows.length === 0}
            >
              <Trash size={20} />
              Delete ({deletableCount}/{selectedRows.length})
            </Button>

            {activeCount > 0 && (
              <span className="text-xs text-yellow-600">
                {activeCount} active rental(s) cannot be deleted
              </span>
            )}
          </div>
        </div>
      )}

      {isLoading || isFetching ? (
        <p className="text-center">Loading rent contracts...</p>
      ) : (
        <>
          {/* Match CarsGrid style: fixed height scrollable grid */}
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

          {/* Pagination outside scroll area */}
          <div className="mt-4 flex items-center justify-between">
            {' '}
            <Pagination className="mt-4">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    aria-disabled={page === 1}
                  />
                </PaginationItem>
                {getPageNumbers().map((p, idx, arr) => (
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
                ))}
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
        title="Confirmation"
        description={
          activeCount > 0
            ? `${deletableCount} rental(s) will be deleted. ${activeCount} active rental(s) will be skipped as they cannot be deleted.`
            : `Are you sure you want to delete the selected ${deletableCount} rental contract(s)?`
        }
        confirmText="Delete"
        cancelText="Cancel"
        loadingText="Deleting..."
        variant="destructive"
      />
      <ContractDialog
        open={contractOpen}
        onOpenChange={setContractOpen}
        contractId={contractId}
        title={
          selectedRows.length === 1
            ? `${selectedRows[0]?.carModel ?? 'Contract'}`
            : 'Contract Preview'
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
          // 🆕 Pass the new fields to the dialog
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
