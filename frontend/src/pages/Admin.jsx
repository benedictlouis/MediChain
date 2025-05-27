import React, { useState, useEffect } from 'react';
import { BrowserProvider, Contract } from 'ethers';
import { contractAddress, contractABI } from '../contractConfig';

export default function Admin() {
  const [hospitalToAdd, setHospitalToAdd] = useState('');
  const [insuranceToAdd, setInsuranceToAdd] = useState('');
  const [contract, setContract] = useState(null);
  const [hospitals, setHospitals] = useState([]);
  const [insurances, setInsurances] = useState([]);

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

        setContract(cont);
        fetchHospitals(cont);
        fetchInsurances(cont);
      } catch (error) {
        console.error('Init error:', error);
      }
    }

    init();
  }, []);

  const fetchHospitals = async (cont) => {
    try {
      const result = await cont.getHospitals();
      setHospitals(result);
    } catch (err) {
      console.error("Gagal ambil rumah sakit:", err);
    }
  };

  const fetchInsurances = async (cont) => {
    try {
      const result = await cont.getInsurances();
      setInsurances(result);
    } catch (err) {
      console.error("Gagal ambil asuransi:", err);
    }
  };

  const addHospital = async () => {
    if (!contract) return alert('Contract belum siap');
    if (!hospitalToAdd) return alert('Masukkan address hospital');
    try {
      const tx = await contract.addHospital(hospitalToAdd);
      await tx.wait();
      alert('Hospital added!');
      setHospitalToAdd('');
      fetchHospitals(contract);
    } catch (error) {
      console.error('Add hospital error:', error);
      alert('Gagal menambahkan hospital');
    }
  };

  const addInsurance = async () => {
    if (!contract) return alert('Contract belum siap');
    if (!insuranceToAdd) return alert('Masukkan address insurance');
    try {
      const tx = await contract.addInsurance(insuranceToAdd);
      await tx.wait();
      alert('Insurance added!');
      setInsuranceToAdd('');
      fetchInsurances(contract);
    } catch (error) {
      console.error('Add insurance error:', error);
      alert('Gagal menambahkan insurance');
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 bg-white rounded shadow">
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

      <div className="mt-10">
        <h2 className="text-xl font-semibold mb-2">Verified Hospitals</h2>
        <ul className="list-disc list-inside space-y-1">
          {hospitals.length === 0 ? (
            <li className="text-gray-500">No hospitals found.</li>
          ) : (
            hospitals.map((addr, index) => <li key={index}>{addr}</li>)
          )}
        </ul>
      </div>

      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-2">Verified Insurances</h2>
        <ul className="list-disc list-inside space-y-1">
          {insurances.length === 0 ? (
            <li className="text-gray-500">No insurances found.</li>
          ) : (
            insurances.map((addr, index) => <li key={index}>{addr}</li>)
          )}
        </ul>
      </div>
    </div>
  );
}
