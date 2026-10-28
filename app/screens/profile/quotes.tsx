import ManagerQuotesScreen from "@/components/manager/ManagerQuotesScreen";
import { useAuthStore } from "@/store/auth.store";
import { Redirect } from "expo-router";

export default function AdminQuotesRoute() {
  const role = useAuthStore((state) => state.user?.role);
  if (role !== "admin") return <Redirect href="/(tab)/home" />;
  return <ManagerQuotesScreen />;
}
