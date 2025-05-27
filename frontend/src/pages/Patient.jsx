import React, { useEffect, useState } from 'react';
import { BrowserProvider, Contract } from 'ethers';
import { contractAddress, contractABI } from '../contractConfig';

const Patient = () => {
  const [contract, setContract] = useState(null);
  const [recordIdForClaim, setRecordIdForClaim] = useState('');
  const [insuranceAddress, setInsuranceAddress] = useState('');

  useEffect(() => {
    const initContract = async () => {
      if (window.ethereum) {
        const provider = new BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const _contract = new Contract(contractAddress, contractABI, signer);
        setContract(_contract);
      }
    };
    initContract();
  }, []);

  const submitClaim = async () => {
    if (!contract) {
      alert("Contract belum siap");
      return;
    }

    try {
      const tx = await contract.submitClaim(Number(recordIdForClaim), insuranceAddress);
      await tx.wait();
      alert("Claim submitted!");
    } catch (error) {
      console.error("Submit claim error:", error);
      alert("Gagal submit claim");
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Patient Dashboard</h1>
      <input
        type="text"
        placeholder="Record ID"
        value={recordIdForClaim}
        onChange={(e) => setRecordIdForClaim(e.target.value)}
        className="border p-2 mb-2"
      />
      <input
        type="text"
        placeholder="Insurance Address"
        value={insuranceAddress}
        onChange={(e) => setInsuranceAddress(e.target.value)}
        className="border p-2 mb-2"
      />
      <button
        onClick={submitClaim}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        Submit Claim
      </button>
    </div>
  );
};

export default Patient;
