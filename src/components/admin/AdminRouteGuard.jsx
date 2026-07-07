import { Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectIsAdminAuth } from "../../store";
import AdminLogin from "../../pages/admin/AdminLogin";

export default function AdminRouteGuard() {
  const isAdminAuth = useSelector(selectIsAdminAuth);
  return isAdminAuth ? <Outlet /> : <AdminLogin />;
}
