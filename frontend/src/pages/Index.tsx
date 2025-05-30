import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Users, Building2, Heart, ArrowRight, Lock, Clock, CheckCircle } from "lucide-react";
import WalletConnection from "@/components/WalletConnection";

const Index = () => {
  const navigate = useNavigate();
  const [isConnected, setIsConnected] = useState(false);
  const [connectedAccount, setConnectedAccount] = useState("");

  const handleConnect = () => {
    // Simulate wallet connection and redirect to login
    setIsConnected(true);
    setConnectedAccount("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">
                  MediChain
                </h1>
                <p className="text-sm text-gray-600">Blockchain Medical Records</p>
              </div>
            </div>
            <WalletConnection 
              isConnected={isConnected} 
              onConnect={handleConnect}
              connectedAccount={connectedAccount}
            />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Landing Page */}
        <div className="space-y-16">
          {/* Hero Section */}
          <section className="text-center space-y-8">
            <div className="space-y-4">
              <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">
                🔗 Powered by Blockchain Technology
              </Badge>
              <h2 className="text-5xl font-bold text-gray-900 leading-tight">
                Secure Medical Records<br />
                <span className="bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">
                  on Blockchain
                </span>
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                MediChain revolutionizes healthcare data management by providing a secure, 
                transparent, and decentralized platform for patients, hospitals, and insurance companies.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                size="lg" 
                onClick={handleConnect}
                className="bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Connect Wallet
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button variant="outline" size="lg" className="px-8 py-3 rounded-xl">
                Learn More
              </Button>
            </div>
          </section>

          {/* Features Grid */}
          <section className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="group hover:shadow-lg transition-all duration-300 border-0 bg-white/60 backdrop-blur-sm">
              <CardHeader className="text-center">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl mx-auto flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-lg">Patients</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li>• View medical records</li>
                  <li>• Submit insurance claims</li>
                  <li>• Track claim status</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all duration-300 border-0 bg-white/60 backdrop-blur-sm">
              <CardHeader className="text-center">
                <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl mx-auto flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-lg">Hospitals</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li>• Manage patient records</li>
                  <li>• Submit medical data</li>
                  <li>• Verify treatments</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all duration-300 border-0 bg-white/60 backdrop-blur-sm">
              <CardHeader className="text-center">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl mx-auto flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-lg">Insurance</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li>• Review claims</li>
                  <li>• Approve/reject claims</li>
                  <li>• Validate medical data</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all duration-300 border-0 bg-white/60 backdrop-blur-sm">
              <CardHeader className="text-center">
                <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl mx-auto flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Heart className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-lg">Admins</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li>• Add hospitals</li>
                  <li>• Add insurance companies</li>
                  <li>• System management</li>
                </ul>
              </CardContent>
            </Card>
          </section>

          {/* Benefits Section */}
          <section className="text-center space-y-8">
            <h3 className="text-3xl font-bold text-gray-900">Why Choose MediChain?</h3>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="space-y-4">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full mx-auto flex items-center justify-center">
                  <Lock className="w-8 h-8 text-white" />
                </div>
                <h4 className="text-xl font-semibold">Secure & Private</h4>
                <p className="text-gray-600">Your medical data is encrypted and secured on the blockchain, ensuring maximum privacy and security.</p>
              </div>
              <div className="space-y-4">
                <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full mx-auto flex items-center justify-center">
                  <Clock className="w-8 h-8 text-white" />
                </div>
                <h4 className="text-xl font-semibold">Real-time Updates</h4>
                <p className="text-gray-600">Get instant notifications and real-time updates on your medical records and insurance claims.</p>
              </div>
              <div className="space-y-4">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full mx-auto flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
                <h4 className="text-xl font-semibold">Transparent Process</h4>
                <p className="text-gray-600">Track every step of your medical journey with complete transparency and accountability.</p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Index;
