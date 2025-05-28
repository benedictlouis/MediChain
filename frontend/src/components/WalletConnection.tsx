
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet, Copy, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface WalletConnectionProps {
  isConnected: boolean;
  onConnect: () => void;
  connectedAccount: string;
}

const WalletConnection = ({ isConnected, onConnect, connectedAccount }: WalletConnectionProps) => {
  const handleCopyAddress = () => {
    navigator.clipboard.writeText(connectedAccount);
    toast({
      title: "Address Copied",
      description: "Wallet address copied to clipboard",
    });
  };

  if (isConnected) {
    return (
      <div className="flex items-center gap-3">
        <Badge variant="secondary" className="flex items-center gap-2 px-3 py-1">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          Connected
        </Badge>
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2">
          <Wallet className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-mono text-gray-700">
            {connectedAccount.slice(0, 6)}...{connectedAccount.slice(-4)}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyAddress}
            className="p-1 h-auto"
          >
            <Copy className="w-3 h-3" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button 
      onClick={onConnect}
      className="bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white"
    >
      <Wallet className="mr-2 w-4 h-4" />
      Connect Wallet
    </Button>
  );
};

export default WalletConnection;
