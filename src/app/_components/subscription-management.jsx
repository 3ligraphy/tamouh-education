import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  Table,
  TableHeader,
  TableBody,
  TableColumn,
  TableRow,
  TableCell,
  Input,
  Button,
  Chip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Select,
  SelectItem,
  Image,
  Pagination,
  Spinner,
  Tooltip,
} from "@heroui/react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/solid";
import clsx from "clsx";
import { Filter } from "lucide-react";

import { EyeIcon } from "@/app/_components/EyeIcon";
import { EditIcon } from "@/app/_components/EditIcon";
import { api } from "@/trpc/react";

const ROWS_PER_PAGE = 10;

export default function SubscriptionManagement() {
  const t = useTranslations("admin_dashboard.subscriptions_tab");
  const [filterValue, setFilterValue] = useState("");
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [planFilter, setPlanFilter] = useState("ALL");
  const [showFilters, setShowFilters] = useState(false);
  const {
    isOpen: isInvoiceOpen,
    onOpen: onInvoiceOpen,
    onClose: onInvoiceClose,
  } = useDisclosure();
  const {
    isOpen: isStatusOpen,
    onOpen: onStatusOpen,
    onClose: onStatusClose,
  } = useDisclosure();

  // Fetch subscriptions using tRPC
  const { data: subscriptions, isLoading } = api.subscription.getAll.useQuery(
    undefined,
    {
      refetchOnWindowFocus: false,
    }
  );
  const updateSubscriptionStatus = api.subscription.updateStatus.useMutation({
    onSuccess: () => {
      // Invalidate the query to refetch the data
      utils.subscription.getAll.invalidate();
    },
  });

  const utils = api.useUtils();

  const handleSearch = (value) => {
    setFilterValue(value);
    setPage(1);
  };

  const filteredSubscriptions = useMemo(() => {
    let filtered = subscriptions || [];

    if (filterValue) {
      filtered = filtered.filter((subscription) => {
        return (
          subscription.user.name
            .toLowerCase()
            .includes(filterValue.toLowerCase()) ||
          subscription.id.toLowerCase().includes(filterValue.toLowerCase())
        );
      });
    }

    if (statusFilter !== "ALL") {
      filtered = filtered.filter(
        (subscription) => subscription.status === statusFilter
      );
    }

    if (planFilter !== "ALL") {
      filtered = filtered.filter(
        (subscription) => subscription.planType === planFilter
      );
    }

    return filtered;
  }, [subscriptions, filterValue, statusFilter, planFilter]);

  // Calculate pagination
  const pages = Math.ceil(filteredSubscriptions.length / ROWS_PER_PAGE);
  const paginatedSubscriptions = useMemo(() => {
    const start = (page - 1) * ROWS_PER_PAGE;
    const end = start + ROWS_PER_PAGE;

    return filteredSubscriptions.slice(start, end);
  }, [filteredSubscriptions, page]);

  const handleStatusChange = async (newStatus) => {
    if (!selectedSubscription) return;

    try {
      await updateSubscriptionStatus.mutateAsync({
        id: selectedSubscription.id,
        status: newStatus,
      });
      onStatusClose();
    } catch (error) {
      console.error("Failed to update subscription status:", error);
    }
  };

  const statusColorMap = {
    COMPLETED: "success",
    PENDING: "warning",
    FAILED: "danger",
    CANCELLED: "danger",
  };

  const columns = [
    { name: t("name"), uid: "name" },
    { name: t("subscription_id"), uid: "id" },
    { name: t("subscription_type"), uid: "planType" },
    { name: t("date"), uid: "startDate" },
    { name: t("status"), uid: "status" },
    { name: t("actions"), uid: "actions" },
  ];

  const renderCell = (subscription, columnKey) => {
    switch (columnKey) {
      case "name":
        return (
          <div className="flex items-center gap-2">
            <div className="flex flex-col">
              <p>{subscription.user.name}</p>
              <p className="text-small text-default-500">
                {subscription.user.email}
              </p>
            </div>
          </div>
        );
      case "planType":
        return t(
          `edit_modal.subscription_details.plan_types.${subscription.planType.toLowerCase()}`
        );
      case "startDate":
        return new Date(subscription.startDate).toLocaleDateString();
      case "status":
        return (
          <Chip color={statusColorMap[subscription.status]} variant="flat">
            {t(
              `edit_modal.subscription_details.payment_statuses.${subscription.status.toLowerCase()}`
            )}
          </Chip>
        );
      case "actions":
        return (
          <div className="flex gap-2">
            <Tooltip content={t("tooltips.view_invoice")}>
              <button
                className="text-gray-400 hover:text-primary transition-colors p-1"
                onClick={() => {
                  setSelectedSubscription(subscription);
                  onInvoiceOpen();
                }}
              >
                <EyeIcon className="w-5 h-5" />
              </button>
            </Tooltip>
            <Tooltip content={t("tooltips.change_status")}>
              <button
                className="text-gray-400 hover:text-warning transition-colors p-1"
                onClick={() => {
                  setSelectedSubscription(subscription);
                  onStatusOpen();
                }}
              >
                <EditIcon className="w-5 h-5" />
              </button>
            </Tooltip>
          </div>
        );
      default:
        return subscription[columnKey];
    }
  };

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between gap-3">
          <Input
            isClearable
            className="w-full sm:max-w-[44%]"
            placeholder={t("search_placeholder")}
            startContent={
              <MagnifyingGlassIcon className="h-6 w-6 text-default-300" />
            }
            value={filterValue}
            onClear={() => setFilterValue("")}
            onValueChange={handleSearch}
          />
          <Button
            className="sm:max-w-[100px]"
            color={showFilters ? "primary" : "default"}
            endContent={<Filter className="h-6 w-6" />}
            variant={showFilters ? "flat" : "bordered"}
            onPress={() => setShowFilters(!showFilters)}
          >
            {t("filters.title")}
          </Button>
        </div>

        {/* Filters Section */}
        <div
          className={clsx(
            "grid gap-4 transition-all duration-200",
            showFilters
              ? "grid-cols-1 sm:grid-cols-2 opacity-100"
              : "h-0 overflow-hidden opacity-0"
          )}
        >
          <Select
            className="w-full"
            label={t("filters.status.label")}
            selectedKeys={[statusFilter]}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <SelectItem key="ALL" value="ALL">
              {t("filters.status.all")}
            </SelectItem>
            <SelectItem key="COMPLETED" value="COMPLETED">
              {t("edit_modal.subscription_details.payment_statuses.completed")}
            </SelectItem>
            <SelectItem key="PENDING" value="PENDING">
              {t("edit_modal.subscription_details.payment_statuses.pending")}
            </SelectItem>
            <SelectItem key="FAILED" value="FAILED">
              {t("edit_modal.subscription_details.payment_statuses.failed")}
            </SelectItem>
            <SelectItem key="CANCELLED" value="CANCELLED">
              {t("edit_modal.subscription_details.payment_statuses.cancelled")}
            </SelectItem>
          </Select>

          <Select
            className="w-full"
            label={t("filters.plan.label")}
            selectedKeys={[planFilter]}
            onChange={(e) => setPlanFilter(e.target.value)}
          >
            <SelectItem key="ALL" value="ALL">
              {t("filters.plan.all")}
            </SelectItem>
            <SelectItem key="MONTHLY" value="MONTHLY">
              {t("edit_modal.subscription_details.plan_types.monthly")}
            </SelectItem>
            <SelectItem key="QUARTERLY" value="QUARTERLY">
              {t("edit_modal.subscription_details.plan_types.quarterly")}
            </SelectItem>
            <SelectItem key="YEARLY" value="YEARLY">
              {t("edit_modal.subscription_details.plan_types.yearly")}
            </SelectItem>
          </Select>
        </div>
      </div>

      <Table
        aria-label="Subscriptions table"
        bottomContent={
          pages > 0 ? (
            <div className="flex w-full justify-center">
              <Pagination
                isCompact
                showControls
                showShadow
                color="primary"
                page={page}
                total={pages}
                onChange={setPage}
              />
            </div>
          ) : null
        }
      >
        <TableHeader columns={columns}>
          {(column) => (
            <TableColumn key={column.uid}>{column.name}</TableColumn>
          )}
        </TableHeader>
        <TableBody
          items={paginatedSubscriptions}
          loadingContent={<Spinner />}
          loadingState={isLoading ? "loading" : "idle"}
        >
          {(subscription) => (
            <TableRow key={subscription.id}>
              {(columnKey) => (
                <TableCell>{renderCell(subscription, columnKey)}</TableCell>
              )}
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Invoice Modal */}
      <Modal isOpen={isInvoiceOpen} size="2xl" onClose={onInvoiceClose}>
        <ModalContent>
          <ModalHeader>{t("invoice_details")}</ModalHeader>
          <ModalBody>
            {selectedSubscription ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="font-semibold">{t("user")}</p>
                    <p>{selectedSubscription.user.name}</p>
                  </div>
                  <div>
                    <p className="font-semibold">{t("subscription_id")}</p>
                    <p>{selectedSubscription.id}</p>
                  </div>
                  <div>
                    <p className="font-semibold">{t("subscription_type")}</p>
                    <p>
                      {t(
                        `edit_modal.subscription_details.plan_types.${selectedSubscription.planType.toLowerCase()}`
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold">{t("date")}</p>
                    <p>
                      {new Date(
                        selectedSubscription.startDate
                      ).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {selectedSubscription.notes ? (
                  <div>
                    <p className="font-semibold">
                      {t("edit_modal.subscription_details.notes")}
                    </p>
                    <p>{selectedSubscription.notes}</p>
                  </div>
                ) : null}
                {selectedSubscription.invoiceImage ? (
                  <div>
                    <p className="font-semibold mb-2">
                      {t("edit_modal.subscription_details.invoice.title")}
                    </p>
                    <Image
                      alt="Invoice"
                      className="max-w-full h-auto"
                      src={selectedSubscription.invoiceImage}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onInvoiceClose}>
              {t("close")}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Status Change Modal */}
      <Modal isOpen={isStatusOpen} onClose={onStatusClose}>
        <ModalContent>
          <ModalHeader>{t("change_status")}</ModalHeader>
          <ModalBody>
            <Select
              label={t("select_status")}
              selectedKeys={
                selectedSubscription ? [selectedSubscription.status] : []
              }
              onChange={(e) =>
                setSelectedSubscription({
                  ...selectedSubscription,
                  status: e.target.value,
                })
              }
            >
              <SelectItem key="COMPLETED" value="COMPLETED">
                {t(
                  "edit_modal.subscription_details.payment_statuses.completed"
                )}
              </SelectItem>
              <SelectItem key="PENDING" value="PENDING">
                {t("edit_modal.subscription_details.payment_statuses.pending")}
              </SelectItem>
              <SelectItem key="FAILED" value="FAILED">
                {t("edit_modal.subscription_details.payment_statuses.failed")}
              </SelectItem>
              <SelectItem key="CANCELLED" value="CANCELLED">
                {t(
                  "edit_modal.subscription_details.payment_statuses.cancelled"
                )}
              </SelectItem>
            </Select>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onStatusClose}>
              {t("cancel")}
            </Button>
            <Button
              color="primary"
              isLoading={updateSubscriptionStatus.isLoading}
              startContent={
                updateSubscriptionStatus.isLoading ? (
                  <Spinner size="sm" />
                ) : null
              }
              onPress={() => handleStatusChange(selectedSubscription.status)}
            >
              {t("buttons.save_changes")}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
