import PatientDashboard from "@/components/dashboards/PatientDashboard";

const PatientDashboardPage = () => {
  const connectedAccount = "0x90F79bf6EB2c4f870365E785982E1f101E93b906";
  
  const handleLogout = () => {
    window.location.href = "/";
  };

  return <PatientDashboard connectedAccount={connectedAccount} onLogout={handleLogout} />;
};

export default PatientDashboardPage;
