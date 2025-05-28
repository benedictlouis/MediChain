
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Heart, CreditCard, CheckCircle, XCircle, Clock, Search, TrendingUp } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import DashboardHeader from "@/components/DashboardHeader";

interface InsuranceDashboardProps {
  connectedAccount: string;
  onLogout: () => void;
}

const InsuranceDashboard = ({ connectedAccount, onLogout }: InsuranceDashboardProps) => {
  const [claimId, setClaimId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Mock data
  const claims = [
    {
      id: "CLM001",
      patient: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
      patientName: "John Doe",
      amount: "500",
      diagnosis: "Flu",
      treatment: "Rest and medication",
      hospital: "General Hospital",
      status: "pending",
      date: "2024-01-16",
      priority: "normal"
    },
    {
      id: "CLM002",
      patient: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
      patientName: "Jane Smith",
      amount: "1200",
      diagnosis: "Appendicitis",
      treatment: "Surgery",
      hospital: "Medical Center",
      status: "pending",
      date: "2024-01-18",
      priority: "high"
    },
    {
      id: "CLM003",
      patient: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      patientName: "Bob Johnson",
      amount: "200",
      diagnosis: "Checkup",
      treatment: "Routine examination",
      hospital: "Health Clinic",
      status: "approved",
      date: "2024-01-14",
      priority: "low"
    }
  ];

  const handleApproveClaim = (claimId: string) => {
    toast({
      title: "Claim Approved",
      description: `Claim ${claimId} has been approved successfully`,
    });
  };

  const handleRejectClaim = (claimId: string) => {
    toast({
      title: "Claim Rejected",
      description: `Claim ${claimId} has been rejected`,
      variant: "destructive"
    });
  };

  const handleCheckStatus = () => {
    if (!claimId) {
      toast({
        title: "Error",
        description: "Please enter a claim ID",
        variant: "destructive"
      });
      return;
    }
    
    toast({
      title: "Claim Status",
      description: `Status for claim ${claimId}: Pending review`,
    });
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

  const filteredClaims = claims.filter(claim => 
    claim.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    claim.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    claim.diagnosis.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingClaims = claims.filter(c => c.status === 'pending').length;
  const approvedClaims = claims.filter(c => c.status === 'approved').length;
  const totalAmount = claims.reduce((sum, claim) => sum + parseInt(claim.amount), 0);

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
                        <p className="text-2xl font-bold text-purple-600">${claim.amount}</p>
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
