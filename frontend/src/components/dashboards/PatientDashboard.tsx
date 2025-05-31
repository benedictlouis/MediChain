import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Users, FileText, CreditCard, Clock, Plus, AlertTriangle, HospitalIcon, ShieldCheckIcon, ShieldAlertIcon, HourglassIcon, Stethoscope, Syringe, CalendarDays } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import DashboardHeader from "@/components/DashboardHeader";
import { BrowserProvider, Contract, ethers, BigNumberish, formatUnits } from 'ethers';
import { contractAddress, contractABI } from '@/contractConfig';
import axios from 'axios';

interface PatientDashboardProps {
  connectedAccount: string;
  onLogout: () => void;
}

// For data fetched from IPFS
interface MedicalRecordIPFSData {
  diagnosis: string;
  treatment: string;
  duration: string; // e.g., "7 days" or number of days
  // Add any other fields you store in the IPFS JSON
  submittedAt?: string; 
}

// For data from the smart contract's MedicalRecord struct
interface MedicalRecordChainData {
  id: string; // recordId
  patientAddress: string;
  ipfsHash: string;
  cost: string; // Formatted cost
  hospitalAddress: string;
  exists: boolean;
}

// Combined UI data structure
interface MedicalRecordUI extends MedicalRecordChainData, Partial<MedicalRecordIPFSData> {
  isLoadingIpfsDetails: boolean;
  claimStatus?: ClaimUI["status"]; // To show claim status alongside record
  insuranceCompanyForClaim?: string; // If claimed
}

interface ClaimUI {
  id: string; // claimId
  medicalRecordId: string;
  insuranceCompanyAddress: string;
  status: "Pending" | "Approved" | "Rejected" | "Not Claimed"; // Extended to include Not Claimed
  // IPFS data for the associated medical record
  diagnosis?: string;
  treatment?: string;
  cost?: string; // Cost from the medical record
  displayDate?: string;
}

// Matches Solidity enum ClaimStatus { Pending, Approved, Rejected, NotClaimed }
enum SolidityClaimStatus {
  Pending,
  Approved,
  Rejected,
  NotClaimed
}

