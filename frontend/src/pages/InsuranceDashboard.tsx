
import InsuranceDashboard from "@/components/dashboards/InsuranceDashboard";

const InsuranceDashboardPage = () => {
  const connectedAccount = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  
  const handleLogout = () => {
    window.location.href = "/";
  };

  return <InsuranceDashboard connectedAccount={connectedAccount} onLogout={handleLogout} />;
};

export default InsuranceDashboardPage;
