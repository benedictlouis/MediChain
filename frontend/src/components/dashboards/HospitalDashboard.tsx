import { useState, useEffect, useMemo } from "react"; 
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, FileText, Plus, Search, CalendarDays, DollarSign } from "lucide-react"; 
import { toast } from "@/hooks/use-toast";
import DashboardHeader from "@/components/DashboardHeader";
import { BrowserProvider, Contract, ethers, formatUnits } from 'ethers'; 
import { contractAddress, contractABI } from '@/contractConfig';
import axios from 'axios';

interface HospitalDashboardProps {
  connectedAccount: string;
  onLogout: () => void;
}

interface PatientUIData {
  id: string;
  name: string;
  lastVisit: string;
  status: string;
  records: number; // This could be updated based on fetched records for the patient
}

// For data fetched from IPFS for a medical record
interface MedicalRecordIPFSData {
  diagnosis: string;
  treatment: string;
  duration?: number;
  patientId?: string;
  hospital?: string;
  submittedAt: string; // Crucial for "Records This Month" - ISO string format
}

// For data from the smart contract's MedicalRecord struct
interface MedicalRecordOnChainData {
  id: string; // Record ID
  patient: string;
  ipfsHash: string;
  cost: bigint; // Comes as BigInt from contract
  hospital: string; // Hospital address that submitted it
  exists: boolean;
}

// Combined UI data structure for a medical record
interface MedicalRecordUI extends Omit<MedicalRecordOnChainData, 'exists' | 'cost'> {
  cost: number; // Store cost as a number for calculations
  ipfsData?: MedicalRecordIPFSData; // Optional because IPFS fetch might fail or data might be partial
}


