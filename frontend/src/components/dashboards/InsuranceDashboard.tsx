import { useState, useEffect, useMemo, useCallback } from "react"; // Added useCallback
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Heart, CreditCard, CheckCircle, XCircle, Clock, Search, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import DashboardHeader from "@/components/DashboardHeader";
import { BrowserProvider, Contract, ethers, formatUnits } from 'ethers'; // formatUnits for cost
import { contractAddress, contractABI } from '@/contractConfig'; 
import axios from 'axios'; // Import axios

// Interface for data fetched from IPFS
interface MedicalRecordIPFSData {
  diagnosis: string;
  treatment: string;
  duration?: string; 
  submittedAt?: string; 
}

interface Claim {
  id: string; // Claim ID from the contract's claimCounter
  recordId: string; // Associated Medical Record ID
  patientAddress: string; // Patient's wallet address from MedicalRecord
  // patientName: string; // This would require an additional mapping or off-chain data
  diagnosis: string; // From IPFS via MedicalRecord's ipfsHash
  cost: string; // Formatted cost from MedicalRecord
  treatment: string; // From IPFS via MedicalRecord's ipfsHash
  hospitalAddress: string; // Hospital's wallet address from MedicalRecord
  status: 'approved' | 'rejected' | 'pending' | 'unknown'; // From Claim struct in contract
  priority: 'high' | 'normal' | 'low'; 
  dateSubmitted: string; // Date from IPFS medical data, or claim submission date if available
  ipfsHash?: string; // Store for reference
}

// Solidity enum ClaimStatus { Pending, Approved, Rejected, NotClaimed }
enum SolidityClaimStatus {
  Pending,
  Approved,
  Rejected,
  NotClaimed 
}

interface InsuranceDashboardProps {
  connectedAccount: string;
  onLogout: () => void;
}

