import React, { useState, useEffect } from 'react';
import { BrowserProvider, Contract } from 'ethers';
import { contractAddress, contractABI } from '../contractConfig';

const Insurance = () => {
  const [claimIdToValidate, setClaimIdToValidate] = useState('');
  const [claimStatusId, setClaimStatusId] = useState('');
  const [claimStatus, setClaimStatus] = useState('');
  const [contract, setContract] = useState(null);

  useEffect(() => {
    const loadContract = async () => {
      if (window.ethereum) {
        const provider = new BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contractInstance = new Contract(contractAddress, contractABI, signer);
        setContract(contractInstance);
      } else {
        alert("MetaMask belum terpasang");
      }
    };

    loadContract();
  }, []);

  const approveClaim = async () => {
    try {
      const tx = await contract.validateClaim(Number(claimIdToValidate), true);
      await tx.wait();
      alert("Claim approved!");
    } catch (err) {
      console.error("Gagal approve claim:", err);
      alert("Gagal approve claim");
    }
  };

  const rejectClaim = async () => {
    try {
      const tx = await contract.validateClaim(Number(claimIdToValidate), false);
      await tx.wait();
      alert("Claim rejected!");
    } catch (err) {
      console.error("Gagal reject claim:", err);
      alert("Gagal reject claim");
    }
  };

  const getClaimStatus = async () => {
    if (!contract) {
      alert("Contract belum siap");
      return;
    }

    try {
      const status = await contract.getClaimStatus(Number(claimStatusId));
      const statusText = ["Pending", "Approved", "Rejected"][Number(status)] || "Unknown";
      setClaimStatus(statusText);
    } catch (err) {
      console.error("Gagal ambil status klaim:", err);
      alert("Gagal ambil status klaim");
      setClaimStatus('');
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-center">Insurance Dashboard</h1>

      <div className="mb-8 p-4 border rounded shadow-sm bg-white">
        <label className="block mb-2 font-medium">Claim ID (untuk validasi)</label>
        <input
          type="number"
          value={claimIdToValidate}
          onChange={(e) => setClaimIdToValidate(e.target.value)}
          className="p-2 border rounded w-full mb-4"
          placeholder="Masukkan Claim ID"
        />
        <div className="flex justify-between space-x-4">
          <button
            onClick={approveClaim}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Approve Claim
          </button>
          <button
            onClick={rejectClaim}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Reject Claim
          </button>
        </div>
      </div>

      <div className="p-4 border rounded shadow-sm bg-white">
        <label className="block mb-2 font-medium">Claim ID (untuk cek status)</label>
        <input
          type="number"
          value={claimStatusId}
          onChange={(e) => setClaimStatusId(e.target.value)}
          className="p-2 border rounded w-full mb-4"
          placeholder="Masukkan Claim ID"
        />
        <button
          onClick={getClaimStatus}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Get Claim Status
        </button>

        {claimStatus && (
          <p className="mt-4 font-semibold text-center">
            Status Klaim: <span className="text-indigo-600">{claimStatus}</span>
          </p>
        )}
      </div>
    </div>
  );
};

export default Insurance;
