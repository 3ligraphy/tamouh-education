import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Table,
  TableHeader,
  TableBody,
  TableColumn,
  TableRow,
  TableCell,
  Tabs,
  Tab,
  Chip,
  Button,
  Pagination,
} from "@heroui/react";

import { api } from "@/trpc/react";

export default function TransactionsManagement() {
  const t = useTranslations("transactions_management");
  const [selectedTab, setSelectedTab] = useState("WALLET");
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch transactions using separate endpoints
  const { data: walletTransactions, isLoading: isLoadingWallet } =
    api.transactions.getWalletTransactions.useQuery(
      {
        page,
        limit: itemsPerPage,
      },
      {
        enabled: selectedTab === "WALLET",
      }
    );

  const { data: courseTransactions, isLoading: isLoadingCourse } =
    api.transactions.getCourseTransactions.useQuery(
      {
        page,
        limit: itemsPerPage,
      },
      {
        enabled: selectedTab === "COURSE",
      }
    );

  const WalletTransactionsTable = ({ transactions, isLoading }) => {
    const columnCount = 6;

    if (isLoading) {
      return (
        <Table aria-label="Wallet Transactions">
          <TableHeader>
            <TableColumn>{t("user")}</TableColumn>
            <TableColumn>{t("type")}</TableColumn>
            <TableColumn>{t("amount")}</TableColumn>
            <TableColumn>{t("status")}</TableColumn>
            <TableColumn>{t("date")}</TableColumn>
            <TableColumn>{t("actions")}</TableColumn>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>{t("loading")}</TableCell>
              <TableCell>-</TableCell>
              <TableCell>-</TableCell>
              <TableCell>-</TableCell>
              <TableCell>-</TableCell>
              <TableCell>-</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
    }

    if (!transactions?.items?.length) {
      return (
        <div className="flex justify-center p-8">
          <div className="text-gray-500">{t("no_transactions")}</div>
        </div>
      );
    }

    return (
      <Table aria-label="Wallet Transactions">
        <TableHeader>
          <TableColumn>{t("user")}</TableColumn>
          <TableColumn>{t("type")}</TableColumn>
          <TableColumn>{t("amount")}</TableColumn>
          <TableColumn>{t("status")}</TableColumn>
          <TableColumn>{t("date")}</TableColumn>
          <TableColumn>{t("actions")}</TableColumn>
        </TableHeader>
        <TableBody>
          {transactions.items.map((transaction) => (
            <TableRow key={transaction.id}>
              <TableCell>
                {transaction.wallet.user.name || transaction.wallet.user.email}
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
              <TableCell>{transaction.amount}</TableCell>
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
                {transaction.invoiceUrl ? (
                  <Button
                    size="sm"
                    variant="light"
                    onClick={() =>
                      window.open(transaction.invoiceUrl, "_blank")
                    }
                  >
                    {t("view_invoice")}
                  </Button>
                ) : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  const CourseTransactionsTable = ({ transactions, isLoading }) => {
    const columnCount = 6;

    if (isLoading) {
      return (
        <Table aria-label="Course Transactions">
          <TableHeader>
            <TableColumn>{t("user")}</TableColumn>
            <TableColumn>{t("course")}</TableColumn>
            <TableColumn>{t("price")}</TableColumn>
            <TableColumn>{t("status")}</TableColumn>
            <TableColumn>{t("purchase_date")}</TableColumn>
            <TableColumn>{t("valid_until")}</TableColumn>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>{t("loading")}</TableCell>
              <TableCell>-</TableCell>
              <TableCell>-</TableCell>
              <TableCell>-</TableCell>
              <TableCell>-</TableCell>
              <TableCell>-</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
    }

    if (!transactions?.items?.length) {
      return (
        <div className="flex justify-center p-8">
          <div className="text-gray-500">{t("no_transactions")}</div>
        </div>
      );
    }

    return (
      <Table aria-label="Course Transactions">
        <TableHeader>
          <TableColumn>{t("user")}</TableColumn>
          <TableColumn>{t("course")}</TableColumn>
          <TableColumn>{t("price")}</TableColumn>
          <TableColumn>{t("status")}</TableColumn>
          <TableColumn>{t("purchase_date")}</TableColumn>
          <TableColumn>{t("valid_until")}</TableColumn>
        </TableHeader>
        <TableBody>
          {transactions.items.map((transaction) => (
            <TableRow key={transaction.id}>
              <TableCell>
                {transaction.user.name || transaction.user.email}
              </TableCell>
              <TableCell>
                {transaction.course.translations.find(
                  (t) => t.language === "en"
                )?.courseTitle || transaction.course.c_ID}
              </TableCell>
              <TableCell>{transaction.purchasePrice}</TableCell>
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
                {transaction.validUntil
                  ? new Date(transaction.validUntil).toLocaleDateString()
                  : t("unlimited")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  const currentTransactions =
    selectedTab === "WALLET" ? walletTransactions : courseTransactions;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">{t("transactions")}</h2>

      <Tabs
        selectedKey={selectedTab}
        onSelectionChange={(key) => {
          setSelectedTab(key);
          setPage(1);
        }}
      >
        <Tab key="WALLET" title={t("wallet_transactions")} />
        <Tab key="COURSE" title={t("course_transactions")} />
      </Tabs>

      {selectedTab === "WALLET" ? (
        <WalletTransactionsTable
          isLoading={isLoadingWallet}
          transactions={walletTransactions}
        />
      ) : (
        <CourseTransactionsTable
          isLoading={isLoadingCourse}
          transactions={courseTransactions}
        />
      )}

      {currentTransactions?.total > 0 && (
        <div className="flex flex-col items-center gap-2">
          <Pagination
            showControls
            page={page}
            total={currentTransactions.totalPages}
            onChange={setPage}
          />
          <div className="text-sm text-gray-500">
            {t("showing_items", {
              from: (page - 1) * itemsPerPage + 1,
              to: Math.min(page * itemsPerPage, currentTransactions.total),
              total: currentTransactions.total,
            })}
          </div>
        </div>
      )}
    </div>
  );
}