const PatientDashboard = ({ connectedAccount, onLogout }: PatientDashboardProps) => {
  const [recordIdForClaim, setRecordIdForClaim] = useState("");
  const [insuranceAddressForClaim, setInsuranceAddressForClaim] = useState("");
  const [contractInstance, setContractInstance] = useState<Contract | null>(null);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecordUI[]>([]);
  const [claims, setClaims] = useState<ClaimUI[]>([]); // This can be a separate list for "Claims History"
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [isLoadingClaims, setIsLoadingClaims] = useState(false);
  const [availableInsurances, setAvailableInsurances] = useState<string[]>([]);

  const PINATA_GATEWAY_URL = import.meta.env.VITE_PINATA_GATEWAY_URL;

  const mapSolidityClaimStatusToString = (statusEnum: SolidityClaimStatus): ClaimUI["status"] => {
    switch (statusEnum) {
      case SolidityClaimStatus.Pending: return "Pending";
      case SolidityClaimStatus.Approved: return "Approved";
      case SolidityClaimStatus.Rejected: return "Rejected";
      case SolidityClaimStatus.NotClaimed: return "Not Claimed";
      default: return "Pending"; // Fallback
    }
  };

  const initWeb3 = useCallback(async () => {
    if (!window.ethereum) {
      toast({ title: "Error", description: "MetaMask belum terpasang.", variant: "destructive" });
      return;
    }
    try {
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();

      if (userAddress.toLowerCase() !== connectedAccount.toLowerCase()) {
        toast({
            title: "Account Mismatch",
            description: `MetaMask account (${userAddress.slice(0,6)}...) does not match connected account (${connectedAccount.slice(0,6)}...). Please switch accounts in MetaMask.`,
            variant: "destructive",
            duration: 7000,
        });
        return;
      }
      const contract = new Contract(contractAddress, contractABI, signer);
      setContractInstance(contract);
    } catch (error) {
      console.error('Gagal inisialisasi Web3:', error);
      toast({ title: "Error Inisialisasi Web3", description: "Gagal terhubung dengan smart contract.", variant: "destructive" });
    }
  }, [connectedAccount]);

  useEffect(() => {
    initWeb3();
  }, [initWeb3]);

  const fetchMedicalRecordsAndClaims = useCallback(async () => {
    if (!contractInstance || !connectedAccount) return;
    if (!PINATA_GATEWAY_URL) {
        toast({ title: "Configuration Error", description: "Pinata Gateway URL not set.", variant: "destructive" });
        return;
    }

    setIsLoadingRecords(true);
    setMedicalRecords([]); // Clear previous records

    try {
      // Use getRecordsByPatient as defined in your contract
      const recordIdsBN: BigNumberish[] = await contractInstance.getRecordsByPatient(connectedAccount);
      
      if (recordIdsBN.length === 0) {
        toast({ title: "Info", description: "Anda belum memiliki rekam medis.", variant: "default" });
        setIsLoadingRecords(false);
        return;
      }

      const recordsPromises = recordIdsBN.map(async (idBN) => {
        const recordId = ethers.getNumber(idBN);
        if (recordId === 0) return null;

        try {
          // Fetch on-chain data including claim status
          const recordDetails = await contractInstance.getRecordAndClaimDetails(recordId);
          // recordDetails: [patient, ipfsHash, cost, hospital, status, insuranceCompany]
          
          const chainData: MedicalRecordUI = {
            id: recordId.toString(),
            patientAddress: recordDetails[0],
            ipfsHash: recordDetails[1],
            cost: formatUnits(recordDetails[2], 0), // Assuming cost has 0 decimals in contract
            hospitalAddress: recordDetails[3],
            exists: true, // Assuming getRecordAndClaimDetails implies existence
            isLoadingIpfsDetails: true,
            claimStatus: mapSolidityClaimStatusToString(Number(recordDetails[4]) as SolidityClaimStatus),
            insuranceCompanyForClaim: recordDetails[5] === ethers.ZeroAddress ? undefined : recordDetails[5],
          };
          return chainData;
        } catch (contractError) {
          console.error(`Error fetching details for record ${recordId} from contract:`, contractError);
          return null;
        }
      });

      const initialRecordsData = (await Promise.all(recordsPromises)).filter(r => r !== null) as MedicalRecordUI[];
      setMedicalRecords(initialRecordsData.sort((a, b) => parseInt(b.id) - parseInt(a.id))); // Show on-chain data first

      // Now fetch IPFS data for each record
      initialRecordsData.forEach(async (record) => {
        if (record.ipfsHash) {
          try {
            const ipfsUrl = `${PINATA_GATEWAY_URL}/ipfs/${record.ipfsHash}`;
            const ipfsResponse = await axios.get<MedicalRecordIPFSData>(ipfsUrl);
            
            setMedicalRecords(prevRecords => 
              prevRecords.map(r => 
                r.id === record.id 
                  ? { ...r, ...ipfsResponse.data, isLoadingIpfsDetails: false } 
                  : r
              )
            );
          } catch (ipfsError) {
            console.error(`Error fetching IPFS data for record ${record.id} (hash: ${record.ipfsHash}):`, ipfsError);
            setMedicalRecords(prevRecords => 
              prevRecords.map(r => 
                r.id === record.id 
                  ? { ...r, isLoadingIpfsDetails: false, diagnosis: "Error fetching IPFS data" } 
                  : r
              )
            );
          }
        } else {
           setMedicalRecords(prevRecords => 
              prevRecords.map(r => 
                r.id === record.id 
                  ? { ...r, isLoadingIpfsDetails: false, diagnosis: "No IPFS hash found" } 
                  : r
              )
            );
        }
      });

    } catch (error) {
      console.error("Error fetching medical records:", error);
      toast({ title: "Error", description: "Gagal mengambil data rekam medis.", variant: "destructive" });
    } finally {
      setIsLoadingRecords(false);
    }
  }, [contractInstance, connectedAccount, PINATA_GATEWAY_URL]);


  const fetchClaimsHistorySeparate = useCallback(async () => {
    // This function can be used if you want a separate "Claims History" list
    // that might show different/less detail than the main medical records list.
    // For now, the main list already incorporates claim status.
    // If you still need this, it would also need to fetch IPFS data for diagnosis.
    if (!contractInstance || !connectedAccount) return;
    setIsLoadingClaims(true);
    try {
      const claimIdsBN: BigNumberish[] = await contractInstance.getClaimsByPatient(connectedAccount);
      const claimsDataPromises: Promise<ClaimUI | null>[] = [];

      for (const idBN of claimIdsBN) {
        const claimId = ethers.getNumber(idBN);
        if (claimId === 0) continue;

        claimsDataPromises.push(
          (async () => {
            const claim = await contractInstance.claims(claimId); // {recordId, insuranceCompany, status}
            const recordDetails = await contractInstance.getRecordAndClaimDetails(claim.recordId);
            // recordDetails: [patient, ipfsHash, cost, hospital, status, insuranceCompany]

            let diagnosisFromIpfs = "N/A";
            if (recordDetails[1] && PINATA_GATEWAY_URL) { // ipfsHash exists
                try {
                    const ipfsUrl = `${PINATA_GATEWAY_URL}/ipfs/${recordDetails[1]}`;
                    const ipfsResponse = await axios.get<MedicalRecordIPFSData>(ipfsUrl);
                    diagnosisFromIpfs = ipfsResponse.data.diagnosis;
                } catch (e) { console.error("Failed to fetch diagnosis for claim's record", e); }
            }

            return {
              id: claimId.toString(),
              medicalRecordId: ethers.getNumber(claim.recordId).toString(),
              insuranceCompanyAddress: claim.insuranceCompany,
              status: mapSolidityClaimStatusToString(Number(claim.status) as SolidityClaimStatus),
              diagnosis: diagnosisFromIpfs,
              cost: formatUnits(recordDetails[2], 0),
            };
          })()
        );
      }
      const resolvedClaimsData = (await Promise.all(claimsDataPromises)).filter(c => c !== null) as ClaimUI[];
      setClaims(resolvedClaimsData.sort((a, b) => parseInt(b.id) - parseInt(a.id)));
    } catch (error) {
      console.error("Error fetching claims history:", error);
      toast({ title: "Error", description: "Gagal mengambil riwayat klaim.", variant: "destructive" });
    } finally {
      setIsLoadingClaims(false);
    }
  }, [contractInstance, connectedAccount, PINATA_GATEWAY_URL]);


  const fetchAvailableInsurances = useCallback(async () => {
    if (!contractInstance) return;
    try {
        const insuranceList: string[] = await contractInstance.getInsurances();
        setAvailableInsurances(insuranceList);
        if (insuranceList.length > 0 && !insuranceAddressForClaim) {
            setInsuranceAddressForClaim(insuranceList[0]); // Default to first one if not set
        }
    } catch (error) {
        console.error("Failed to fetch insurances:", error);
        toast({ title: "Error", description: "Gagal mengambil daftar perusahaan asuransi.", variant: "destructive" });
    }
  }, [contractInstance, insuranceAddressForClaim]);


  useEffect(() => {
    if (contractInstance && connectedAccount) {
      fetchMedicalRecordsAndClaims(); // This now fetches records and their claim details
      fetchClaimsHistorySeparate(); // Fetch separate claims list if needed
      fetchAvailableInsurances();
    }
  }, [contractInstance, connectedAccount, fetchMedicalRecordsAndClaims, fetchClaimsHistorySeparate, fetchAvailableInsurances]);


  const handleSubmitClaim = async () => {
    if (!recordIdForClaim || !insuranceAddressForClaim) {
      toast({ title: "Error", description: "Mohon isi ID Rekam Medis dan pilih Asuransi.", variant: "destructive" });
      return;
    }
    if (!contractInstance) {
      toast({ title: "Error", description: "Smart contract belum siap.", variant: "destructive" });
      return;
    }
    if (!ethers.isAddress(insuranceAddressForClaim)) {
        toast({ title: "Error", description: "Alamat perusahaan asuransi tidak valid.", variant: "destructive" });
        return;
    }
    
    const recordToClaim = medicalRecords.find(mr => mr.id === recordIdForClaim);
    if (!recordToClaim) {
        toast({ title: "Error", description: `Rekam medis dengan ID ${recordIdForClaim} tidak ditemukan.`, variant: "destructive" });
        return;
    }
    if (recordToClaim.claimStatus !== "Not Claimed") {
        toast({ title: "Info", description: `Rekam medis ID ${recordIdForClaim} sudah pernah diklaim atau sedang diproses.`, variant: "default" });
        return;
    }

    try {
      const tx = await contractInstance.submitClaim(BigInt(recordIdForClaim), insuranceAddressForClaim);
      toast({ title: "Processing", description: "Mengirim klaim... mohon tunggu konfirmasi."});
      await tx.wait();
      toast({
        title: "Klaim Terkirim",
        description: `Klaim untuk rekam medis #${recordIdForClaim} berhasil dikirim.`,
      });
      setRecordIdForClaim("");
      // Don't reset insuranceAddressForClaim if you want it to persist
      fetchMedicalRecordsAndClaims(); // Refresh records and their claim statuses
      fetchClaimsHistorySeparate(); // Refresh separate claims list
    } catch (error: any) {
      console.error('Gagal mengirim klaim:', error);
      const reason = error?.reason || error?.data?.message || error.message || "Terjadi kesalahan.";
      toast({ title: "Gagal Mengirim Klaim", description: reason, variant: "destructive" });
    }
  };

  const getStatusStyle = (status: ClaimUI["status"] | undefined) => {
    switch (status) {
      case 'Approved': return { badge: 'bg-green-100 text-green-800 hover:bg-green-200', icon: <ShieldCheckIcon className="w-4 h-4 mr-1.5 text-green-600" />, borderColor: 'border-green-500' };
      case 'Rejected': return { badge: 'bg-red-100 text-red-800 hover:bg-red-200', icon: <ShieldAlertIcon className="w-4 h-4 mr-1.5 text-red-600" />, borderColor: 'border-red-500' };
      case 'Pending': return { badge: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200', icon: <HourglassIcon className="w-4 h-4 mr-1.5 text-yellow-600" />, borderColor: 'border-yellow-500' };
      case 'Not Claimed': return { badge: 'bg-gray-100 text-gray-700 hover:bg-gray-200', icon: <FileText className="w-4 h-4 mr-1.5 text-gray-500" />, borderColor: 'border-gray-400' };
      default: return { badge: 'bg-gray-100 text-gray-800 hover:bg-gray-200', icon: <AlertTriangle className="w-4 h-4 mr-1.5 text-gray-600" />, borderColor: 'border-gray-500' };
    }
  };
  
  const pendingClaimsCount = claims.filter(c => c.status === 'Pending').length;
  const approvedClaimsCount = claims.filter(c => c.status === 'Approved').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      <DashboardHeader 
        title="Patient Dashboard"
        subtitle="Your Medical Records & Claims"
        icon={Users}
        connectedAccount={connectedAccount}
        onLogout={onLogout}
        gradientFrom="from-blue-500"
        gradientTo="to-cyan-500"
      />

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Stats Cards - (No changes here, assuming they are okay) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100">Medical Records</p>
                  <p className="text-3xl font-bold">{isLoadingRecords ? "..." : medicalRecords.length}</p>
                </div>
                <FileText className="w-8 h-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-100">Total Claims</p>
                  <p className="text-3xl font-bold">{isLoadingClaims ? "..." : claims.length}</p>
                </div>
                <CreditCard className="w-8 h-8 text-emerald-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-100">Pending Claims</p>
                  <p className="text-3xl font-bold">{isLoadingClaims ? "..." : pendingClaimsCount}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100">Approved Claims</p>
                  <p className="text-3xl font-bold">{isLoadingClaims ? "..." : approvedClaimsCount}</p>
                </div>
                <ShieldCheckIcon className="w-8 h-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Submit Claim Card */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-600" />
                Submit Insurance Claim
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="record-id-claim">Medical Record ID to Claim</Label>
                <Input
                  id="record-id-claim" type="number"
                  placeholder="Enter ID of your medical record"
                  value={recordIdForClaim}
                  onChange={(e) => setRecordIdForClaim(e.target.value)}
                />
                 <p className="text-xs text-gray-500 mt-1">Find the Record ID from 'Your Medical Records' section.</p>
              </div>
              <div>
                <Label htmlFor="insurance-address-claim">Insurance Company Address</Label>
                <Input
                  id="insurance-address-claim"
                  placeholder="Enter Insurance Company's Wallet Address (0x...)"
                  value={insuranceAddressForClaim}
                  onChange={(e) => setInsuranceAddressForClaim(e.target.value)}
                  className="font-mono"
                />
                {/* You can optionally show available insurances as a non-interactive list or helper text if desired */}
                {availableInsurances.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Previously known: {availableInsurances.map(addr => `${addr.slice(0,6)}...${addr.slice(-4)}`).join(', ')}
                  </p>
                )}
              </div>
              <Button onClick={handleSubmitClaim} disabled={isLoadingClaims || isLoadingRecords || !recordIdForClaim || !insuranceAddressForClaim}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
              >
                <Plus className="mr-2 w-4 h-4" /> Submit Claim
              </Button>
            </CardContent>
          </Card>

          {/* Medical Records List */}
          <Card className="lg:col-span-2 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" /> Your Medical Records
              </CardTitle>
              <CardDescription>View details of your past medical encounters and their claim status.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingRecords && <p className="text-center text-gray-500 py-4">Loading medical records...</p>}
              {!isLoadingRecords && medicalRecords.length === 0 && <p className="text-center text-gray-500 py-4">No medical records found for your account.</p>}
              <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2">
                {!isLoadingRecords && medicalRecords.map((record) => {
                  const style = getStatusStyle(record.claimStatus);
                  return (
                  <div key={record.id} className={`p-4 rounded-lg border-l-4 ${style.borderColor} bg-white shadow-md hover:shadow-lg transition-shadow`}>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3">
                      <h4 className="font-semibold text-lg text-emerald-700">
                        Record ID: <span className="font-mono">{record.id}</span>
                      </h4>
                      <Badge className={`${style.badge} flex items-center mt-2 sm:mt-0`}>
                        {style.icon}
                        {record.claimStatus || "Loading Status..."}
                      </Badge>
                    </div>

                    {record.isLoadingIpfsDetails ? (
                      <p className="text-sm text-gray-500">Loading details from IPFS...</p>
                    ) : (
                      <div className="grid md:grid-cols-2 gap-x-6 gap-y-3 text-sm mb-3">
                        <div className="flex items-start">
                          <Stethoscope className="w-4 h-4 mr-2 mt-1 text-emerald-600 flex-shrink-0" />
                          <div><span className="text-gray-600">Diagnosis:</span> <p className="font-medium text-gray-800">{record.diagnosis || "N/A"}</p></div>
                        </div>
                        <div className="flex items-start">
                          <Syringe className="w-4 h-4 mr-2 mt-1 text-emerald-600 flex-shrink-0" />
                          <div><span className="text-gray-600">Treatment:</span> <p className="font-medium text-gray-800">{record.treatment || "N/A"}</p></div>
                        </div>
                        <div className="flex items-start">
                          <CalendarDays className="w-4 h-4 mr-2 mt-1 text-emerald-600 flex-shrink-0" />
                          <div><span className="text-gray-600">Duration:</span> <p className="font-medium text-gray-800">{record.duration ? `${record.duration} days` : "N/A"}</p></div>
                        </div>
                         <div className="flex items-start">
                            <HospitalIcon className="w-4 h-4 mr-2 mt-1 text-gray-500 flex-shrink-0" />
                            <div><span className="text-gray-600">Hospital:</span> <p className="font-medium font-mono text-xs text-gray-700 break-all">{record.hospitalAddress}</p></div>
                        </div>
                        <div className="flex items-start">
                            <CreditCard className="w-4 h-4 mr-2 mt-1 text-green-600 flex-shrink-0" />
                            <div><span className="text-gray-600">Cost:</span> <p className="font-medium text-green-700">Rp {Number(record.cost).toLocaleString('id-ID')},-</p></div>
                        </div>
                        {record.submittedAt && (
                            <div className="flex items-start md:col-span-2">
                                <CalendarDays className="w-4 h-4 mr-2 mt-1 text-gray-500 flex-shrink-0" />
                                <div><span className="text-gray-600">Submitted:</span> <p className="font-medium text-gray-700">{new Date(record.submittedAt).toLocaleString()}</p></div>
                            </div>
                        )}
                      </div>
                    )}
                    {record.claimStatus === "Not Claimed" && !record.isLoadingIpfsDetails && (
                        <Button 
                            size="sm"
                            onClick={() => {
                                setRecordIdForClaim(record.id);
                                // Optionally scroll to claim submission form or open a modal
                                document.getElementById('record-id-claim')?.focus();
                            }}
                            className="mt-2 bg-blue-500 hover:bg-blue-600 text-white text-xs"
                        >
                            Submit Claim for this Record
                        </Button>
                    )}
                    {record.claimStatus !== "Not Claimed" && record.insuranceCompanyForClaim && (
                        <p className="text-xs text-gray-500 mt-2">Claimed with: <span className="font-mono">{record.insuranceCompanyForClaim}</span></p>
                    )}
                  </div>
                )})}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Claims History Card - (No changes here, assuming it's okay or you'll adapt it similarly if needed) */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-purple-600" /> Claims History
            </CardTitle>
            <CardDescription>Overview of all your submitted insurance claims.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingClaims && <p className="text-center text-gray-500 py-4">Loading claims history...</p>}
            {!isLoadingClaims && claims.length === 0 && <p className="text-center text-gray-500 py-4">No claims history found for your account.</p>}
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
              {!isLoadingClaims && claims.map((claim) => {
                const style = getStatusStyle(claim.status);
                return (
                  <div key={claim.id} className={`p-4 rounded-lg border-l-4 ${style.borderColor} bg-white shadow-md`}>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-lg text-purple-700">Claim for Record #{claim.medicalRecordId}</h4>
                        <p className="text-xs text-gray-500">Claim ID: <span className="font-semibold text-gray-700">{claim.id}</span></p>
                        <p className="text-sm text-gray-600 mt-1">Diagnosis: {claim.diagnosis || "N/A (Fetch from IPFS if needed)"}</p>
                        <p className="text-sm text-gray-600">Insurance Co. Address: <span className="font-mono text-xs">{claim.insuranceCompanyAddress}</span></p>
                      </div>
                      <div className="text-left sm:text-right mt-2 sm:mt-0">
                        <Badge className={`${style.badge} flex items-center`}>
                          {style.icon}
                          {claim.status}
                        </Badge>
                        <p className="text-sm text-purple-600 font-semibold mt-1">Claimed Cost: Rp {Number(claim.cost || 0).toLocaleString('id-ID')},-</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default PatientDashboard;