const InsuranceDashboard = ({ connectedAccount, onLogout }: InsuranceDashboardProps) => {
  const [recordIdForStatusCheck, setRecordIdForStatusCheck] = useState(""); // For the "Check Status" card input
  const [searchTerm, setSearchTerm] = useState("");
  const [claims, setClaims] = useState<Claim[]>([]);
  const [contract, setContract] = useState<Contract | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const PINATA_GATEWAY_URL = import.meta.env.VITE_PINATA_GATEWAY_URL;

  const mapSolidityStatusToString = (statusEnum: SolidityClaimStatus): Claim['status'] => {
    switch (statusEnum) {
      case SolidityClaimStatus.Pending: return "pending";
      case SolidityClaimStatus.Approved: return "approved";
      case SolidityClaimStatus.Rejected: return "rejected";
      default: return "unknown"; // Should ideally not happen for claims listed
    }
  };

  const getPriorityFromCost = (costString: string): 'high' | 'normal' | 'low' => {
    // Assuming costString is a number string, convert it
    const cost = parseFloat(costString.replace(/[^0-9.-]+/g,"")); // Basic parsing, adjust if cost is formatted differently
    if (cost > 5000000) { // Example: 5 million IDR (adjust as needed)
      return 'high';
    }
    if (cost > 1000000) { // Example: 1 million IDR
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
      } else {
        toast({
            title: "MetaMask Not Found",
            description: "Please install MetaMask to use this application.",
            variant: "destructive",
        });
      }
    };
    initializeContract();
  }, [toast]);

  const fetchAndSetClaims = useCallback(async () => {
    if (!contract || !connectedAccount) return;
    if (!PINATA_GATEWAY_URL) {
        toast({ title: "Configuration Error", description: "Pinata Gateway URL not set. Please check .env.local", variant: "destructive" });
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    try {
      const totalClaimsCounter = await contract.claimCounter();
      const claimsDataPromises: Promise<Claim | null>[] = [];

      for (let i = 1; i <= Number(totalClaimsCounter); i++) {
        const currentClaimId = i;
        claimsDataPromises.push(
          (async (): Promise<Claim | null> => {
            try {
              // 1. Get the claim details using the claimId
              const claimStruct = await contract.claims(currentClaimId);
              // claimStruct: { recordId: BigInt, insuranceCompany: string, status: number (enum) }

              if (!claimStruct || claimStruct.recordId === BigInt(0)) {
                return null; // Claim doesn't exist or has no record ID
              }

              // 2. Filter: Only process claims for the currently connected insurance company
              if (claimStruct.insuranceCompany.toLowerCase() !== connectedAccount.toLowerCase()) {
                return null;
              }
              
              const recordId = Number(claimStruct.recordId);

              // 3. Get the medical record details using the recordId
              const medicalRecordStruct = await contract.medicalRecords(recordId);

              if (!medicalRecordStruct || !medicalRecordStruct.exists) {
                console.warn(`Medical record ${recordId} for claim ${currentClaimId} not found or does not exist.`);
                return null;
              }

              let diagnosisFromIpfs = "N/A";
              let treatmentFromIpfs = "N/A";
              let submissionDateFromIpfs = new Date().toLocaleDateString(); // Fallback

              // 4. Fetch from IPFS using medicalRecordStruct.ipfsHash
              if (medicalRecordStruct.ipfsHash && PINATA_GATEWAY_URL) {
                try {
                  const ipfsUrl = `${PINATA_GATEWAY_URL}/ipfs/${medicalRecordStruct.ipfsHash}`;
                  const ipfsResponse = await axios.get<MedicalRecordIPFSData>(ipfsUrl);
                  diagnosisFromIpfs = ipfsResponse.data.diagnosis || "N/A";
                  treatmentFromIpfs = ipfsResponse.data.treatment || "N/A";
                  if (ipfsResponse.data.submittedAt) {
                    submissionDateFromIpfs = new Date(ipfsResponse.data.submittedAt).toLocaleDateString();
                  }
                } catch (ipfsError) {
                  console.error(`Failed to fetch IPFS data for claim ${currentClaimId}, hash ${medicalRecordStruct.ipfsHash}:`, ipfsError);
                }
              }
              
              const formattedCost = formatUnits(medicalRecordStruct.cost, 0); 

              return {
                id: currentClaimId.toString(),
                recordId: recordId.toString(),
                patientAddress: medicalRecordStruct.patient,
                diagnosis: diagnosisFromIpfs,
                cost: formattedCost,
                treatment: treatmentFromIpfs,
                hospitalAddress: medicalRecordStruct.hospital,
                status: mapSolidityStatusToString(Number(claimStruct.status) as SolidityClaimStatus),
                priority: getPriorityFromCost(formattedCost),
                dateSubmitted: submissionDateFromIpfs, 
                ipfsHash: medicalRecordStruct.ipfsHash,
              };
            } catch (error) {
              console.error(`Error processing claim ID ${currentClaimId}:`, error);
              return null;
            }
          })()
        );
      }
      
      const resolvedClaimsData = (await Promise.all(claimsDataPromises)).filter(c => c !== null) as Claim[];
      setClaims(resolvedClaimsData.sort((a, b) => parseInt(b.id) - parseInt(a.id))); // Show most recent claims first
    } catch (error) {
      console.error("Failed to fetch claims:", error);
      toast({
        title: "Error Fetching Claims",
        description: "There was a problem retrieving data from the blockchain or IPFS.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [contract, connectedAccount, toast, PINATA_GATEWAY_URL]); // Added PINATA_GATEWAY_URL dependency

   useEffect(() => {
    if (contract && connectedAccount && PINATA_GATEWAY_URL) { // Check for PINATA_GATEWAY_URL
        fetchAndSetClaims();
    }
  }, [contract, connectedAccount, PINATA_GATEWAY_URL, fetchAndSetClaims]); // Added PINATA_GATEWAY_URL and fetchAndSetClaims

  const refreshClaims = useCallback(async () => {
     await fetchAndSetClaims();
     toast({ title: "Data Refreshed", description: "The claims list has been updated." });
  }, [fetchAndSetClaims, toast]);
  
  const { pendingClaims, approvedClaims, totalAmountOfApproved, filteredClaims } = useMemo(() => {
    const pending = claims.filter(c => c.status === 'pending').length;
    const approved = claims.filter(c => c.status === 'approved');
    const totalApprovedCost = approved.reduce((sum, c) => sum + parseFloat(c.cost.replace(/[^0-9.-]+/g,"") || "0"), 0);
    
    const lowerSearchTerm = searchTerm.toLowerCase();
    const filtered = claims.filter(claim =>
      claim.id.includes(searchTerm) || 
      claim.recordId.includes(searchTerm) || 
      (claim.patientAddress && claim.patientAddress.toLowerCase().includes(lowerSearchTerm)) ||
      (claim.diagnosis && claim.diagnosis.toLowerCase().includes(lowerSearchTerm)) ||
      (claim.treatment && claim.treatment.toLowerCase().includes(lowerSearchTerm)) ||
      (claim.hospitalAddress && claim.hospitalAddress.toLowerCase().includes(lowerSearchTerm))
    );
    return { 
        pendingClaims: pending, 
        approvedClaims: approved.length, 
        totalAmountOfApproved: totalApprovedCost, 
        filteredClaims: filtered 
    };
  }, [claims, searchTerm]);

   const handleApproveClaim = async (claimToValidateId: string) => {
    if (!contract) return;
    toast({ title: "Processing...", description: "Sending approval to the blockchain." });
    try {
      const tx = await contract.validateClaim(claimToValidateId, true);
      await tx.wait(); 
      toast({
        title: "Claim Approved",
        description: `Claim ${claimToValidateId} has been successfully approved.`,
        className: "bg-green-100 text-green-800"
      });
      refreshClaims(); 
    } catch (error: any) {
      console.error("Approval failed:", error);
      const reason = error?.reason || error?.data?.message || error.message || "The transaction was reverted.";
      toast({
        title: "Approval Failed",
        description: reason,
        variant: "destructive"
      });
    }
  };

  const handleRejectClaim = async (claimToValidateId: string) => {
    if (!contract) return;
    toast({ title: "Processing...", description: "Sending rejection to the blockchain." });
    try {
      const tx = await contract.validateClaim(claimToValidateId, false);
      await tx.wait(); 
      toast({
        title: "Claim Rejected",
        description: `Claim ${claimToValidateId} has been rejected.`,
        variant: "destructive" 
      });
      refreshClaims();
    } catch (error: any) {
      console.error("Rejection failed:", error);
      const reason = error?.reason || error?.data?.message || error.message || "The transaction was reverted.";
      toast({
        title: "Rejection Failed",
        description: reason,
        variant: "destructive"
      });
    }
  };
  
  const handleCheckStatusByRecordId = async () => {
    if (!contract) {
      toast({ title: "Error", description: "Contract not initialized.", variant: "destructive" });
      return;
    }
    if (!recordIdForStatusCheck) { 
      toast({ title: "Error", description: "Please enter a Record ID to check.", variant: "destructive" });
      return;
    }
    if (!PINATA_GATEWAY_URL) {
        toast({ title: "Configuration Error", description: "Pinata Gateway URL not set.", variant: "destructive" });
        return;
    }
    
    toast({ title: "Fetching...", description: `Checking status for record ${recordIdForStatusCheck}` });
    
    try {
      const result = await contract.getRecordAndClaimDetails(recordIdForStatusCheck);

      let diagnosisFromIpfs = "N/A";
      let treatmentFromIpfs = "N/A";
      let ipfsFetchStatusMessage = ""; 

      const ipfsHash = result[1];

      if (ipfsHash && ipfsHash.length > 0 && PINATA_GATEWAY_URL) {
        try {
            const ipfsUrl = `${PINATA_GATEWAY_URL}/ipfs/${ipfsHash}`;
            const ipfsResponse = await axios.get<MedicalRecordIPFSData>(ipfsUrl);
            diagnosisFromIpfs = ipfsResponse.data.diagnosis || "Diagnosis not specified in IPFS";
            treatmentFromIpfs = ipfsResponse.data.treatment || "Treatment not specified in IPFS";
            if (!ipfsResponse.data.diagnosis && !ipfsResponse.data.treatment) {
                ipfsFetchStatusMessage = "IPFS data retrieved but fields are empty.";
            }
        } catch (e: any) {
            console.error(`Failed to fetch IPFS for status check (Record ID: ${recordIdForStatusCheck}, Hash: ${ipfsHash}):`, e);
            ipfsFetchStatusMessage = `IPFS Fetch Error: ${e.code || e.message || 'Unknown error'}`;
            diagnosisFromIpfs = "Error fetching IPFS"; 
            treatmentFromIpfs = "Error fetching IPFS";
        }
      } else if (!ipfsHash || ipfsHash.length === 0) {
        ipfsFetchStatusMessage = "No IPFS hash associated with this record.";
        diagnosisFromIpfs = "No IPFS hash";
        treatmentFromIpfs = "No IPFS hash";
      } else if (!PINATA_GATEWAY_URL) {
        ipfsFetchStatusMessage = "Pinata Gateway URL is not configured.";
        diagnosisFromIpfs = "Gateway URL missing";
        treatmentFromIpfs = "Gateway URL missing";
      }
      
      const costOfRecord = formatUnits(result[2], 0); // cost is result[2]
      const claimStatusString = mapSolidityStatusToString(Number(result[4]) as SolidityClaimStatus); // status is result[4]
      const patientAddress = result[0];
      const hospitalAddressContract = result[3];
      const insuranceCompanyAddress = result[5];
      
      toast({
          title: `Status for Record ${recordIdForStatusCheck}: ${claimStatusString}`,
          description: (
              <div className="text-sm space-y-1">
                  <p><strong>Patient:</strong> <span className="font-mono text-xs break-all">{patientAddress}</span></p>
                  <p><strong>Diagnosis:</strong> {diagnosisFromIpfs}</p>
                  <p><strong>Treatment:</strong> {treatmentFromIpfs}</p>
                  {ipfsFetchStatusMessage && <p className="text-xs text-orange-600"><em>IPFS Info: {ipfsFetchStatusMessage}</em></p>}
                  <p><strong>Cost:</strong> Rp {Number(costOfRecord).toLocaleString('id-ID')}</p>
                  <p><strong>Hospital (from contract):</strong> <span className="font-mono text-xs break-all">{hospitalAddressContract}</span></p>
                  {insuranceCompanyAddress !== ethers.ZeroAddress && <p><strong>Claimed by Insurance:</strong> <span className="font-mono text-xs break-all">{insuranceCompanyAddress}</span></p>}
              </div>
          ),
          duration: 10000, 
      });

    } catch (error: any) {
        console.error("Failed to check status:", error);
        const reason = error?.reason || error?.data?.message || error.message || "Could not fetch details from contract.";
        toast({
            title: "Error Checking Status",
            description: reason,
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
        return 'bg-red-500 text-white'; // More prominent for high priority
      case 'normal':
        return 'bg-blue-500 text-white';
      case 'low':
        return 'bg-gray-400 text-white';
      default:
        return 'bg-gray-400 text-white';
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
                  <p className="text-3xl font-bold">{isLoading ? "..." : pendingClaims}</p>
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
                  <p className="text-3xl font-bold">{isLoading ? "..." : approvedClaims}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100">Total Claims (Yours)</p>
                  <p className="text-3xl font-bold">{isLoading ? "..." : claims.length}</p>
                </div>
                <CreditCard className="w-8 h-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100">Total Approved Amount</p>
                  <p className="text-3xl font-bold">Rp {isLoading ? "..." : totalAmountOfApproved.toLocaleString('id-ID')}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Check Claim Status by Record ID */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5 text-purple-600" />
                Check Record/Claim Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Input
                  placeholder="Enter Record ID"
                  value={recordIdForStatusCheck} 
                  onChange={(e) => setRecordIdForStatusCheck(e.target.value)}
                />
              </div>
              <Button 
                onClick={handleCheckStatusByRecordId} 
                className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white"
                disabled={isLoading || !recordIdForStatusCheck}
              >
                Check Status
              </Button>
            </CardContent>
          </Card>

          {/* Claims List */}
          <Card className="lg:col-span-3 shadow-lg">
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  Claims for Your Company
                </CardTitle>
                <div className="relative w-full sm:w-auto">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search claims..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full sm:w-72 md:w-96" 
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading && <p className="text-center text-gray-500 py-4">Loading claims...</p>}
              {!isLoading && filteredClaims.length === 0 && <p className="text-center text-gray-500 py-4">No claims found for your company or matching your search.</p>}
              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2"> 
                {!isLoading && filteredClaims.map((claim) => (
                  <div key={claim.id} className="p-4 sm:p-6 bg-white rounded-lg border-l-4 border-purple-500 shadow-md hover:shadow-lg transition-shadow">
                    <div className="flex flex-col sm:flex-row items-start justify-between mb-3 sm:mb-4">
                      <div className="space-y-1 sm:space-y-2">
                        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                          <h4 className="font-bold text-md sm:text-lg text-purple-700">Claim ID: {claim.id}</h4>
                          <Badge className={`${getPriorityColor(claim.priority)} text-xs px-2 py-0.5`}>
                            {claim.priority}
                          </Badge>
                          <Badge className={`${getStatusColor(claim.status)} text-xs px-2 py-0.5`}>
                            {claim.status}
                          </Badge>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-600">Record ID: <span className="font-mono text-xs">{claim.recordId}</span></p>
                        <p className="text-xs sm:text-sm text-gray-600">Patient: <span className="font-mono text-xs break-all">{claim.patientAddress}</span></p>
                      </div>
                      <div className="text-left sm:text-right space-y-1 sm:space-y-2 mt-2 sm:mt-0">
                        <p className="text-xl sm:text-2xl font-bold text-purple-600">Rp {Number(claim.cost).toLocaleString('id-ID')}</p>
                        <p className="text-xs text-gray-500">Submitted: {claim.dateSubmitted}</p>
                      </div>
                    </div>
                    
                    <div className="grid md:grid-cols-3 gap-3 sm:gap-4 mb-3 sm:mb-4 text-xs sm:text-sm">
                      <div>
                        <p className="text-gray-500">Diagnosis:</p>
                        <p className="font-medium text-gray-800 break-words">{claim.diagnosis}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Treatment:</p>
                        <p className="font-medium text-gray-800 break-words">{claim.treatment}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Hospital:</p>
                        <p className="font-medium text-gray-800 font-mono text-xs break-all">{claim.hospitalAddress}</p>
                      </div>
                    </div>
                    
                    {claim.status === 'pending' && (
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-3 sm:pt-4 border-t mt-3 sm:mt-4">
                        <Button 
                          onClick={() => handleApproveClaim(claim.id)}
                          className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white text-xs sm:text-sm"
                          size="sm"
                        >
                          <CheckCircle className="mr-1.5 sm:mr-2 w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          Approve
                        </Button>
                        <Button 
                          onClick={() => handleRejectClaim(claim.id)}
                          variant="destructive"
                          className="flex-1 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white text-xs sm:text-sm" 
                          size="sm"
                        >
                          <XCircle className="mr-1.5 sm:mr-2 w-3.5 h-3.5 sm:w-4 sm:h-4" />
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