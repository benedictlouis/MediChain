import React, { useState, useEffect } from 'react';
import { BrowserProvider, Contract } from 'ethers';
import { contractAddress, contractABI } from '../contractConfig';

export default function Admin() {
  const [hospitalToAdd, setHospitalToAdd] = useState('');
  const [insuranceToAdd, setInsuranceToAdd] = useState('');
  const [contract, setContract] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);

  // Inisialisasi provider, signer, dan contract saat komponen mount
  useEffect(() => {
    async function init() {
      if (!window.ethereum) {
        alert('MetaMask belum terpasang');
        return;
      }
      try {
        const prov = new BrowserProvider(window.ethereum);
        const sign = await prov.getSigner();
        const cont = new Contract(contractAddress, contractABI, sign);

        setProvider(prov);
        setSigner(sign);
        setContract(cont);
      } catch (error) {
        console.error('Init error:', error);
      }
    }

    init();
  }, []);

  const addHospital = async () => {
    if (!contract) {
      alert('Contract belum siap');
      return;
    }
    if (!hospitalToAdd) {
      alert('Masukkan address hospital');
      return;
    }

    try {
      const tx = await contract.addHospital(hospitalToAdd);
      await tx.wait();
      alert('Hospital added!');
      setHospitalToAdd('');
    } catch (error) {
      console.error('Add hospital error:', error);
      alert('Gagal menambahkan hospital');
    }
  };

  const addInsurance = async () => {
    if (!contract) {
      alert('Contract belum siap');
      return;
    }
    if (!insuranceToAdd) {
      alert('Masukkan address insurance');
      return;
    }

    try {
      const tx = await contract.addInsurance(insuranceToAdd);
      await tx.wait();
      alert('Insurance added!');
      setInsuranceToAdd('');
    } catch (error) {
      console.error('Add insurance error:', error);
      alert('Gagal menambahkan insurance');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-6 text-center">Admin Dashboard</h1>

      <div className="mb-6">
        <label className="block mb-2 font-semibold">Add Hospital Address</label>
        <input
          type="text"
          className="w-full border border-gray-300 rounded px-3 py-2"
          placeholder="0x..."
          value={hospitalToAdd}
          onChange={(e) => setHospitalToAdd(e.target.value)}
        />
        <button
          onClick={addHospital}
          className="mt-3 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Add Hospital
        </button>
      </div>

      <div className="mb-6">
        <label className="block mb-2 font-semibold">Add Insurance Address</label>
        <input
          type="text"
          className="w-full border border-gray-300 rounded px-3 py-2"
          placeholder="0x..."
          value={insuranceToAdd}
          onChange={(e) => setInsuranceToAdd(e.target.value)}
        />
        <button
          onClick={addInsurance}
          className="mt-3 w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
        >
          Add Insurance
        </button>
      </div>
    </div>
  );
}
