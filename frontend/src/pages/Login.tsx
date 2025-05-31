import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BrowserProvider, Contract } from "ethers";
import { contractAddress, contractABI } from "../contractConfig";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Shield, Wallet, ArrowLeft, LogIn } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const Login = () => {
  const navigate = useNavigate();
  const [walletAddress, setWalletAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [connected, setConnected] = useState(false);

  const connectWallet = async () => {
    if (!window.ethereum) {
      toast({
        title: "MetaMask Not Found",
        description: "Please install MetaMask to continue.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      console.log("Attempting login with userAddress:", userAddress)

      setWalletAddress(userAddress);
      setConnected(true);

      const contract = new Contract(contractAddress, contractABI, signer);

      const adminAddress = await contract.admin();
      console.log("Admin address from contract:", adminAddress);
      
      if (adminAddress.toLowerCase() === userAddress.toLowerCase()) {
        toast({
          title: "Login Successful",
          description: "Redirecting to admin dashboard...",
        });
        return navigate("/admin-dashboard");
      }

      const isHospital = await contract.verifiedHospitals(userAddress);
      if (isHospital) {
        toast({
          title: "Login Successful",
          description: "Redirecting to hospital dashboard...",
        });
        return navigate("/hospital-dashboard");
      }

      const isInsurance = await contract.verifiedInsurance(userAddress);
      if (isInsurance) {
        toast({
          title: "Login Successful",
          description: "Redirecting to insurance dashboard...",
        });
        return navigate("/insurance-dashboard");
      }

      toast({
        title: "Login Successful",
        description: "Redirecting to patient dashboard...",
      });
      navigate("/patient-dashboard");
    } catch (error) {
      console.error("Wallet connection failed:", error);
      toast({
        title: "Login Failed",
        description: "Unable to connect to wallet. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToHome = () => {
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50">
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
            <Button 
              variant="outline" 
              onClick={handleBackToHome}
              className="hover:bg-gray-50"
            >
              <ArrowLeft className="mr-2 w-4 h-4" />
              Back
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <div className="text-center space-y-6 mb-8">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-full mx-auto flex items-center justify-center">
              <Wallet className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Wallet Login</h2>
            <p className="text-gray-600">Connect your MetaMask wallet to continue</p>
          </div>

          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center space-y-4">
              <CardTitle className="text-xl">Connect Your Wallet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="wallet-address">Wallet Address</Label>
                <Input
                  id="wallet-address"
                  type="text"
                  placeholder="0x..."
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>

              <Button 
                onClick={connectWallet}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Connecting...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 w-4 h-4" />
                    Connect Wallet
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Login;
