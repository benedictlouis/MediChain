
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, Copy, Shield } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface DashboardHeaderProps {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  connectedAccount: string;
  onLogout: () => void;
  gradientFrom: string;
  gradientTo: string;
}

const DashboardHeader = ({ 
  title, 
  subtitle, 
  icon: IconComponent, 
  connectedAccount, 
  onLogout,
  gradientFrom,
  gradientTo 
}: DashboardHeaderProps) => {
  const handleCopyAddress = () => {
    navigator.clipboard.writeText(connectedAccount);
    toast({
      title: "Address Copied",
      description: "Connected account address copied to clipboard",
    });
  };

  return (
    <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`w-12 h-12 bg-gradient-to-r ${gradientFrom} ${gradientTo} rounded-xl flex items-center justify-center shadow-lg`}>
              <IconComponent className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
              <p className="text-gray-600">{subtitle}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
              <Shield className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-mono text-gray-700">
                {connectedAccount.slice(0, 6)}...{connectedAccount.slice(-4)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyAddress}
                className="p-1 h-auto hover:bg-gray-200"
              >
                <Copy className="w-3 h-3" />
              </Button>
            </div>
            
            <Button 
              variant="outline" 
              onClick={onLogout}
              className="hover:bg-red-50 hover:border-red-200 hover:text-red-700"
            >
              <LogOut className="mr-2 w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
