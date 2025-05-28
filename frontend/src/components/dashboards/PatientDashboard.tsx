import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Users, FileText, CreditCard, Clock, Plus, Calendar, AlertTriangle, HospitalIcon, ShieldCheckIcon, ShieldAlertIcon, HourglassIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import DashboardHeader from "@/components/DashboardHeader";
import { BrowserProvider, Contract, ethers, BigNumberish } from 'ethers';
import { contractAddress, contractABI } from '@/contractConfig'; // Pastikan path ini benar

interface PatientDashboardProps {
  connectedAccount: string;
  onLogout: () => void;
}

interface MedicalRecordUI {
  id: string; // recordId
  patientAddress: string;
  diagnosis: string;
  treatment: string;
  cost: string; // Dikonversi dari uint256
  duration: string; // Dikonversi dari uint256 (misal, "X days")
  hospitalAddress: string;
  // Tanggal tidak ada di kontrak, bisa ditambahkan jika event diindeks atau timestamp
  displayDate?: string; 
}

interface ClaimUI {
  id: string; // claimId
  medicalRecordId: string;
  insuranceCompanyAddress: string;
  status: "Pending" | "Approved" | "Rejected";
  // Info tambahan dari medical record terkait
  diagnosis?: string;
  cost?: string;
  // Tanggal tidak ada di kontrak
  displayDate?: string; 
}

// Enum dari Solidity (untuk referensi dan pemetaan)
enum SolidityClaimStatus {
  Pending,
  Approved,
  Rejected
}

