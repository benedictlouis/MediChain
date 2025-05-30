
import HospitalDashboard from "@/components/dashboards/HospitalDashboard";

const HospitalDashboardPage = () => {
  const connectedAccount = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
  
  const handleLogout = () => {
    window.location.href = "/";
  };

  return <HospitalDashboard connectedAccount={connectedAccount} onLogout={handleLogout} />;
};

export default HospitalDashboardPage;
