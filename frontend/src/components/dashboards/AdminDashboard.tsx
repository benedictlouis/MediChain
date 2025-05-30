import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Shield, Building2, Heart, Plus, Users, LogOut, Search } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import DashboardHeader from "@/components/DashboardHeader"; 
import { BrowserProvider, Contract } from 'ethers';
import { contractAddress, contractABI } from '@/contractConfig';

interface AdminDashboardProps {
  connectedAccount: string;
  onLogout: () => void;
}

const AdminDashboard = ({ connectedAccount, onLogout }: AdminDashboardProps) => {
  const [hospitalToAdd, setHospitalToAdd] = useState("");
  const [insuranceToAdd, setInsuranceToAdd] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [contractInstance, setContractInstance] = useState<Contract | null>(null);
  const [hospitals, setHospitals] = useState<string[]>([]); 
  const [insurances, setInsurances] = useState<string[]>([]); 

  useEffect(() => {
    async function init() {
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
        fetchHospitals(contract);
        fetchInsurances(contract);
      } catch (error) {
        console.error('Initialization error:', error);
        toast({
          title: "Error Inisialisasi",
          description: "Gagal terhubung dengan smart contract. Periksa konsol untuk detail.",
          variant: "destructive",
        });
      }
    }

    init();
  }, []);

  const fetchHospitals = async (contractToUse: Contract | null = contractInstance) => {
    if (!contractToUse) return;
    try {
      const result = await contractToUse.getHospitals();
      // Asumsi result adalah array of addresses (string[])
      // Jika result adalah array of objects, sesuaikan di sini
      setHospitals(result.map((addr: string, index: number) => ({ id: index + 1, address: addr, name: `Hospital ${index + 1}`, status: "verified" })));
      //  ^--- Penyesuaian sementara untuk struktur data UI. Idealnya, nama dan status datang dari kontrak atau sumber data lain.
    } catch (err) {
      console.error("Gagal mengambil daftar rumah sakit:", err);
      toast({
        title: "Error",
        description: "Gagal mengambil daftar rumah sakit dari smart contract.",
        variant: "destructive",
      });
    }
  };

  const fetchInsurances = async (contractToUse: Contract | null = contractInstance) => {
    if (!contractToUse) return;
    try {
      const result = await contractToUse.getInsurances();
      // Asumsi result adalah array of addresses (string[])
      setInsurances(result.map((addr: string, index: number) => ({ id: index + 1, address: addr, name: `Insurance Co. ${index + 1}`, status: "verified" })));
      //  ^--- Penyesuaian sementara untuk struktur data UI.
    } catch (err) {
      console.error("Gagal mengambil daftar asuransi:", err);
      toast({
        title: "Error",
        description: "Gagal mengambil daftar asuransi dari smart contract.",
        variant: "destructive",
      });
    }
  };

  const handleAddHospital = async () => {
    if (!contractInstance) {
      toast({ title: "Error", description: "Contract belum siap", variant: "destructive" });
      return;
    }
    if (!hospitalToAdd) {
      toast({ title: "Error", description: "Masukkan alamat wallet rumah sakit", variant: "destructive" });
      return;
    }
    try {
      const tx = await contractInstance.addHospital(hospitalToAdd);
      await tx.wait();
      toast({
        title: "Rumah Sakit Ditambahkan",
        description: `Rumah sakit dengan alamat ${hospitalToAdd} berhasil ditambahkan.`,
      });
      setHospitalToAdd("");
      fetchHospitals(contractInstance); // Refresh daftar rumah sakit
    } catch (error: any) {
      console.error('Add hospital error:', error);
      toast({
        title: "Error",
        description: error?.data?.message || error?.message || "Gagal menambahkan rumah sakit. Pastikan alamat valid dan belum terdaftar.",
        variant: "destructive",
      });
    }
  };

  const handleAddInsurance = async () => {
    if (!contractInstance) {
      toast({ title: "Error", description: "Contract belum siap", variant: "destructive" });
      return;
    }
    if (!insuranceToAdd) {
      toast({ title: "Error", description: "Masukkan alamat wallet perusahaan asuransi", variant: "destructive" });
      return;
    }
    try {
      const tx = await contractInstance.addInsurance(insuranceToAdd);
      await tx.wait();
      toast({
        title: "Asuransi Ditambahkan",
        description: `Perusahaan asuransi dengan alamat ${insuranceToAdd} berhasil ditambahkan.`,
      });
      setInsuranceToAdd("");
      fetchInsurances(contractInstance); // Refresh daftar asuransi
    } catch (error: any) {
      console.error('Add insurance error:', error);
      toast({
        title: "Error",
        description: error?.data?.message || error?.message || "Gagal menambahkan asuransi. Pastikan alamat valid dan belum terdaftar.",
        variant: "destructive",
      });
    }
  };

  const hospitalsForDisplay = hospitals.map((item, index) =>
    typeof item === 'string' ? { id: index, address: item, name: `Hospital Address ${index + 1}`, status: 'verified' } : item
  );

  const insuranceForDisplay = insurances.map((item, index) =>
    typeof item === 'string' ? { id: index, address: item, name: `Insurance Address ${index + 1}`, status: 'verified' } : item
  );


  const filteredHospitals = hospitalsForDisplay.filter(h =>
    h.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredInsurance = insuranceForDisplay.filter(i =>
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.address.toLowerCase().includes(searchTerm.toLowerCase())
  );


  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50">
      <DashboardHeader
        title="Admin Dashboard"
        subtitle="System Management"
        icon={Shield}
        connectedAccount={connectedAccount}
        onLogout={onLogout}
        gradientFrom="from-orange-500"
        gradientTo="to-red-500"
      />

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 lg:max-w-3xl lg:mx-auto">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100">Total Hospitals</p>
                  <p className="text-3xl font-bold">{hospitals.length}</p>
                </div>
                <Building2 className="w-10 h-10 text-blue-200" /> {/* Ikon sedikit lebih besar */}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100">Insurance Companies</p>
                  <p className="text-3xl font-bold">{insurances.length}</p>
                </div>
                <Heart className="w-10 h-10 text-purple-200" /> {/* Ikon sedikit lebih besar */}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Add Hospital */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-600" />
                Add Hospital
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="hospital-address">Hospital Wallet Address</Label>
                <Input
                  id="hospital-address"
                  placeholder="0x..."
                  value={hospitalToAdd}
                  onChange={(e) => setHospitalToAdd(e.target.value)}
                  className="font-mono"
                />
              </div>
              <Button
                onClick={handleAddHospital}
                className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
              >
                <Plus className="mr-2 w-4 h-4" />
                Add Hospital
              </Button>
            </CardContent>
          </Card>

          {/* Add Insurance */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-purple-600" />
                Add Insurance Company
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="insurance-address">Insurance Wallet Address</Label>
                <Input
                  id="insurance-address"
                  placeholder="0x..."
                  value={insuranceToAdd}
                  onChange={(e) => setInsuranceToAdd(e.target.value)}
                  className="font-mono"
                />
              </div>
              <Button
                onClick={handleAddInsurance}
                className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
              >
                <Plus className="mr-2 w-4 h-4" />
                Add Insurance Company
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search hospitals or insurance companies by address or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Verified Hospitals */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-600" />
                Verified Hospitals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredHospitals.length === 0 ? (
                    <p className="text-gray-500">No hospitals found or matching search.</p>
                ) : (
                    filteredHospitals.map((hospital) => (
                    <div key={hospital.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                        {/* Jika Anda hanya memiliki alamat, tampilkan alamat. 
                            Jika kontrak mengembalikan nama, tampilkan hospital.name */}
                        <p className="font-semibold">{hospital.name || "Hospital Address"}</p>
                        <p className="text-sm text-gray-600 font-mono">{hospital.address}</p>
                        </div>
                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200">
                        {hospital.status || "verified"}
                        </Badge>
                    </div>
                    ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Verified Insurance Companies */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-purple-600" />
                Verified Insurance Companies
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredInsurance.length === 0 ? (
                    <p className="text-gray-500">No insurance companies found or matching search.</p>
                ) : (
                    filteredInsurance.map((insurance) => (
                    <div key={insurance.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                        {/* Jika Anda hanya memiliki alamat, tampilkan alamat. 
                            Jika kontrak mengembalikan nama, tampilkan insurance.name */}
                        <p className="font-semibold">{insurance.name || "Insurance Address"}</p>
                        <p className="text-sm text-gray-600 font-mono">{insurance.address}</p>
                        </div>
                        <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-200">
                        {insurance.status || "verified"}
                        </Badge>
                    </div>
                    ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;