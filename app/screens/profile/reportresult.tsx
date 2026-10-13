import BackTitleHeader from "@/components/common/BackTitleHeader";
import {
  type AdminExpenseReport,
  type AdminGeneratedReport,
  type AdminPayrollReport,
  type AdminProjectInvoicesReport,
  type AdminWorkerPerformanceReport,
} from "@/api/admin/reports.api";
import { 
  useAdminGeneratedReportQuery,
  useExportAdminReportsMutation
} from "@/hooks/admin/reports";
import { usePullToRefresh } from "@/hooks/common/usePullToRefresh";
import { setCurrentPreviewDocument } from "@/components/company/taskdetails/documentPreviewStore";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const TYPE_TITLES: Record<string, string> = {
  payroll: "Payroll Report",
  project_invoices: "Project Invoices",
  worker_performance: "Worker Performance",
  expense: "Expense Reports",
};

type Invoice = {
  id: string;
  name: string;
  company: string;
  status: string;
  progress: number;
  billed: string;
  remaining: string;
  billableUnits: number;
};

type Worker = {
  id: string;
  workerId: string;
  name: string;
  role: string;
  avatarUrl: string | null;
  attendance: number;
  tasksDone: number;
  accent: string;
};

type Expense = {
  id: string;
  name: string;
  date: string;
  category: string;
  amount: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
};

type PayrollWorker = {
  id: string;
  name: string;
  role: string;
  hours: string;
  grossPay: string;
  netPay: string;
  status: string;
};

function formatCurrency(value?: number | null) {
  const amount = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatCompactCurrency(value?: number | null) {
  const amount = typeof value === "number" && Number.isFinite(value) ? value : 0;
  const hasDecimals = amount % 1 !== 0;
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

function formatHours(value?: number | null) {
  const amount = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return `${amount.toFixed(2)}h`;
}

function formatDateLabel(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "2-digit",
    year: "numeric",
  });
}

