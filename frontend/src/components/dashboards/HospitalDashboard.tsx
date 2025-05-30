import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, FileText, Plus, Search } from "lucide-react";
import { toast } from "@/hooks/use-toast"; 
import DashboardHeader from "@/components/DashboardHeader"; 
import { BrowserProvider, Contract, ethers } from 'ethers';
import { contractAddress, contractABI } from '@/contractConfig';

interface HospitalDashboardProps {
  connectedAccount: string; 
  onLogout: () => void;
}

interface PatientUIData {
  id: string; 
  name: string;
  lastVisit: string;
  status: string;
  records: number; 
}

const HospitalDashboard = ({ connectedAccount, onLogout }: HospitalDashboardProps) => {
  // State untuk form input
  const [patientId, setPatientId] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [treatment, setTreatment] = useState("");
  const [cost, setCost] = useState("");
  const [duration, setDuration] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [contractInstance, setContractInstance] = useState<Contract | null>(null);

  const [hospitalPatientList, setHospitalPatientList] = useState<PatientUIData[]>([]);

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
        const signerAddress = await signer.getAddress();

         if (signerAddress.toLowerCase() !== connectedAccount.toLowerCase()) {
           console.warn("Akun MetaMask yang aktif berbeda dengan connectedAccount prop.");
         }

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
    initWeb3();
  }, [connectedAccount]); // Re-init jika connectedAccount berubah

  // Fetch pasien ketika contractInstance sudah siap dan connectedAccount (alamat RS) ada
  useEffect(() => {
    if (contractInstance && connectedAccount) {
      fetchPatientsForHospital(connectedAccount);
    }
  }, [contractInstance, connectedAccount]);

  const fetchPatientsForHospital = async (hospitalAddress: string) => {
    if (!contractInstance) return;
    try {
      const patientAddresses: string[] = await contractInstance.getPatientsByHospital(hospitalAddress);
      
      // Memetakan alamat pasien ke struktur data UI
      // Detail seperti nama, lastVisit, dll. perlu sumber data tambahan atau modifikasi kontrak
      // Untuk saat ini, kita gunakan placeholder
      const formattedPatients: PatientUIData[] = await Promise.all(patientAddresses.map(async (addr, index) => {
        let recordCount = 0;
        try {
          // Cobalah untuk mendapatkan jumlah record jika fungsi getPatientRecords ada dan bisa diakses
          // Asumsi getPatientRecords mengembalikan array ID rekam medis untuk seorang pasien
          // Jika fungsi ini untuk hospital, maka penyesuaian diperlukan.
          // Untuk contoh ini, asumsikan ada fungsi `getRecordCountForPatient(patientAddress)`
          // atau kita bisa hitung dari `getPatientRecords(addr)`.
          // Ini hanya ilustrasi, sesuaikan dengan fungsi kontrak Anda.
          // const recordsArray = await contractInstance.getPatientRecords(addr); // Ini mungkin bukan untuk hospital
          // recordCount = recordsArray.length;
        } catch (e) {
            // console.warn(`Tidak bisa mengambil jumlah record untuk pasien ${addr}`, e);
        }
        return {
          id: addr,
          name: `Patient ${addr.slice(0, 6)}...${addr.slice(-4)}`, // Placeholder
          lastVisit: new Date().toLocaleDateString(), // Placeholder
          status: "active", // Placeholder
          records: recordCount, // Placeholder atau 0
        };
      }));
      setHospitalPatientList(formattedPatients);
    } catch (err: any) {
      console.error("Gagal mengambil daftar pasien rumah sakit:", err);
      toast({
        title: "Error",
        description: err?.data?.message || err?.reason || "Gagal mengambil data pasien dari smart contract.",
        variant: "destructive",
      });
      setHospitalPatientList([]); // Kosongkan jika gagal
    }
  };

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

    try {
      const costInWei = ethers.parseUnits(cost, 'ether'); // Atau unit lain yang sesuai, jika cost dalam ETH
                                                        // Jika cost hanya angka biasa (misal USD), biarkan Number(cost)
                                                        // Sesuaikan ini dengan bagaimana kontrak Anda menangani 'cost'
      const tx = await contractInstance.submitMedicalRecord(
        patientId,      // Alamat pasien
        diagnosis,
        Number(cost),   // Pastikan tipe data cost sesuai dengan kontrak (misal, uint)
        treatment,
        Number(duration) // Pastikan tipe data duration sesuai (misal, uint)
      );
      await tx.wait();
      toast({
        title: "Rekam Medis Terkirim",
        description: `Rekam medis untuk pasien ${patientId.slice(0, 6)}...${patientId.slice(-4)} berhasil dikirim.`,
      });
      
      // Reset form
      setPatientId("");
      setDiagnosis("");
      setTreatment("");
      setCost("");
      setDuration("");

      // Refresh daftar pasien atau update data pasien spesifik jika diperlukan
      // fetchPatientsForHospital(connectedAccount); 
      // Atau, jika submitMedicalRecord menambahkan pasien baru ke daftar RS, refresh:
      if (connectedAccount) fetchPatientsForHospital(connectedAccount);

    } catch (error: any) {
      console.error('Gagal mengirim rekam medis:', error);
      toast({
        title: "Gagal Mengirim Rekam Medis",
        description: error?.data?.message || error?.reason || error.message || "Terjadi kesalahan.",
        variant: "destructive",
      });
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
                  {/* Menggunakan panjang dari hospitalPatientList yang diambil dari kontrak */}
                  <p className="text-3xl font-bold">{hospitalPatientList.length}</p>
                </div>
                <Users className="w-8 h-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          {/* Kartu statistik lain masih menggunakan mock data, perlu disesuaikan jika ada data dari kontrak */}
          <Card className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-100">Total Medical Records</p>
                  <p className="text-3xl font-bold">156</p> {/* Mock Data */}
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
                  <p className="text-3xl font-bold">24</p> {/* Mock Data */}
                </div>
                <Plus className="w-8 h-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100">Avg. Treatment Cost</p>
                  <p className="text-3xl font-bold">$2,450</p> {/* Mock Data */}
                </div>
                <Building2 className="w-8 h-8 text-orange-200" /> {/* Icon mungkin perlu diganti */}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Submit Medical Record */}
          <Card className="lg:col-span-2 shadow-lg">
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
                    id="patient-id-input" // ID diubah agar unik dari state
                    placeholder="0x..."
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    className="font-mono"
                  />
                </div>
                <div>
                  <Label htmlFor="cost-input">Treatment Cost</Label>
                  <Input
                    id="cost-input"
                    type="number"
                    placeholder="e.g., 100 (sesuaikan unit)"
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
                className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
              >
                <Plus className="mr-2 w-4 h-4" />
                Submit Medical Record
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
              
              <div className="space-y-3 max-h-96 overflow-y-auto"> {/* Menambahkan scroll jika daftar panjang */}
                {filteredPatients.length > 0 ? filteredPatients.map((patient) => (
                  <div key={patient.id} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold">{patient.name}</p>
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                        {patient.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600 font-mono mb-1 break-all">{patient.id}</p>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Last visit: {patient.lastVisit}</span>
                      {/* <span>{patient.records} records</span> */} {/* Komentari jika 'records' tidak akurat */}
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