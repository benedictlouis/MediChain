
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Heart, CreditCard, CheckCircle, XCircle, Clock, Search, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import DashboardHeader from "@/components/DashboardHeader";
import { BrowserProvider, Contract, ethers, formatEther } from 'ethers';
import { contractAddress, contractABI } from '@/contractConfig'; 

interface Claim {
  id: string;
  patient: string;
  patientName: string; // Assuming you can get this from another source or a mapping
  diagnosis: string;
  cost: number;
  treatment: string;
  hospital: string;
  status: 'approved' | 'rejected' | 'pending' | 'unknown';
  priority: 'high' | 'normal' | 'low'; // You might determine this based on cost or diagnosis
  date: string; // You can format this from a timestamp if available
}

interface InsuranceDashboardProps {
  connectedAccount: string;
  onLogout: () => void;
}

const InsuranceDashboard = ({ connectedAccount, onLogout }: InsuranceDashboardProps) => {
  const [claimId, setClaimId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [claims, setClaims] = useState<Claim[]>([]);
  const [contract, setContract] = useState<Contract | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();


  const getPriorityFromCost = (cost: number): 'high' | 'normal' | 'low' => {
    if (cost > 5000) {
      return 'high';
    }
    if (cost > 1000) {
      return 'normal';
    }
    return 'low';
  };
  
  useEffect(() => {
    const initializeContract = async () => {
      if (typeof window.ethereum !== 'undefined') {
        try {
          const provider = new BrowserProvider(window.ethereum);
          const signer = await provider.getSigner();
          const insuranceContract = new Contract(contractAddress, contractABI, signer);
          setContract(insuranceContract);
        } catch (error) {
          console.error("Failed to initialize contract:", error);
          toast({
            title: "Contract Error",
            description: "Could not connect to the smart contract. Make sure MetaMask is connected.",
            variant: "destructive",
          });
        }
      }
    };
    initializeContract();
  }, [connectedAccount, toast]);

   useEffect(() => {
    const fetchAllClaims = async () => {
      if (!contract) return;
      setIsLoading(true);
      try {
        const totalClaims = await contract.claimCounter();
        const claimsData: Claim[] = [];

        for (let i = 1; i <= Number(totalClaims); i++) {
          const details = await contract.getRecordAndClaimDetails(i);
          if (details.exists) {
            const claimCost = Number(details.cost);
             claimsData.push({
              id: i.toString(),
              patient: details.patient,
              patientName: `Patient ${i}`, 
              diagnosis: details.diagnosis,
              cost: claimCost, 
              treatment: details.treatment,
              hospital: details.hospital,
              status: details.status.toLowerCase() as Claim['status'],
              priority: getPriorityFromCost(claimCost),
              date: new Date().toLocaleDateString(), 
            });
          }
        }
        setClaims(claimsData.reverse()); // Show most recent claims first
      } catch (error) {
        console.error("Failed to fetch claims:", error);
        toast({
          title: "Error Fetching Claims",
          description: "There was a problem retrieving data from the blockchain.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllClaims();
  }, [contract, toast]);

    // Function to refresh the claims list after a transaction
  const refreshClaims = async () => {
     if (!contract) return;
     const totalClaims = await contract.claimCounter();
     // ... (re-implement the fetch logic from the useEffect above)
     // For brevity, you would abstract the fetching logic into its own function
     // and call it here and in the useEffect.
     toast({ title: "Data Refreshed", description: "The claims list has been updated." });
  };
  
  // Memoized values for stats and filtering
  const { pendingClaims, approvedClaims, totalAmount, filteredClaims } = useMemo(() => {
    const pending = claims.filter(c => c.status === 'pending').length;
    const approved = claims.filter(c => c.status === 'approved').length;
    const total = claims.reduce((sum, c) => sum + c.cost, 0);
    const filtered = claims.filter(claim =>
      claim.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.id.includes(searchTerm) ||
      claim.diagnosis.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return { pendingClaims: pending, approvedClaims: approved, totalAmount: total, filteredClaims: filtered };
  }, [claims, searchTerm]);

   const handleApproveClaim = async (id: string) => {
    if (!contract) return;
    toast({ title: "Processing...", description: "Sending approval to the blockchain." });
    try {
      // Call 'validateClaim' with 'true' to approve the claim.
      const tx = await contract.validateClaim(id, true);
      
      await tx.wait(); // Wait for the transaction to be mined
      toast({
        title: "Claim Approved",
        description: `Claim ${id} has been successfully approved.`,
        className: "bg-green-100 text-green-800"
      });
      refreshClaims(); // Refresh data from the blockchain
    } catch (error: any) {
      console.error("Approval failed:", error);
      toast({
        title: "Approval Failed",
        description: error.reason || "The transaction was reverted.",
        variant: "destructive"
      });
    }
  };

  const handleRejectClaim = async (id: string) => {
    if (!contract) return;
    toast({ title: "Processing...", description: "Sending rejection to the blockchain." });
    try {
      // Call 'validateClaim' with 'false' to reject the claim.
      const tx = await contract.validateClaim(id, false);

      await tx.wait(); // Wait for the transaction to be mined
      toast({
        title: "Claim Rejected",
        description: `Claim ${id} has been rejected.`,
        variant: "destructive"
      });
      refreshClaims();
    } catch (error: any) {
      console.error("Rejection failed:", error);
      toast({
        title: "Rejection Failed",
        description: error.reason || "The transaction was reverted.",
        variant: "destructive"
      });
    }
  };
  
  /**
   * Implements the getRecordAndClaimDetails function from the smart contract.
   * This function is called when the user clicks the "Check Status" button.
   */
  const handleCheckStatus = async () => {
    if (!contract) {
      toast({ title: "Error", description: "Contract not initialized.", variant: "destructive" });
      return;
    }
    if (!claimId) {
      toast({ title: "Error", description: "Please enter a Claim ID (Record ID).", variant: "destructive" });
      return;
    }
    
    toast({ title: "Fetching...", description: `Checking status for claim ${claimId}` });
    
    try {
      // Call the smart contract view function
      const result = await contract.getRecordAndClaimDetails(claimId);

      // Check if the record exists using the 'exists' boolean from the return values
      if (!result.exists) {
        toast({
          title: "Not Found",
          description: `No medical record found for ID ${claimId}.`,
          variant: "destructive"
        });
        return;
      }
      
      // Format the returned data for display
      const costInEther = formatEther(result.cost);
      
      // Display the result in a toast
      toast({
          title: `Status for Claim ${claimId}: ${result.status}`,
          description: (
              <div className="text-sm">
                  <p><strong>Patient:</strong> {result.patient}</p>
                  <p><strong>Diagnosis:</strong> {result.diagnosis}</p>
                  <p><strong>Treatment:</strong> {result.treatment}</p>
                  <p><strong>Cost:</strong> {costInEther} ETH</p>
              </div>
          ),
      });

    } catch (error: any) {
        console.error("Failed to check status:", error);
        toast({
            title: "Error",
            description: error.reason || "Could not fetch claim details from the blockchain.",
            variant: "destructive"
        });
    }
  };


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 hover:bg-red-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 hover:bg-red-200';
      case 'normal':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      case 'low':
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <DashboardHeader 
        title="Insurance Dashboard"
        subtitle="Claims Management"
        icon={Heart}
        connectedAccount={connectedAccount}
        onLogout={onLogout}
        gradientFrom="from-purple-500"
        gradientTo="to-pink-500"
      />

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-100">Pending Claims</p>
                  <p className="text-3xl font-bold">{pendingClaims}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100">Approved Claims</p>
                  <p className="text-3xl font-bold">{approvedClaims}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100">Total Claims</p>
                  <p className="text-3xl font-bold">{claims.length}</p>
                </div>
                <CreditCard className="w-8 h-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100">Total Amount</p>
                  <p className="text-3xl font-bold">${totalAmount.toLocaleString()}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Check Claim Status */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5 text-purple-600" />
                Check Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Input
                  placeholder="Enter Claim ID"
                  value={claimId}
                  onChange={(e) => setClaimId(e.target.value)}
                />
              </div>
              <Button 
                onClick={handleCheckStatus}
                className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
              >
                Check Status
              </Button>
            </CardContent>
          </Card>

          {/* Claims List */}
          <Card className="lg:col-span-3 shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  All Claims
                </CardTitle>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search claims..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredClaims.map((claim) => (
                  <div key={claim.id} className="p-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border-l-4 border-purple-500 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <h4 className="font-bold text-lg">Claim {claim.id}</h4>
                          <Badge className={getPriorityColor(claim.priority)}>
                            {claim.priority} priority
                          </Badge>
                          <Badge className={getStatusColor(claim.status)}>
                            {claim.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">Patient: {claim.patientName}</p>
                        <p className="text-xs text-gray-500 font-mono">{claim.patient}</p>
                      </div>
                      <div className="text-right space-y-2">
                        <p className="text-2xl font-bold text-purple-600">${claim.cost}</p>
                        <p className="text-xs text-gray-500">{claim.date}</p>
                      </div>
                    </div>
                    
                    <div className="grid md:grid-cols-3 gap-4 mb-4 text-sm">
                      <div>
                        <p className="text-gray-600">Diagnosis:</p>
                        <p className="font-medium">{claim.diagnosis}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Treatment:</p>
                        <p className="font-medium">{claim.treatment}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Hospital:</p>
                        <p className="font-medium">{claim.hospital}</p>
                      </div>
                    </div>
                    
                    {claim.status === 'pending' && (
                      <div className="flex gap-3 pt-4 border-t">
                        <Button 
                          onClick={() => handleApproveClaim(claim.id)}
                          className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                        >
                          <CheckCircle className="mr-2 w-4 h-4" />
                          Approve
                        </Button>
                        <Button 
                          onClick={() => handleRejectClaim(claim.id)}
                          variant="destructive"
                          className="flex-1"
                        >
                          <XCircle className="mr-2 w-4 h-4" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default InsuranceDashboard;