function parsePercent(value?: string | null) {
  if (!value) return 0;
  const parsed = Number.parseFloat(value.replace("%", ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatStatusLabel(value?: string | null) {
  return (value ?? "")
    .replace(/_/g, " ")
    .trim()
    .toUpperCase();
}

function getReportData<T extends AdminGeneratedReport["type"]>(
  report: AdminGeneratedReport | undefined,
  type: T,
) {
  return report?.type === type ? report : undefined;
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <View className="flex-1 rounded-lg border border-[#EDF1F5] bg-white px-4 py-4">
      <Text className="text-[18px] font-bold text-[#111827]">{value}</Text>
      <Text className="mt-1 text-[11px] font-semibold tracking-[0.5px] text-[#94A3B8]">
        {label}
      </Text>
    </View>
  );
}

function ExpenseStatCard({
  label,
  value,
  valueColor = "#111827",
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View
      className="flex-1 rounded-lg border border-[#E9EDF3] bg-white px-4 py-4"
      style={{
        shadowColor: "#0F172A",
        shadowOpacity: 0.05,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
      }}
    >
      <Text className="text-[11px] font-bold uppercase leading-4 tracking-[0.8px] text-[#6B7280]">
        {label}
      </Text>
      <Text className="mt-3 text-[22px] font-bold" style={{ color: valueColor }}>
        {value}
      </Text>
    </View>
  );
}

function InvoiceCard({ invoice }: { invoice: Invoice }) {
  return (
    <View
      className="mt-4 rounded-lg bg-white px-4 py-4"
      style={{
        shadowColor: "#0F172A",
        shadowOpacity: 0.06,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
      }}
    >
      {/* Title + status */}
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-[18px] font-bold text-[#111827]">
            {invoice.name}
          </Text>
          <Text className="mt-0.5 text-[13px] text-[#6B7280]">
            {invoice.company}
          </Text>
        </View>
        <View className="rounded-full bg-[#E7F6EE] px-3 py-1">
          <Text className="text-[11px] font-bold tracking-[0.5px] text-[#15925B]">
            {invoice.status}
          </Text>
        </View>
      </View>

      {/* Progress */}
      <View className="mt-4 flex-row items-center justify-between">
        <Text className="text-[12px] font-bold tracking-[0.5px] text-[#94A3B8]">
          PROGRESS
        </Text>
        <Text className="text-[14px] font-bold text-[#1D5478]">
          {invoice.progress}%
        </Text>
      </View>
      <View className="mt-2 h-[6px] w-full overflow-hidden rounded-full bg-[#E5EAF0]">
        <View
          className="h-full rounded-full bg-[#1D5478]"
          style={{ width: `${invoice.progress}%` }}
        />
      </View>

      {/* Billed / Remaining + download */}
      <View className="mt-4 flex-row items-end justify-between">
        <View>
          <Text className="text-[11px] font-bold tracking-[0.5px] text-[#94A3B8]">
            INVOICE TOTAL
          </Text>
          <Text className="mt-1 text-[17px] font-bold text-[#111827]">
            {invoice.billed}
          </Text>
        </View>
        <View>
          <Text className="text-[11px] font-bold tracking-[0.5px] text-[#94A3B8]">
            BILLABLE UNITS
          </Text>
          <Text className="mt-1 text-[15px] text-[#6B7280]">
            {invoice.billableUnits}
          </Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.85}
          className="h-10 w-10 items-center justify-center rounded-full bg-[#F1F5F9]"
        >
          <Ionicons name="download-outline" size={18} color="#64748B" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function WorkerCard({ worker }: { worker: Worker }) {
  const attendanceLow = worker.attendance === 0;
  return (
    <View
      className="mt-4 flex-row overflow-hidden rounded-lg bg-white"
      style={{
        shadowColor: "#0F172A",
        shadowOpacity: 0.06,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
      }}
    >
      {/* Accent bar */}
      <View style={{ width: 5, backgroundColor: worker.accent }} />

      <View className="flex-1 px-4 py-4">
        {/* Name + View Profile */}
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-[18px] font-bold text-[#111827]">
              {worker.name}
            </Text>
            <Text className="mt-0.5 text-[13px] text-[#6B7280]">
              {worker.role}
            </Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() =>
              router.push({
                pathname: "/screens/chat/userprofile",
                params: {
                  id: worker.workerId,
                  name: worker.name,
                  avatarUrl: worker.avatarUrl ?? undefined,
                },
              })
            }
            className="rounded-lg border border-[#CBD5E1] px-3 py-2"
          >
            <Text className="text-[12px] font-semibold text-[#1D5478]">
              View Profile
            </Text>
          </TouchableOpacity>
        </View>

        <View className="my-4 h-[1px] bg-[#EDF1F5]" />

        {/* Metrics */}
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-[11px] font-bold tracking-[0.5px] text-[#94A3B8]">
              ATTENDANCE
            </Text>
            <View className="mt-1 flex-row items-center">
              <Text
                className="text-[16px] font-bold"
                style={{ color: attendanceLow ? "#E11D48" : "#15925B" }}
              >
                {worker.attendance}%
              </Text>
              {attendanceLow ? (
                <Ionicons
                  name="warning-outline"
                  size={14}
                  color="#E11D48"
                  style={{ marginLeft: 4 }}
                />
              ) : null}
            </View>
          </View>

          <View className="items-end">
            <Text className="text-[11px] font-bold tracking-[0.5px] text-[#94A3B8]">
              TASKS DONE
            </Text>
            <Text className="mt-1 text-[16px] font-bold text-[#111827]">
              {worker.tasksDone}
            </Text>
          </View>

        </View>
      </View>
    </View>
  );
}

function ExpenseCard({ expense }: { expense: Expense }) {
  const pending = expense.status === "PENDING";
  const rejected = expense.status === "REJECTED";
  const accent = rejected ? "#F8D7DA" : pending ? "#D4DAE5" : "#C7F4E6";
  const badgeBg = rejected ? "#FDECEC" : pending ? "#E9EEFF" : "#DDFBF0";
  const badgeText = rejected ? "#B42318" : pending ? "#8B5E3C" : "#2E8B57";
  return (
    <View
      className="mt-5 flex-row overflow-hidden rounded-lg bg-white"
      style={{
        shadowColor: "#0F172A",
        shadowOpacity: 0.04,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
        elevation: 2,
      }}
    >
      <View style={{ width: 4, backgroundColor: accent }} />

      <View className="flex-1 px-4 py-5">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-[17px] font-bold text-[#1F2937]">
              {expense.name}
            </Text>
            <Text className="mt-1 text-[13px] text-[#7C8594]">
              {expense.date}
            </Text>
          </View>
          <View
            className="rounded-full px-4 py-1.5"
            style={{ backgroundColor: badgeBg }}
          >
            <Text
              className="text-[11px] font-semibold tracking-[1.2px]"
              style={{ color: badgeText }}
            >
              {expense.status}
            </Text>
          </View>
        </View>

        <View className="mt-4 flex-row items-end justify-between">
          <Text className="text-[14px] text-[#6B7280]">
            {expense.category}
          </Text>
          <Text className="text-[18px] font-bold text-[#111827]">
            {expense.amount}
          </Text>
        </View>
      </View>
    </View>
  );
}

function PayrollWorkerCard({ worker }: { worker: PayrollWorker }) {
  return (
    <View
      className="mt-4 rounded-lg bg-white px-4 py-4"
      style={{
        shadowColor: "#0F172A",
        shadowOpacity: 0.06,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
      }}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-[17px] font-bold text-[#111827]">
            {worker.name}
          </Text>
          <Text className="mt-0.5 text-[13px] text-[#6B7280]">
            {worker.role}
          </Text>
        </View>
        <View className="rounded-full bg-[#EEF2FF] px-3 py-1">
          <Text className="text-[11px] font-bold tracking-[0.5px] text-[#4F46E5]">
            {worker.status}
          </Text>
        </View>
      </View>

      <View className="mt-4 flex-row items-center justify-between">
        <View>
          <Text className="text-[11px] font-bold tracking-[0.5px] text-[#94A3B8]">
            HOURS
          </Text>
          <Text className="mt-1 text-[16px] font-bold text-[#111827]">
            {worker.hours}
          </Text>
        </View>
        <View>
          <Text className="text-[11px] font-bold tracking-[0.5px] text-[#94A3B8]">
            GROSS PAY
          </Text>
          <Text className="mt-1 text-[16px] font-bold text-[#111827]">
            {worker.grossPay}
          </Text>
        </View>
        <View>
          <Text className="text-[11px] font-bold tracking-[0.5px] text-[#94A3B8]">
            NET PAY
          </Text>
          <Text className="mt-1 text-[16px] font-bold text-[#15925B]">
            {worker.netPay}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function ReportResultScreen() {
  const { type, frequency, startDate, endDate, projectId } = useLocalSearchParams<{
    type?: string;
    frequency?: string;
    startDate?: string;
    endDate?: string;
    projectId?: string;
  }>();

  const reportType = typeof type === "string" ? type : "payroll";
  const resolvedFrequency =
    typeof frequency === "string" ? frequency : "monthly";
  const resolvedStartDate =
    typeof startDate === "string" ? startDate : new Date().toISOString().slice(0, 10);
  const resolvedEndDate =
    typeof endDate === "string" ? endDate : new Date().toISOString().slice(0, 10);
  const resolvedProjectId = typeof projectId === "string" ? projectId : undefined;
  const title = TYPE_TITLES[reportType] ?? "Report";
  const reportQuery = useAdminGeneratedReportQuery({
    type: reportType as
      | "payroll"
      | "project_invoices"
      | "worker_performance"
      | "expense",
    frequency: resolvedFrequency as
      | "daily"
      | "weekly"
      | "monthly"
      | "quarterly"
      | "yearly",
    startDate: resolvedStartDate,
    endDate: resolvedEndDate,
    ...(resolvedProjectId ? { projectId: resolvedProjectId } : {}),
  });

  const report = reportQuery.data;
  const invoiceReport = getReportData(report, "project_invoices") as
    | AdminProjectInvoicesReport
    | undefined;
  const performanceReport = getReportData(report, "worker_performance") as
    | AdminWorkerPerformanceReport
    | undefined;
  const expenseReport = getReportData(report, "expense") as
    | AdminExpenseReport
    | undefined;
  const payrollReport = getReportData(report, "payroll") as
    | AdminPayrollReport
    | undefined;

  const invoiceCards: Invoice[] = (invoiceReport?.projects ?? []).map((project) => ({
    id: project.id,
    name: project.name,
    company: project.company.name,
    status: formatStatusLabel(project.status),
    progress: project.progress ?? 0,
    billed: formatCurrency(project.invoiceTotal ?? 0),
    remaining: formatCurrency(
      project.remaining ?? Math.max((project.budget ?? 0) - (project.spent ?? 0), 0),
    ),
    billableUnits: project.billableSubTaskCount ?? 0,
  }));

  const workerCards: Worker[] = (performanceReport?.workers ?? []).map((item) => ({
    id: item.worker.id,
    workerId: item.worker.id,
    name: item.worker.fullName,
    role: item.worker.department ?? "Worker",
    avatarUrl: item.worker.avatarUrl,
    attendance: parsePercent(item.attendance.attendanceRate),
    tasksDone: item.tasks.completed,
    accent:
      parsePercent(item.attendance.attendanceRate) < 50 ? "#E11D48" : "#1D5478",
  }));

  const expenseCards: Expense[] = (expenseReport?.expenses ?? []).map((item) => ({
    id: item.id,
    name: item.worker.fullName,
    date: formatDateLabel(item.date),
    category: item.category,
    amount: formatCurrency(item.amount),
    status: formatStatusLabel(item.status) as Expense["status"],
  }));

  const payrollWorkers: PayrollWorker[] = (payrollReport?.workers ?? []).map((item) => ({
    id: item.worker.id,
    name: item.worker.fullName,
    role: item.worker.department ?? "Worker",
    hours: formatHours(item.totalHours),
    grossPay: formatCompactCurrency(item.totalGrossPay),
    netPay: formatCompactCurrency(item.totalNetPay),
    status: formatStatusLabel(item.payrolls[0]?.status ?? "paid"),
  }));

  const payrollAverageRate =
    (payrollReport?.summary.totalHours ?? 0) > 0
      ? (payrollReport!.summary.totalGrossPay ?? 0) / payrollReport!.summary.totalHours
      : 0;
  const { refreshing, onRefresh } = usePullToRefresh(async () => {
    await reportQuery.refetch();
  });

  const exportMutation = useExportAdminReportsMutation();

  const handleExport = async () => {
    const document = await exportMutation.mutateAsync({
      type: reportType as any,
      frequency: resolvedFrequency as any,
      startDate: resolvedStartDate,
      endDate: resolvedEndDate,
      ...(resolvedProjectId ? { projectId: resolvedProjectId } : {}),
    });

    if (document) {
      setCurrentPreviewDocument({
        id: "admin-reports-export",
        name: `${title}.pdf`,
        uri: document.uri,
        mimeType: document.mimeType,
      });

      router.push({
        pathname: "/screens/company/documentpreview",
        params: { download: "1" },
      });
    }
  };

  return (
    <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-[#E9EDF1]">
      <BackTitleHeader 
        title={title} 
        onBack={() => router.back()}
        rightComponent={
          <TouchableOpacity 
            onPress={handleExport} 
            disabled={exportMutation.isPending}
            activeOpacity={0.8}
            className="flex-row items-center rounded-lg bg-[#EAF3FA] px-3 py-1.5"
          >
            {exportMutation.isPending ? (
              <ActivityIndicator size="small" color="#1D5478" />
            ) : (
              <Text className="text-[14px] font-semibold text-[#1D5478]">
                Export
              </Text>
            )}
          </TouchableOpacity>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 36 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#1D5478"
            colors={["#1D5478"]}
          />
        }
      >
        {reportQuery.isLoading ? (
          <View className="mt-4 items-center rounded-lg bg-[#F1F5F9] px-6 py-10">
            <Ionicons name="bar-chart-outline" size={26} color="#94A3B8" />
            <Text className="mt-3 text-[14px] text-[#64748B]">
              Generating report...
            </Text>
          </View>
        ) : reportQuery.isError ? (
          <View className="mt-4 items-center rounded-lg bg-[#FDECEC] px-6 py-10">
            <Ionicons name="alert-circle-outline" size={26} color="#B42318" />
            <Text className="mt-3 text-center text-[14px] text-[#B42318]">
              Failed to load report data.
            </Text>
          </View>
        ) : reportType === "project_invoices" ? (
          <View>
            <Text className="text-[26px] font-extrabold text-[#1D5478]">
              Project Invoicing
            </Text>
            <Text className="mt-1 text-[14px] text-[#6B7280]">
              Billing status based on project progress
            </Text>

            <View className="mt-5 rounded-lg border-l-4 border-[#1D5478] bg-white px-4 py-6">
              <Text className="text-center text-[34px] font-extrabold text-[#1D5478]">
                {formatCurrency(invoiceReport?.summary.totalInvoiceAmount)}
              </Text>
              <Text className="mt-1 text-center text-[12px] font-bold tracking-[1px] text-[#94A3B8]">
                TOTAL INVOICE AMOUNT
              </Text>
            </View>

            {invoiceCards.map((invoice) => (
              <InvoiceCard key={invoice.id} invoice={invoice} />
            ))}
            {invoiceCards.length === 0 ? (
              <View className="mt-4 items-center rounded-lg bg-[#F1F5F9] px-6 py-10">
                <Ionicons name="search-outline" size={26} color="#94A3B8" />
                <Text className="mt-3 text-[14px] text-[#64748B]">
                  No results found.
                </Text>
              </View>
            ) : null}
          </View>
        ) : reportType === "worker_performance" ? (
          <View>
            <Text className="text-[26px] font-extrabold text-[#111827]">
              Worker Performance
            </Text>
            <Text className="mt-1 text-[14px] text-[#6B7280]">
              Efficiency and reliability metrics
            </Text>

            {workerCards.map((worker) => (
              <WorkerCard key={worker.id} worker={worker} />
            ))}

            <View className="mt-5 flex-row items-center justify-between rounded-lg bg-[#1D5478] px-5 py-5">
              <View>
                <Text className="text-[18px] font-bold text-white">
                  Weekly Summary
                </Text>
                <Text className="mt-1 text-[13px] text-[#C7D8E6]">
                  {performanceReport?.summary.avgTaskCompletion ?? "0%"} Average Efficiency
                </Text>
              </View>
              <Ionicons name="stats-chart" size={26} color="#FFFFFF" />
            </View>
            {workerCards.length === 0 ? (
              <View className="mt-4 items-center rounded-lg bg-[#F1F5F9] px-6 py-10">
                <Ionicons name="search-outline" size={26} color="#94A3B8" />
                <Text className="mt-3 text-[14px] text-[#64748B]">
                  No results found.
                </Text>
              </View>
            ) : null}
          </View>
        ) : reportType === "expense" ? (
          <View>
            <View className="flex-row gap-4">
              <ExpenseStatCard
                label="TOTAL EXPENSES (ALL TIME)"
                value={formatCurrency(expenseReport?.summary.totalAmount)}
              />
              <ExpenseStatCard
                label="PENDING APPROVAL"
                value={formatCurrency(expenseReport?.summary.pendingAmount)}
                valueColor="#F59E0B"
              />
            </View>

            <Text className="mt-8 text-[18px] font-bold text-[#111827]">
              Expense Breakdown
            </Text>
            <Text className="mt-1 text-[14px] text-[#6B7280]">
              Track project and worker expenditures
            </Text>

            {expenseCards.map((expense) => (
              <ExpenseCard key={expense.id} expense={expense} />
            ))}
            {expenseCards.length === 0 ? (
              <View className="mt-4 items-center rounded-lg bg-[#F1F5F9] px-6 py-10">
                <Ionicons name="search-outline" size={26} color="#94A3B8" />
                <Text className="mt-3 text-[14px] text-[#64748B]">
                  No results found.
                </Text>
              </View>
            ) : null}
          </View>
        ) : (
          <View>
            <View className="flex-row gap-3">
              <StatCard
                value={formatHours(payrollReport?.summary.totalHours)}
                label="TOTAL HOURS"
              />
              <StatCard
                value={formatCompactCurrency(payrollReport?.summary.totalGrossPay)}
                label="GROSS PAY"
              />
            </View>

            <View className="mt-3 flex-row gap-3">
              <StatCard
                value={formatCompactCurrency(payrollReport?.summary.totalDeductions)}
                label="DEDUCTIONS"
              />
              <StatCard
                value={formatCompactCurrency(payrollAverageRate)}
                label="AVG HOURLY RATE"
              />
            </View>

            <Text className="mb-1 mt-6 text-[16px] font-semibold text-[#111827]">
              Workers
            </Text>
            <Text className="text-[13px] text-[#6B7280]">
              {payrollReport?.summary.totalWorkers ?? 0} payroll rows
            </Text>

            <TouchableOpacity
              activeOpacity={0.85}
              className="mt-4 h-[52px] flex-row items-center justify-between rounded-lg border border-[#1D5478] bg-white px-4"
            >
              <Text className="text-[15px] font-semibold text-[#1D5478]">
                Process payroll
              </Text>
              <Ionicons name="arrow-forward" size={18} color="#1D5478" />
            </TouchableOpacity>

            {payrollWorkers.length > 0 ? (
              payrollWorkers.map((worker) => (
                <PayrollWorkerCard key={worker.id} worker={worker} />
              ))
            ) : (
              <View className="mt-4 items-center rounded-lg bg-[#F1F5F9] px-6 py-10">
                <Ionicons name="search-outline" size={26} color="#94A3B8" />
                <Text className="mt-3 text-[14px] text-[#64748B]">
                  No results found.
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