const PatientDashboard = ({ connectedAccount, onLogout }: PatientDashboardProps) => {
  const [recordIdForClaim, setRecordIdForClaim] = useState("");
  const [insuranceAddressForClaim, setInsuranceAddressForClaim] = useState("");
  const [contractInstance, setContractInstance] = useState<Contract | null>(null);

  const [medicalRecords, setMedicalRecords] = useState<MedicalRecordUI[]>([]);
  const [claims, setClaims] = useState<ClaimUI[]>([]);
  
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [isLoadingClaims, setIsLoadingClaims] = useState(false);

  const mapSolidityClaimStatusToString = (statusEnum: SolidityClaimStatus): ClaimUI["status"] => {
    switch (statusEnum) {
      case SolidityClaimStatus.Pending: return "Pending";
      case SolidityClaimStatus.Approved: return "Approved";
      case SolidityClaimStatus.Rejected: return "Rejected";
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
        // Potentially call onLogout or disable functionality
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


  const fetchMedicalRecords = useCallback(async () => {
    if (!contractInstance || !connectedAccount) return;
    setIsLoadingRecords(true);
    try {
      const recordIds: BigNumberish[] = await contractInstance.getPatientRecords(connectedAccount);
      const recordsData: MedicalRecordUI[] = [];

      for (const idBN of recordIds) {
        const recordId = ethers.getNumber(idBN);
        if (recordId === 0) continue; // Skip if recordId is 0 (placeholder or uninitialized)

        const record = await contractInstance.medicalRecords(recordId);
        // medicalRecords mapping returns a struct:
        // (address patient, string diagnosis, uint256 cost, string treatment, uint256 duration, address hospital, bool exists)
        if (record.exists && record.patient.toLowerCase() === connectedAccount.toLowerCase()) {
          recordsData.push({
            id: recordId.toString(),
            patientAddress: record.patient,
            diagnosis: record.diagnosis,
            treatment: record.treatment,
            cost: ethers.formatUnits(record.cost, 0), // Asumsi cost tidak punya desimal di kontrak
            duration: `${ethers.getNumber(record.duration)} days`,
            hospitalAddress: record.hospital,
            // displayDate: "N/A - from contract", // Tanggal tidak ada di kontrak
          });
        }
      }
      setMedicalRecords(recordsData.sort((a, b) => parseInt(b.id) - parseInt(a.id))); // Tampilkan terbaru dulu
    } catch (error) {
      console.error("Error fetching medical records:", error);
      toast({ title: "Error", description: "Gagal mengambil data rekam medis.", variant: "destructive" });
    } finally {
      setIsLoadingRecords(false);
    }
  }, [contractInstance, connectedAccount]);

  const fetchClaimsHistory = useCallback(async () => {
    if (!contractInstance || !connectedAccount) return;
    setIsLoadingClaims(true);
    try {
      const claimIdsBN: BigNumberish[] = await contractInstance.getPatientClaims(connectedAccount);
      const claimsData: ClaimUI[] = [];

      for (const idBN of claimIdsBN) {
        const claimId = ethers.getNumber(idBN);
        if (claimId === 0) continue;

        const claim = await contractInstance.claims(claimId);
        // claims mapping returns a struct: (uint256 recordId, address insuranceCompany, ClaimStatus status)
        
        // Pastikan medical record untuk klaim ini adalah milik pasien yang login
        const associatedRecord = await contractInstance.medicalRecords(claim.recordId);
        if (associatedRecord.exists && associatedRecord.patient.toLowerCase() === connectedAccount.toLowerCase()) {
            claimsData.push({
                id: claimId.toString(),
                medicalRecordId: ethers.getNumber(claim.recordId).toString(),
                insuranceCompanyAddress: claim.insuranceCompany,
                status: mapSolidityClaimStatusToString(Number(claim.status) as SolidityClaimStatus),
                // Ambil diagnosis dan cost dari rekam medis terkait untuk tampilan
                diagnosis: associatedRecord.diagnosis,
                cost: ethers.formatUnits(associatedRecord.cost, 0),
                // displayDate: "N/A - from contract", // Tanggal tidak ada di kontrak
            });
        }
      }
      setClaims(claimsData.sort((a, b) => parseInt(b.id) - parseInt(a.id))); // Tampilkan terbaru dulu
    } catch (error) {
      console.error("Error fetching claims history:", error);
      toast({ title: "Error", description: "Gagal mengambil riwayat klaim.", variant: "destructive" });
    } finally {
      setIsLoadingClaims(false);
    }
  }, [contractInstance, connectedAccount]);

  useEffect(() => {
    if (contractInstance && connectedAccount) {
      fetchMedicalRecords();
      fetchClaimsHistory();
    }
  }, [contractInstance, connectedAccount, fetchMedicalRecords, fetchClaimsHistory]);


  const handleSubmitClaim = async () => {
    if (!recordIdForClaim || !insuranceAddressForClaim) {
      toast({ title: "Error", description: "Mohon isi ID Rekam Medis dan Alamat Asuransi.", variant: "destructive" });
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
    // Validasi apakah recordIdForClaim ada di medicalRecords pasien
    const recordExists = medicalRecords.find(mr => mr.id === recordIdForClaim);
    if (!recordExists) {
        toast({ title: "Error", description: `Rekam medis dengan ID ${recordIdForClaim} tidak ditemukan untuk Anda.`, variant: "destructive" });
        return;
    }

    try {
      const tx = await contractInstance.submitClaim(Number(recordIdForClaim), insuranceAddressForClaim);
      toast({ title: "Processing", description: "Mengirim klaim... mohon tunggu konfirmasi."});
      await tx.wait();
      toast({
        title: "Klaim Terkirim",
        description: `Klaim untuk rekam medis #${recordIdForClaim} berhasil dikirim.`,
      });
      setRecordIdForClaim("");
      setInsuranceAddressForClaim("");
      fetchClaimsHistory(); // Refresh daftar klaim
    } catch (error: any) {
      console.error('Gagal mengirim klaim:', error);
      const reason = error?.reason || error?.data?.message || error.message || "Terjadi kesalahan.";
      toast({ title: "Gagal Mengirim Klaim", description: reason, variant: "destructive" });
    }
  };

  const getStatusStyle = (status: ClaimUI["status"]) => {
    switch (status) {
      case 'Approved': return { badge: 'bg-green-100 text-green-800 hover:bg-green-200', icon: <ShieldCheckIcon className="w-4 h-4 mr-1.5 text-green-600" />, borderColor: 'border-green-500' };
      case 'Rejected': return { badge: 'bg-red-100 text-red-800 hover:bg-red-200', icon: <ShieldAlertIcon className="w-4 h-4 mr-1.5 text-red-600" />, borderColor: 'border-red-500' };
      case 'Pending': return { badge: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200', icon: <HourglassIcon className="w-4 h-4 mr-1.5 text-yellow-600" />, borderColor: 'border-yellow-500' };
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
        {/* Stats Cards */}
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
                 <p className="text-xs text-gray-500 mt-1">Find the Record ID from 'Your Medical Records' section below.</p>
              </div>
              <div>
                <Label htmlFor="insurance-address-claim">Insurance Company Address</Label>
                <Input
                  id="insurance-address-claim" placeholder="0x..."
                  value={insuranceAddressForClaim}
                  onChange={(e) => setInsuranceAddressForClaim(e.target.value)}
                  className="font-mono"
                />
              </div>
              <Button onClick={handleSubmitClaim} disabled={isLoadingClaims || isLoadingRecords}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
              >
                <Plus className="mr-2 w-4 h-4" /> Submit Claim
              </Button>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" /> Your Medical Records
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingRecords && <p className="text-center text-gray-500">Loading medical records...</p>}
              {!isLoadingRecords && medicalRecords.length === 0 && <p className="text-center text-gray-500">No medical records found for your account.</p>}
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {!isLoadingRecords && medicalRecords.map((record) => (
                  <div key={record.id} className={`p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border-l-4 ${getStatusStyle("Pending").borderColor}`}> {/* Default border, bisa disesuaikan */}
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-lg text-emerald-700">{record.diagnosis}</h4>
                      {/* Tanggal bisa ditambahkan jika ada timestamp dari event */}
                       <p className="text-xs text-gray-500">Record ID: <span className="font-semibold text-gray-700">{record.id}</span></p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <div>
                        <p className="text-gray-600">Treatment:</p>
                        <p className="font-medium">{record.treatment}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Hospital Address:</p>
                        <p className="font-medium font-mono text-xs break-all">{record.hospitalAddress}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Cost:</p>
                        <p className="font-medium text-emerald-600">Rp {Number(record.cost).toLocaleString('id-ID')},-</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Duration:</p>
                        <p className="font-medium">{record.duration}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-purple-600" /> Claims History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingClaims && <p className="text-center text-gray-500">Loading claims history...</p>}
            {!isLoadingClaims && claims.length === 0 && <p className="text-center text-gray-500">No claims history found for your account.</p>}
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {!isLoadingClaims && claims.map((claim) => {
                const style = getStatusStyle(claim.status);
                return (
                  <div key={claim.id} className={`p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border-l-4 ${style.borderColor}`}>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-lg text-purple-700">Claim for Record #{claim.medicalRecordId}</h4>
                        <p className="text-xs text-gray-500">Claim ID: <span className="font-semibold text-gray-700">{claim.id}</span></p>
                        <p className="text-sm text-gray-600 mt-1">Diagnosis: {claim.diagnosis || "N/A"}</p>
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