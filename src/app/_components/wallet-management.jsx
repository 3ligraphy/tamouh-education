import { useState, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  Table,
  TableHeader,
  TableBody,
  TableColumn,
  TableRow,
  TableCell,
  Button,
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Chip,
  Tabs,
  Tab,
  Select,
  SelectItem,
  Pagination,
  Card,
  CardBody,
  Autocomplete,
  AutocompleteItem,
} from "@heroui/react";
import { toast } from "sonner";
import { ChartBar, Check, Download } from "lucide-react";
import { XMarkIcon } from "@heroicons/react/24/solid";

import { api } from "@/trpc/react";

export default function WalletManagement() {
  const t = useTranslations("wallet_management");
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isAdjustmentOpen,
    onOpen: onAdjustmentOpen,
    onClose: onAdjustmentClose,
  } = useDisclosure();
  const {
    isOpen: isStatsOpen,
    onOpen: onStatsOpen,
    onClose: onStatsClose,
  } = useDisclosure();
  const {
    isOpen: isInvoiceOpen,
    onOpen: onInvoiceOpen,
    onClose: onInvoiceClose,
  } = useDisclosure();

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [creditAmount, setCreditAmount] = useState("");
  const [page, setPage] = useState(1);
  const [selectedTab, setSelectedTab] = useState("pending");
  const [adjustmentData, setAdjustmentData] = useState({
    userId: "",
    amount: "",
    reason: "",
  });
  const [selectedTransactions, setSelectedTransactions] = useState(new Set());
  const [userSearch, setUserSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);

  // Filters for transactions with "all" as default
  const [filters, setFilters] = useState({
    type: "all",
    status: "all",
    userId: "",
    startDate: "",
    endDate: "",
  });

  const itemsPerPage = 10;

  // Fetch pending credit purchase requests with error handling
  const { data: creditRequests, refetch: refetchRequests } =
    api.wallet.getPendingCreditRequests.useQuery(
      {
        page,
        limit: itemsPerPage,
      },
      {
        retry: false,
        onError: (error) => {
          toast.error(error.message);
        },
      }
    );

  // Fetch all transactions without filters
  const { data: allTransactions, refetch: refetchTransactions } =
    api.wallet.getAllTransactions.useQuery(
      {
        page: 1,
        limit: 1000, // Get more items since we're filtering client-side
      },
      {
        retry: false,
        onError: (error) => {
          toast.error(error.message);
        },
      }
    );

  // Filter transactions on the client side
  const filteredTransactions = useMemo(() => {
    if (!allTransactions?.items) return [];

    return allTransactions.items.filter((transaction) => {
      // Type filter
      if (filters.type !== "all" && transaction.type !== filters.type) {
        return false;
      }

      // Status filter
      if (filters.status !== "all" && transaction.status !== filters.status) {
        return false;
      }

      // Date range filter
      if (filters.startDate) {
        const startDate = new Date(filters.startDate);
        const transactionDate = new Date(transaction.createdAt);

        if (transactionDate < startDate) {
          return false;
        }
      }

      if (filters.endDate) {
        const endDate = new Date(filters.endDate);

        endDate.setHours(23, 59, 59); // Include the entire end day
        const transactionDate = new Date(transaction.createdAt);

        if (transactionDate > endDate) {
          return false;
        }
      }

      return true;
    });
  }, [allTransactions?.items, filters]);

  // Handle client-side pagination
  const paginatedTransactions = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;

    return filteredTransactions.slice(start, end);
  }, [filteredTransactions, page, itemsPerPage]);

  // Update pagination total based on filtered results
  const paginationTotal = Math.max(
    1,
    Math.ceil(
      (selectedTab === "pending"
        ? creditRequests?.total || 0
        : filteredTransactions.length) / itemsPerPage
    )
  );

  // Statistics date range - initialize with empty strings instead of null
  const [statsDateRange, setStatsDateRange] = useState({
    startDate: "",
    endDate: "",
  });

  // Fetch transaction statistics with error handling
  const { data: stats } = api.wallet.getTransactionStats.useQuery(
    {
      startDate: statsDateRange.startDate
        ? new Date(statsDateRange.startDate)
        : undefined,
      endDate: statsDateRange.endDate
        ? new Date(statsDateRange.endDate)
        : undefined,
    },
    {
      retry: false,
      onError: (error) => {
        toast.error(error.message);
      },
    }
  );

  // Search users for credit adjustment
  const { data: searchResults } = api.wallet.searchUsers.useQuery(
    { query: userSearch },
    {
      enabled: userSearch.length > 0,
      retry: false,
      onError: (error) => {
        toast.error(error.message);
      },
    }
  );

  // Export mutation
  const exportMutation = api.wallet.exportTransactions.useMutation({
    onSuccess: (data) => {
      // Create and download CSV file
      const blob = new Blob([data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");

      a.href = url;
      a.download = `transactions-${new Date().toISOString()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Bulk process mutation
  const bulkProcessMutation = api.wallet.bulkProcessRequests.useMutation({
    onSuccess: () => {
      toast.success(t("bulk_process_success"));
      refetchRequests();
      refetchTransactions();
      setSelectedTransactions(new Set());
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Mutation for approving credit
  const approveCreditMutation = api.wallet.approveCredit.useMutation({
    onSuccess: () => {
      toast.success(t("credit_approved"));
      refetchRequests();
      refetchTransactions();
      onClose();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Mutation for rejecting credit
  const rejectCreditMutation = api.wallet.rejectCredit.useMutation({
    onSuccess: () => {
      toast.success(t("credit_rejected"));
      refetchRequests();
      refetchTransactions();
      onClose();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Mutation for credit adjustment
  const adjustCreditMutation = api.wallet.adjustCredit.useMutation({
    onSuccess: () => {
      toast.success(t("credit_adjusted"));
      refetchTransactions();
      onAdjustmentClose();
      setAdjustmentData({ userId: "", amount: "", reason: "" });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Debounced user search
  const debouncedSearch = useMemo(() => {
    let timeoutId;

    return (value) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setUserSearch(value);
      }, 300);
    };
  }, []);

  const handleApprove = useCallback(() => {
    if (!selectedRequest || !creditAmount) return;

    approveCreditMutation.mutate({
      transactionId: selectedRequest.id,
      amount: parseFloat(creditAmount),
    });
  }, [selectedRequest, creditAmount, approveCreditMutation]);

  const handleReject = useCallback(() => {
    if (!selectedRequest) return;

    rejectCreditMutation.mutate({
      transactionId: selectedRequest.id,
    });
  }, [selectedRequest, rejectCreditMutation]);

  const handleAdjustment = useCallback(() => {
    if (
      !adjustmentData.userId ||
      !adjustmentData.amount ||
      !adjustmentData.reason
    )
      return;

    adjustCreditMutation.mutate({
      userId: adjustmentData.userId,
      amount: parseFloat(adjustmentData.amount),
      reason: adjustmentData.reason,
    });
  }, [adjustmentData, adjustCreditMutation]);

  const openModal = useCallback(
    (request) => {
      setSelectedRequest(request);
      setCreditAmount(request.amount.toString());
      onOpen();
    },
    [onOpen]
  );

  const handleExport = useCallback(() => {
    exportMutation.mutate({
      ...filters,
      startDate: filters.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters.endDate ? new Date(filters.endDate) : undefined,
    });
  }, [exportMutation, filters]);

  const handleBulkAction = useCallback(
    (action) => {
      console.log("Selected Transactions:", selectedTransactions); // Debug log
      const selectedIds = Array.from(selectedTransactions);

      // Ensure we have valid MongoDB ObjectIds
      const validIds = selectedIds.filter((id) => /^[0-9a-fA-F]{24}$/.test(id));

      if (validIds.length === 0) {
        toast.error(t("no_valid_transactions"));

        return;
      }

      console.log("Valid IDs:", validIds); // Debug log
      bulkProcessMutation.mutate({
        transactionIds: validIds,
        action,
      });
    },
    [bulkProcessMutation, selectedTransactions, t]
  );

  // Reset form when modal closes
  const handleAdjustmentClose = useCallback(() => {
    setAdjustmentData({ userId: "", amount: "", reason: "" });
    setUserSearch("");
    setSelectedUser(null);
    onAdjustmentClose();
  }, [onAdjustmentClose]);

  const renderStatistics = () => (
    <Modal isOpen={isStatsOpen} size="2xl" onClose={onStatsClose}>
      <ModalContent>
        <ModalHeader>{t("transaction_statistics")}</ModalHeader>
        <ModalBody>
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <Input
                className="flex-1"
                label={t("start_date")}
                type="date"
                value={statsDateRange.startDate}
                onChange={(e) =>
                  setStatsDateRange({
                    ...statsDateRange,
                    startDate: e.target.value,
                  })
                }
              />
              <Input
                className="flex-1"
                label={t("end_date")}
                type="date"
                value={statsDateRange.endDate}
                onChange={(e) =>
                  setStatsDateRange({
                    ...statsDateRange,
                    endDate: e.target.value,
                  })
                }
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card>
                <CardBody>
                  <h3 className="text-lg font-semibold">
                    {t("credit_purchases")}
                  </h3>
                  <p className="text-2xl font-bold">
                    {stats?.creditPurchases.total.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {t("count")}: {stats?.creditPurchases.count}
                  </p>
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <h3 className="text-lg font-semibold">
                    {t("course_purchases")}
                  </h3>
                  <p className="text-2xl font-bold">
                    {stats?.coursePurchases.total.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {t("count")}: {stats?.coursePurchases.count}
                  </p>
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <h3 className="text-lg font-semibold">{t("refunds")}</h3>
                  <p className="text-2xl font-bold">
                    {stats?.refunds.total.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {t("count")}: {stats?.refunds.count}
                  </p>
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <h3 className="text-lg font-semibold">
                    {t("average_transaction")}
                  </h3>
                  <p className="text-2xl font-bold">
                    {stats?.averageAmount.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {t("pending")}: {stats?.pendingRequests}
                  </p>
                </CardBody>
              </Card>
            </div>

            <div>
              <h3 className="mb-2 text-lg font-semibold">{t("top_users")}</h3>
              <Table aria-label="Top Users">
                <TableHeader>
                  <TableColumn>{t("user")}</TableColumn>
                  <TableColumn>{t("transactions")}</TableColumn>
                  <TableColumn>{t("total_amount")}</TableColumn>
                </TableHeader>
                <TableBody>
                  {stats?.topUsers.map((user) => (
                    <TableRow key={user.user.id}>
                      <TableCell>{user.user.name || user.user.email}</TableCell>
                      <TableCell>{user.transactionCount}</TableCell>
                      <TableCell>{user.totalAmount.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  );

  const renderPendingRequests = () => (
    <>
      <div className="mb-4 flex flex-col sm:flex-row justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <Button
            className="flex-1 sm:flex-none"
            color="primary"
            isDisabled={selectedTransactions.size === 0}
            startContent={<Check className="h-4 w-4" />}
            onClick={() => handleBulkAction("APPROVE")}
          >
            {t("approve_selected")}
          </Button>
          <Button
            className="flex-1 sm:flex-none"
            color="danger"
            isDisabled={selectedTransactions.size === 0}
            startContent={<XMarkIcon className="h-4 w-4" />}
            onClick={() => handleBulkAction("REJECT")}
          >
            {t("reject_selected")}
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table
          aria-label="Credit Purchase Requests"
          classNames={{
            wrapper: "min-w-[600px]",
          }}
          selectedKeys={selectedTransactions}
          selectionMode="multiple"
          onSelectionChange={(selection) => {
            const selectedIds = Array.from(selection)
              .map((key) => {
                const request = creditRequests?.items.find(
                  (item) => item.id === key
                );

                return request?.id;
              })
              .filter(Boolean);

            setSelectedTransactions(new Set(selectedIds));
          }}
        >
          <TableHeader>
            <TableColumn>
              <div className="flex items-center gap-2">
                <span>{t("user")}</span>
              </div>
            </TableColumn>
            <TableColumn>{t("amount")}</TableColumn>
            <TableColumn>{t("invoice")}</TableColumn>
            <TableColumn>{t("date")}</TableColumn>
            <TableColumn>{t("status")}</TableColumn>
            <TableColumn>{t("actions")}</TableColumn>
          </TableHeader>
          <TableBody>
            {creditRequests?.items.map((request) => (
              <TableRow key={request.id} className="cursor-pointer">
                <TableCell>
                  {request.wallet.user.name || request.wallet.user.email}
                </TableCell>
                <TableCell>{request.amount}</TableCell>
                <TableCell>
                  {request.invoiceUrl ? (
                    <Button
                      size="sm"
                      variant="light"
                      onClick={() => {
                        setSelectedRequest(request);
                        onInvoiceOpen();
                      }}
                    >
                      {t("view_invoice")}
                    </Button>
                  ) : null}
                </TableCell>
                <TableCell>
                  {new Date(request.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Chip
                    color={
                      request.status === "PENDING"
                        ? "warning"
                        : request.status === "COMPLETED"
                          ? "success"
                          : "danger"
                    }
                  >
                    {request.status}
                  </Chip>
                </TableCell>
                <TableCell>
                  <Button
                    color="primary"
                    size="sm"
                    onClick={() => openModal(request)}
                  >
                    {t("review")}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );

  const renderAllTransactions = () => (
    <>
      <div className="mb-4 flex flex-col sm:flex-row gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
          <Select
            disallowEmptySelection
            isRequired
            label={t("type")}
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
          >
            <SelectItem key="all" value="all">
              {t("all")}
            </SelectItem>
            <SelectItem key="CREDIT_PURCHASE" value="CREDIT_PURCHASE">
              {t("credit_purchase")}
            </SelectItem>
            <SelectItem key="COURSE_PURCHASE" value="COURSE_PURCHASE">
              {t("course_purchase")}
            </SelectItem>
            <SelectItem key="REFUND" value="REFUND">
              {t("refund")}
            </SelectItem>
            <SelectItem key="CREDIT_ADJUSTMENT" value="CREDIT_ADJUSTMENT">
              {t("adjustment")}
            </SelectItem>
          </Select>
          <Select
            disallowEmptySelection
            isRequired
            label={t("status")}
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <SelectItem key="all" value="all">
              {t("all")}
            </SelectItem>
            <SelectItem key="PENDING" value="PENDING">
              {t("pending")}
            </SelectItem>
            <SelectItem key="COMPLETED" value="COMPLETED">
              {t("completed")}
            </SelectItem>
            <SelectItem key="FAILED" value="FAILED">
              {t("failed")}
            </SelectItem>
            <SelectItem key="CANCELLED" value="CANCELLED">
              {t("cancelled")}
            </SelectItem>
          </Select>
          <Input
            label={t("start_date")}
            type="date"
            value={filters.startDate}
            onChange={(e) =>
              setFilters({ ...filters, startDate: e.target.value })
            }
          />
          <Input
            label={t("end_date")}
            type="date"
            value={filters.endDate}
            onChange={(e) =>
              setFilters({ ...filters, endDate: e.target.value })
            }
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table
          aria-label="All Transactions"
          classNames={{
            wrapper: "min-w-[600px]",
          }}
        >
          <TableHeader>
            <TableColumn>{t("user")}</TableColumn>
            <TableColumn>{t("type")}</TableColumn>
            <TableColumn>{t("amount")}</TableColumn>
            <TableColumn>{t("status")}</TableColumn>
            <TableColumn>{t("date")}</TableColumn>
            <TableColumn>{t("notes")}</TableColumn>
          </TableHeader>
          <TableBody>
            {paginatedTransactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell>
                  {transaction.wallet.user.name ||
                    transaction.wallet.user.email}
                </TableCell>
                <TableCell>
                  <Chip
                    color={
                      transaction.type === "CREDIT_PURCHASE"
                        ? "success"
                        : transaction.type === "COURSE_PURCHASE"
                          ? "primary"
                          : transaction.type === "REFUND"
                            ? "warning"
                            : "default"
                    }
                  >
                    {transaction.type}
                  </Chip>
                </TableCell>
                <TableCell>
                  <span
                    className={
                      transaction.type === "CREDIT_PURCHASE" ||
                      transaction.type === "REFUND" ||
                      (transaction.type === "CREDIT_ADJUSTMENT" &&
                        transaction.amount > 0)
                        ? "text-success"
                        : "text-danger"
                    }
                  >
                    {transaction.type === "CREDIT_PURCHASE" ||
                    transaction.type === "REFUND" ||
                    (transaction.type === "CREDIT_ADJUSTMENT" &&
                      transaction.amount > 0)
                      ? "+"
                      : "-"}
                    {Math.abs(transaction.amount).toFixed(2)}
                  </span>
                </TableCell>
                <TableCell>
                  <Chip
                    color={
                      transaction.status === "COMPLETED"
                        ? "success"
                        : transaction.status === "PENDING"
                          ? "warning"
                          : "danger"
                    }
                  >
                    {transaction.status}
                  </Chip>
                </TableCell>
                <TableCell>
                  {new Date(transaction.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <div className="max-w-xs truncate">{transaction.notes}</div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-2">
        <h2 className="text-2xl font-bold">{t("wallet_management")}</h2>
        <div className="flex flex-wrap justify-center sm:justify-end gap-2 w-full sm:w-auto">
          <Button
            className="flex-1 sm:flex-none"
            color="primary"
            startContent={<ChartBar className="h-4 w-4" />}
            variant="flat"
            onPress={onStatsOpen}
          >
            {t("statistics")}
          </Button>
          <Button
            className="flex-1 sm:flex-none"
            color="primary"
            startContent={<Download className="h-4 w-4" />}
            variant="flat"
            onPress={handleExport}
          >
            {t("export")}
          </Button>
          <Button
            className="flex-1 sm:flex-none"
            color="primary"
            onPress={onAdjustmentOpen}
          >
            {t("adjust_credit")}
          </Button>
        </div>
      </div>

      <Tabs
        className="overflow-x-auto"
        selectedKey={selectedTab}
        onSelectionChange={(key) => {
          setSelectedTab(key);
          setPage(1);
        }}
      >
        <Tab key="pending" title={t("pending_requests")}>
          {renderPendingRequests()}
        </Tab>
        <Tab key="all" title={t("all_transactions")}>
          {renderAllTransactions()}
        </Tab>
      </Tabs>

      <div className="flex justify-center">
        <Pagination
          classNames={{
            cursor: "bg-primary",
          }}
          page={page}
          total={paginationTotal}
          onChange={setPage}
        />
      </div>

      {/* Review Request Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalContent>
          <ModalHeader>{t("review_request")}</ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">{t("user")}:</p>
                <p>
                  {selectedRequest?.wallet.user.name ||
                    selectedRequest?.wallet.user.email}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">
                  {t("requested_amount")}:
                </p>
                <p>{selectedRequest?.amount}</p>
              </div>
              <Input
                label={t("credit_amount")}
                type="number"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button color="danger" variant="light" onPress={handleReject}>
              {t("reject")}
            </Button>
            <Button color="primary" onPress={handleApprove}>
              {t("approve")}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Credit Adjustment Modal with User Search */}
      <Modal isOpen={isAdjustmentOpen} onClose={handleAdjustmentClose}>
        <ModalContent>
          <ModalHeader>{t("adjust_credit")}</ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <Autocomplete
                defaultItems={searchResults || []}
                items={searchResults || []}
                label={t("search_user")}
                placeholder="Search by name or email"
                selectedKey={adjustmentData.userId}
                onInputChange={debouncedSearch}
                onSelectionChange={(userId) => {
                  const user = searchResults?.find((u) => u.id === userId);

                  setSelectedUser(user);
                  setAdjustmentData({
                    ...adjustmentData,
                    userId,
                  });
                }}
              >
                {(user) => (
                  <AutocompleteItem
                    key={user.id}
                    textValue={user.name || user.email}
                  >
                    <div className="flex flex-col gap-1">
                      <div>{user.name || user.email}</div>
                      <div className="text-sm text-gray-500">
                        {t("current_balance")}:{" "}
                        {user.wallet?.balance?.toFixed(2) || "0.00"}
                      </div>
                    </div>
                  </AutocompleteItem>
                )}
              </Autocomplete>

              {selectedUser ? (
                <div className="rounded-md bg-gray-50 p-3">
                  <p className="text-sm font-medium">{t("selected_user")}:</p>
                  <p>{selectedUser.name || selectedUser.email}</p>
                  <p className="text-sm text-gray-500">
                    {t("current_balance")}:{" "}
                    {selectedUser.wallet?.balance?.toFixed(2) || "0.00"}
                  </p>
                </div>
              ) : null}

              <Input
                helperText={t("negative_for_deduction")}
                label={t("amount")}
                type="number"
                value={adjustmentData.amount}
                onChange={(e) =>
                  setAdjustmentData({
                    ...adjustmentData,
                    amount: e.target.value,
                  })
                }
              />
              <Input
                label={t("reason")}
                value={adjustmentData.reason}
                onChange={(e) =>
                  setAdjustmentData({
                    ...adjustmentData,
                    reason: e.target.value,
                  })
                }
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              color="danger"
              variant="light"
              onPress={handleAdjustmentClose}
            >
              {t("cancel")}
            </Button>
            <Button
              color="primary"
              isDisabled={
                !selectedUser ||
                !adjustmentData.amount ||
                !adjustmentData.reason
              }
              onPress={handleAdjustment}
            >
              {t("confirm")}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {renderStatistics()}

      {/* Invoice Modal */}
      <Modal isOpen={isInvoiceOpen} size="4xl" onClose={onInvoiceClose}>
        <ModalContent>
          <ModalHeader>{t("invoice")}</ModalHeader>
          <ModalBody>
            <iframe
              className="h-[80vh] w-full"
              src={selectedRequest?.invoiceUrl}
              title="Invoice"
            />
          </ModalBody>
          <ModalFooter>
            <Button color="primary" onPress={onInvoiceClose}>
              {t("close")}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