const HospitalDashboard = ({ connectedAccount, onLogout }: HospitalDashboardProps) => {
  const [patientId, setPatientId] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [treatment, setTreatment] = useState("");
  const [cost, setCost] = useState("");
  const [duration, setDuration] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [contractInstance, setContractInstance] = useState<Contract | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [hospitalPatientList, setHospitalPatientList] = useState<PatientUIData[]>([]);
  const [allHospitalRecords, setAllHospitalRecords] = useState<MedicalRecordUI[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true); // For loading state of stats cards

  const PINATA_GATEWAY_URL = import.meta.env.VITE_PINATA_GATEWAY_URL;

  useEffect(() => {
    async function initWeb3() {
      if (!window.ethereum) {
        toast({
          title: "Error",
          description: "MetaMask belum terpasang. Silakan install MetaMask.",
          variant: "destructive",
        });
        return;
      }
      try {
        const provider = new BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contract = new Contract(contractAddress, contractABI, signer);
        setContractInstance(contract);
      } catch (error) {
        console.error('Gagal inisialisasi Web3:', error);
        toast({
          title: "Error Inisialisasi Web3",
          description: "Gagal terhubung dengan smart contract. Periksa konsol.",
          variant: "destructive",
        });
      }
    }
    if (connectedAccount) {
        initWeb3();
    }
  }, [connectedAccount]);

  const fetchAllMedicalRecordsForHospital = async () => {
    if (!contractInstance || !connectedAccount || !PINATA_GATEWAY_URL) {
        if (!PINATA_GATEWAY_URL) console.error("Pinata Gateway URL not configured");
        return;
    }
    setIsLoadingStats(true);
    const records: MedicalRecordUI[] = [];
    try {
        const recordCounter = await contractInstance.recordCounter();
        const totalRecords = Number(recordCounter);

        for (let i = 1; i <= totalRecords; i++) {
            const recordId = i.toString();
            const onChainData: MedicalRecordOnChainData = await contractInstance.medicalRecords(recordId);

            if (onChainData.exists && onChainData.hospital.toLowerCase() === connectedAccount.toLowerCase()) {
                let ipfsDataContent: MedicalRecordIPFSData | undefined = undefined;
                if (onChainData.ipfsHash) {
                    try {
                        const ipfsUrl = `${PINATA_GATEWAY_URL}/ipfs/${onChainData.ipfsHash}`;
                        const response = await axios.get<MedicalRecordIPFSData>(ipfsUrl);
                        ipfsDataContent = response.data;
                    } catch (ipfsError) {
                        console.warn(`Failed to fetch IPFS data for record ${recordId}:`, ipfsError);
                    }
                }
                records.push({
                    id: recordId,
                    patient: onChainData.patient,
                    ipfsHash: onChainData.ipfsHash,
                    // Assuming cost is stored in wei or smallest unit. Convert to a number.
                    // If your cost is stored as, e.g., IDR directly, then Number(onChainData.cost) might be enough.
                    // For this example, let's assume it's like 'wei' and we want to display it as a whole number.
                    cost: Number(formatUnits(onChainData.cost, 0)), // Adjust '0' if you use decimals
                    hospital: onChainData.hospital,
                    ipfsData: ipfsDataContent,
                });
            }
        }
        setAllHospitalRecords(records);
    } catch (error) {
        console.error("Failed to fetch medical records for hospital:", error);
        toast({
            title: "Error Fetching Records",
            description: "Could not retrieve all medical records for the hospital.",
            variant: "destructive",
        });
    } finally {
        setIsLoadingStats(false);
    }
  };


  useEffect(() => {
    if (contractInstance && connectedAccount) {
      fetchPatientsForHospital(connectedAccount);
      fetchAllMedicalRecordsForHospital(); // Fetch records for stats
    }
  }, [contractInstance, connectedAccount, PINATA_GATEWAY_URL]); // Added PINATA_GATEWAY_URL

   const fetchPatientsForHospital = async (hospitalAddress: string) => {
    if (!contractInstance) return;
    try {
      const patientAddressesFromContract: string[] = await contractInstance.getPatientsByHospital(hospitalAddress);
      const uniquePatientAddresses = [...new Set(patientAddressesFromContract)];

      const formattedPatients: PatientUIData[] = uniquePatientAddresses.map((addr) => ({
        id: addr,
        name: `Patient ${addr.slice(0, 6)}...${addr.slice(-4)}`,
        lastVisit: new Date().toLocaleDateString(), 
        status: "active", 
        records: allHospitalRecords.filter(rec => rec.patient.toLowerCase() === addr.toLowerCase()).length, // Update record count
      }));
      setHospitalPatientList(formattedPatients);
    } catch (err: any) {
      console.error("Gagal mengambil daftar pasien rumah sakit:", err);
      toast({
        title: "Error",
        description: err?.data?.message || err?.reason || "Gagal mengambil data pasien dari smart contract.",
        variant: "destructive",
      });
      setHospitalPatientList([]);
    }
  };

  // Recalculate patient record counts when allHospitalRecords changes
  useEffect(() => {
    if (hospitalPatientList.length > 0 && allHospitalRecords.length > 0) {
        setHospitalPatientList(prevList => 
            prevList.map(p => ({
                ...p,
                records: allHospitalRecords.filter(rec => rec.patient.toLowerCase() === p.id.toLowerCase()).length
            }))
        );
    }
  }, [allHospitalRecords, hospitalPatientList.length]); // Note: hospitalPatientList.length to avoid loop with object

  const hospitalStats = useMemo(() => {
    const totalRecords = allHospitalRecords.length;
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const recordsThisMonth = allHospitalRecords.filter(record => {
        if (record.ipfsData?.submittedAt) {
            try {
                const submittedDate = new Date(record.ipfsData.submittedAt);
                return submittedDate.getMonth() === currentMonth && submittedDate.getFullYear() === currentYear;
            } catch (e) { return false; /* Invalid date format in IPFS */ }
        }
        return false;
    }).length;

    const totalCostSum = allHospitalRecords.reduce((sum, record) => sum + record.cost, 0);
    const averageTreatmentCost = totalRecords > 0 ? totalCostSum / totalRecords : 0;

    return {
        totalMedicalRecords: totalRecords,
        recordsThisMonth: recordsThisMonth,
        averageTreatmentCost: averageTreatmentCost,
    };
  }, [allHospitalRecords]);


  const handleSubmitRecord = async () => {
    if (!patientId || !diagnosis || !treatment || !cost || !duration) {
      toast({
        title: "Error",
        description: "Mohon lengkapi semua field rekam medis",
        variant: "destructive"
      });
      return;
    }
    if (!contractInstance) {
      toast({ title: "Error", description: "Contract belum siap", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const medicalDataForIpfs = {
        pinataContent: { 
            diagnosis,
            treatment,
            duration: Number(duration), 
            patientId, 
            hospital: connectedAccount, 
            submittedAt: new Date().toISOString(), // Add submittedAt
        },
        pinataMetadata: {
            name: `MedicalRecord_${patientId}_${Date.now()}`,
            keyvalues: { 
                patientId: patientId,
                hospitalAddress: connectedAccount
            }
        }
      };

      const backendUploadUrl = 'http://localhost:3001/api/upload';       
      let ipfsHash = '';
      try {
        const response = await axios.post(backendUploadUrl, medicalDataForIpfs);
        ipfsHash = response.data.ipfsHash;
        if (!ipfsHash) {
            throw new Error("IPFS hash not returned from backend.");
        }
        toast({
          title: "Data diunggah ke IPFS",
          description: `Hash: ${ipfsHash.slice(0,10)}...${ipfsHash.slice(-4)}`,
        });
      } catch (uploadError: any) {
        console.error('Gagal upload ke IPFS via backend:', uploadError);
        toast({
            title: "Gagal Upload ke IPFS",
            description: uploadError.response?.data?.error || uploadError.message || "Terjadi kesalahan saat menghubungi server backend.",
            variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }
      
      // Ensure cost is a positive integer string before parsing
      const costInSmallestUnit = ethers.parseUnits(cost.toString(), 0); // Assuming cost input is already in smallest unit (e.g. IDR, not Ether)

      const tx = await contractInstance.submitMedicalRecord(
        patientId,
        ipfsHash,
        costInSmallestUnit 
      );
      await tx.wait();
      toast({
        title: "Rekam Medis Terkirim",
        description: `Rekam medis untuk pasien ${patientId.slice(0, 6)}...${patientId.slice(-4)} berhasil dikirim ke blockchain.`,
      });
      
      setPatientId("");
      setDiagnosis("");
      setTreatment("");
      setCost("");
      setDuration("");

      // Refetch data to update stats and lists
      if (connectedAccount) {
          fetchPatientsForHospital(connectedAccount);
          fetchAllMedicalRecordsForHospital();
      }

    } catch (error: any) {
      console.error('Gagal mengirim rekam medis ke blockchain:', error);
      if (!error.message?.includes("IPFS") && !error.message?.includes("backend")) {
        toast({
            title: "Gagal Mengirim ke Blockchain",
            description: error?.data?.message || error?.reason || error.message || "Terjadi kesalahan.",
            variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPatients = hospitalPatientList.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-50">
      <DashboardHeader
        title="Hospital Dashboard"
        subtitle="Medical Records Management"
        icon={Building2}
        connectedAccount={connectedAccount}
        onLogout={onLogout}
        gradientFrom="from-emerald-500"
        gradientTo="to-green-500"
      />

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100">Total Patients</p>
                  <p className="text-3xl font-bold">{isLoadingStats ? "..." : hospitalPatientList.length}</p>
                </div>
                <Users className="w-8 h-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>
           <Card className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-100">Total Medical Records</p>
                  <p className="text-3xl font-bold">{isLoadingStats ? "..." : hospitalStats.totalMedicalRecords}</p>
                </div>
                <FileText className="w-8 h-8 text-emerald-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100">Records This Month</p>
                  <p className="text-3xl font-bold">{isLoadingStats ? "..." : hospitalStats.recordsThisMonth}</p>
                </div>
                <CalendarDays className="w-8 h-8 text-purple-200" /> {/* Changed Icon */}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100">Avg. Treatment Cost</p>
                  {/* Assuming cost is in IDR or a similar currency without decimals for display */}
                  <p className="text-3xl font-bold">{isLoadingStats ? "..." : `Rp ${hospitalStats.averageTreatmentCost.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}</p>
                </div>
                <DollarSign className="w-8 h-8 text-orange-200" /> {/* Changed Icon */}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 shadow-lg">
{/* ... rest of your JSX for Submit Medical Record form ... */}
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                Submit Medical Record
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="patient-id-input">Patient Wallet Address</Label>
                  <Input
                    id="patient-id-input"
                    placeholder="0x..."
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    className="font-mono"
                  />
                </div>
                <div>
                  <Label htmlFor="cost-input">Treatment Cost (e.g., IDR)</Label>
                  <Input
                    id="cost-input"
                    type="number"
                    placeholder="e.g., 1000000"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="diagnosis-input">Diagnosis</Label>
                <Input
                  id="diagnosis-input"
                  placeholder="Enter diagnosis"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="treatment-input">Treatment</Label>
                <Input
                  id="treatment-input"
                  placeholder="Enter treatment details"
                  value={treatment}
                  onChange={(e) => setTreatment(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="duration-input">Duration (days)</Label>
                <Input
                  id="duration-input"
                  type="number"
                  placeholder="e.g., 7"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
              </div>
              <Button
                onClick={handleSubmitRecord}
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 w-4 h-4" />
                    Submit Medical Record
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Patient Search & List */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Patients
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search patients by address or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredPatients.length > 0 ? filteredPatients.map((patient) => (
                  <div key={patient.id} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center justify-between mb-1"> {/* Reduced mb */}
                      <p className="font-semibold text-sm">{patient.name}</p> {/* text-sm */}
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-200 text-xs px-1.5 py-0.5"> {/* Smaller badge */}
                        {patient.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600 font-mono mb-1 break-all">{patient.id}</p>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Last visit: {patient.lastVisit}</span>
                      <span>Records: {patient.records}</span> {/* Display record count */}
                    </div>
                  </div>
                )) : (
                  <p className="text-sm text-gray-500">No patients found or matching search.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default HospitalDashboard;