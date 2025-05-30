
import AdminDashboard from "@/components/dashboards/AdminDashboard";

const AdminDashboardPage = () => {
  const connectedAccount = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  
  const handleLogout = () => {
    window.location.href = "/";
  };

  return <AdminDashboard connectedAccount={connectedAccount} onLogout={handleLogout} />;
};

export default AdminDashboardPage;
