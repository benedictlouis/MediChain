import React, { useState } from 'react';
import { BrowserProvider, Contract } from 'ethers';
import { useNavigate } from 'react-router-dom';
import { contractAddress, contractABI } from '../contractConfig';

const Home = () => {
  const [address, setAddress] = useState('');
  const [connected, setConnected] = useState(false);
  const navigate = useNavigate();

  const connectWallet = async () => {
    console.log("connectWallet triggered");
    alert("connectWallet dijalankan");


    if (!window.ethereum) {
      alert('MetaMask belum terpasang');
      return;
    }

    try {
      const provider = new BrowserProvider(window.ethereum);
      console.log("Provider created");

      const signer = await provider.getSigner();
      console.log("Signer obtained");

      const userAddress = await signer.getAddress();
      console.log("Connected address:", userAddress);

      setAddress(userAddress);
      setConnected(true);

      const contract = new Contract(contractAddress, contractABI, signer);
      console.log("Contract initialized");

      const adminAddress = await contract.admin();
      console.log("Admin address:", adminAddress);

      if (adminAddress.toLowerCase() === userAddress.toLowerCase()) {
        console.log("Redirecting to /admin");
        return navigate('/admin');
      }

      const isHospital = await contract.verifiedHospitals(userAddress);
      console.log("Is hospital:", isHospital);
      if (isHospital) {
        console.log("Redirecting to /hospital");
        return navigate('/hospital');
      }

      const isInsurance = await contract.verifiedInsurance(userAddress);
      console.log("Is insurance:", isInsurance);
      if (isInsurance) {
        console.log("Redirecting to /insurance");
        return navigate('/insurance');
      }

      console.log("Redirecting to /patient");
      navigate('/patient');
    } catch (error) {
      console.error("Gagal menghubungkan wallet:", error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <h1 className="text-3xl font-bold mb-4">Medical Insurance Claim DApp</h1>
      <button
        onClick={() => {
          console.log("Button clicked");
          connectWallet();
        }}
        className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Connect Wallet
      </button>
    </div>
  );
};

export default Home;
