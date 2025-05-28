
import HospitalDashboard from "@/components/dashboards/HospitalDashboard";

const HospitalDashboardPage = () => {
  const connectedAccount = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  
  const handleLogout = () => {
    window.location.href = "/";
  };

  return <HospitalDashboard connectedAccount={connectedAccount} onLogout={handleLogout} />;
};

export default HospitalDashboardPage;
