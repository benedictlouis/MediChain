import InsuranceDashboard from "@/components/dashboards/InsuranceDashboard";

const InsuranceDashboardPage = () => {
  const connectedAccount = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";
  
  const handleLogout = () => {
    window.location.href = "/";
  };

  return <InsuranceDashboard connectedAccount={connectedAccount} onLogout={handleLogout} />;
};

export default InsuranceDashboardPage;
