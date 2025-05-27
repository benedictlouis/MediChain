import React, { useState, useEffect } from 'react';
import { BrowserProvider, Contract } from 'ethers';
import { contractAddress, contractABI } from '../contractConfig';

const Hospital = () => {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  
  const [account, setAccount] = useState('');
  
  // Form untuk submit medical record
  const [patientAddress, setPatientAddress] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [cost, setCost] = useState('');
  const [treatment, setTreatment] = useState(''); 
  const [duration, setDuration] = useState('');
  
  const [recordIdToView, setRecordIdToView] = useState('');
  const [recordData, setRecordData] = useState(null);
  
  const [patientRecordIds, setPatientRecordIds] = useState([]);

  const [hospitalPatients, setHospitalPatients] = useState([]);


  useEffect(() => {
    async function init() {
      if (!window.ethereum) {
        alert("MetaMask belum terpasang");
        return;
      }
      try {
        const p = new BrowserProvider(window.ethereum);
        setProvider(p);
        const s = await p.getSigner();
        setSigner(s);
        const userAddress = await s.getAddress();
        setAccount(userAddress);
        const c = new Contract(contractAddress, contractABI, s);
        setContract(c);
      } catch (error) {
        console.error("Gagal inisialisasi:", error);
      }
    }
    init();
  }, []);

  const submitMedicalRecord = async () => {
    if (!contract) {
      alert("Contract belum siap");
      return;
    }
    try {
      const tx = await contract.submitMedicalRecord(
        patientAddress,
        diagnosis,
        Number(cost),
        treatment,
        Number(duration)
      );
      await tx.wait();
      alert("Medical record submitted!");
      setPatientAddress('');
      setDiagnosis('');
      setCost('');
      setTreatment('');
      setDuration('');
    } catch (error) {
        console.error("Submit medical record error:", error.reason || error.message || error);
        alert("Gagal submit medical record");
    }
  };

  const getMedicalRecord = async () => {
    if (!contract) {
      alert("Contract belum siap");
      return;
    }
    try {
      const data = await contract.getMedicalRecord(Number(recordIdToView));
      setRecordData({
        patient: data[0],
        diagnosis: data[1],
        cost: data[2].toString(),
        treatment: data[3].toString(),
        duration: data[4].toString()
      });
    } catch (err) {
      alert("Data tidak ditemukan atau ID salah");
      setRecordData(null);
    }
  };

  const fetchPatientRecordIds = async () => {
    if (!contract) {
      alert("Contract belum siap");
      return;
    }
    try {
      const result = await contract.getPatientRecords(account);
      setPatientRecordIds(result.map((id) => id.toString()));
    } catch (err) {
      console.error("Gagal ambil daftar record ID:", err);
    }
  };

  const fetchPatientsByHospital = async () => {
    if (!contract || !account) {
        alert("Contract atau akun belum siap");
        return;
    }

    try {
        const result = await contract.getPatientsByHospital(account);
        setHospitalPatients(result);
    } catch (err) {
        console.error("Gagal ambil daftar pasien:", err);
        alert("Gagal mengambil data pasien rumah sakit");
    }
};


  useEffect(() => {
    if (contract && account) {
      fetchPatientRecordIds();
    }
  }, [contract, account]);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Hospital Dashboard</h1>

      <div className="mb-8 p-4 border rounded shadow-sm bg-white">
        <h2 className="text-xl font-semibold mb-4">Submit Medical Record</h2>
        <input
          type="text"
          placeholder="Patient Address"
          value={patientAddress}
          onChange={(e) => setPatientAddress(e.target.value)}
          className="border p-2 mb-2 w-full rounded"
        />
        <input
          type="text"
          placeholder="Diagnosis"
          value={diagnosis}
          onChange={(e) => setDiagnosis(e.target.value)}
          className="border p-2 mb-2 w-full rounded"
        />
        <input
          type="number"
          placeholder="Cost"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          className="border p-2 mb-2 w-full rounded"
        />
        <input
          type="text"
          placeholder="Treatment"
          value={treatment}
          onChange={(e) => setTreatment(e.target.value)}
          className="border p-2 mb-2 w-full rounded"
        />
        <input
          type="number"
          placeholder="Duration (days)"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className="border p-2 mb-4 w-full rounded"
        />
        <button
          onClick={submitMedicalRecord}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Submit Record
        </button>
      </div>

      <div className="mb-8 p-4 border rounded shadow-sm bg-white">
        <h2 className="text-xl font-semibold mb-4">View Medical Record by ID</h2>
        <input
          type="number"
          placeholder="Record ID"
          value={recordIdToView}
          onChange={(e) => setRecordIdToView(e.target.value)}
          className="border p-2 mb-4 w-full rounded"
        />
        <button
          onClick={getMedicalRecord}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Get Record
        </button>

        {recordData && (
          <div className="mt-4 bg-gray-50 p-3 rounded border">
            <p><strong>Patient:</strong> {recordData.patient}</p>
            <p><strong>Diagnosis:</strong> {recordData.diagnosis}</p>
            <p><strong>Cost:</strong> {recordData.cost}</p>
            <p><strong>Treatment:</strong> {recordData.treatment}</p>
            <p><strong>Duration:</strong> {recordData.duration}</p>
          </div>
        )}
      </div>

      <div className="mt-8 p-4 border rounded shadow-sm bg-white">
        <h2 className="text-xl font-semibold mb-4">List of Patients</h2>
        <button
          onClick={fetchPatientsByHospital}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mb-4"
        >
          Fetch Patients
        </button>
        {hospitalPatients.length === 0 ? (
          <p>No patients found.</p>
        ) : (
          <ul className="list-disc pl-5">
            {hospitalPatients.map((patient, index) => (
              <li key={index}>Patient Address: {patient}</li>
            ))}
          </ul>
        )}
        </div>
    </div>
  );
};

export default Hospital;
