import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { contractAddress, contractABI } from "./contractConfig";

function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState("");
  const [role, setRole] = useState("hospital");

  // Input states
  const [hospitalToAdd, setHospitalToAdd] = useState("");
  const [insuranceToAdd, setInsuranceToAdd] = useState("");

  const [patientAddress, setPatientAddress] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [cost, setCost] = useState("");
  const [duration, setDuration] = useState("");

  const [recordIdForClaim, setRecordIdForClaim] = useState("");
  const [insuranceAddress, setInsuranceAddress] = useState("");

  const [claimIdToValidate, setClaimIdToValidate] = useState("");
  const [claimStatusId, setClaimStatusId] = useState("");
  const [claimStatus, setClaimStatus] = useState("");

  const [hospitals, setHospitals] = useState([]);
  const [insurances, setInsurances] = useState([]);

  const [recordIdToView, setRecordIdToView] = useState("");
  const [recordData, setRecordData] = useState(null);

  const [patientRecordIds, setPatientRecordIds] = useState([]);

  const [myClaimIds, setMyClaimIds] = useState([]);
  const [myRecordIds, setMyRecordIds] = useState([]);

  // Connect Wallet
  const connectWallet = async () => {
    if (window.ethereum) {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractABI, signer);
      const account = await signer.getAddress();

      setProvider(provider);
      setSigner(signer);
      setContract(contract);
      console.log("Kontrak berhasil dibuat:", contract);
      console.log("Fungsi yang tersedia di kontrak:", Object.keys(contract));

      setAccount(account);
    } else {
      alert("Please install MetaMask");
    }
  };

useEffect(() => {
  const init = async () => {
    await connectWallet();
  };
  init();
}, []);


  // Admin actions
  const addHospital = async () => {
    const tx = await contract.addHospital(hospitalToAdd);
    await tx.wait();
    alert("Hospital added!");
  };

  const addInsurance = async () => {
    const tx = await contract.addInsurance(insuranceToAdd);
    await tx.wait();
    alert("Insurance added!");
  };

  // Hospital action
  const submitMedicalRecord = async () => {
    const tx = await contract.submitMedicalRecord(
      patientAddress,
      diagnosis,
      Number(cost),
      Number(duration)
    );
    await tx.wait();
    alert("Medical record submitted!");
  };

  // Patient action
  const submitClaim = async () => {
    const tx = await contract.submitClaim(Number(recordIdForClaim), insuranceAddress);
    await tx.wait();
    alert("Claim submitted!");
  };

  // Insurance actions
  const approveClaim = async () => {
    const tx = await contract.validateClaim(Number(claimIdToValidate), true);
    await tx.wait();
    alert("Claim approved!");
  };

  const rejectClaim = async () => {
    const tx = await contract.validateClaim(Number(claimIdToValidate), false);
    await tx.wait();
    alert("Claim rejected!");
  };

  // Get claim status
  const getClaimStatus = async () => {
    const status = await contract.getClaimStatus(Number(claimStatusId));
    const statusText = ["Pending", "Approved", "Rejected"][status];
    setClaimStatus(statusText);
  };

  const fetchHospitals = async () => {
  try {
    const result = await contract.getHospitals();
    setHospitals(result);
  } catch (err) {
    console.error("Gagal ambil rumah sakit:", err);
  }
};

const fetchInsurances = async () => {
  try {
    const result = await contract.getInsurances();
    setInsurances(result);
  } catch (err) {
    console.error("Gagal ambil asuransi:", err);
  }
};

const getMedicalRecord = async () => {
  try {
    const data = await contract.getMedicalRecord(Number(recordIdToView));
    setRecordData({
      patient: data[0],
      diagnosis: data[1],
      cost: data[2],
      duration: data[3]
    });
  } catch (err) {
    alert("Data tidak ditemukan atau ID salah");
    setRecordData(null);
  }
};

const fetchPatientRecordIds = async () => {
  try {
    const result = await contract.getPatientRecords(account);
    setPatientRecordIds(result.map((id) => id.toString()));
  } catch (err) {
    console.error("Gagal ambil daftar record ID:", err);
  }
};

const fetchMyClaims = async () => {
  const ids = await contract.getPatientClaims(account);
  setMyClaimIds(ids.map(id => id.toString()));
};

const fetchMyRecords = async () => {
  const ids = await contract.getPatientRecords(account);
  setMyRecordIds(ids.map(id => id.toString()));
};

useEffect(() => {
  if (contract && account) {
    fetchHospitals();
    fetchInsurances();
    fetchPatientRecordIds(); // Tambahkan ini kalau ingin ambil daftar rekam medis
  }
}, [contract, account]);

  return (
    <div style={{ padding: 24 }}>
      <h2>Medical Insurance Claim System</h2>
      <p><strong>Connected Account:</strong> {account}</p>

      <label>
        Role:
        <select onChange={(e) => setRole(e.target.value)} value={role}>
          <option value="admin">Admin</option>
          <option value="hospital">Hospital</option>
          <option value="patient">Patient</option>
          <option value="insurance">Insurance</option>
        </select>
      </label>

      <hr />

      {role === "admin" && (
        <div>
          <h3>Admin Panel</h3>
          <input placeholder="Hospital address" onChange={(e) => setHospitalToAdd(e.target.value)} />
          <button onClick={addHospital}>Add Hospital</button><br /><br />
          <input placeholder="Insurance address" onChange={(e) => setInsuranceToAdd(e.target.value)} />
          <button onClick={addInsurance}>Add Insurance</button>
        </div>
      )}

      {role === "hospital" && (
        <div>
          <h3>Hospital Panel</h3>
          <input placeholder="Patient address" onChange={(e) => setPatientAddress(e.target.value)} />
          <input placeholder="Diagnosis" onChange={(e) => setDiagnosis(e.target.value)} />
          <input placeholder="Cost" type="number" onChange={(e) => setCost(e.target.value)} />
          <input placeholder="Duration (days)" type="number" onChange={(e) => setDuration(e.target.value)} />
          <button onClick={submitMedicalRecord}>Submit Medical Record</button>
        </div>
      )}

      {role === "patient" && (
        <div>
          <h3>Patient Panel</h3>
          <input placeholder="Record ID" onChange={(e) => setRecordIdForClaim(e.target.value)} />
          <input placeholder="Insurance address" onChange={(e) => setInsuranceAddress(e.target.value)} />
          <button onClick={submitClaim}>Submit Claim</button>
          <br /><br />
          <button onClick={fetchMyClaims}>Lihat Klaim Saya</button>
          <ul>
            {myClaimIds.map(id => (
              <li key={id}>Claim ID: {id}</li>
            ))}
          </ul>
          <button onClick={fetchMyRecords}>Lihat Rekam Medis Saya</button>
          <ul>
            {myRecordIds.map(id => (
              <li key={id}>Record ID: {id}</li>
            ))}
          </ul>
        </div>
      )}

      {role === "insurance" && (
        <div>
          <h3>Insurance Panel</h3>
          <input placeholder="Claim ID" onChange={(e) => setClaimIdToValidate(e.target.value)} />
          <button onClick={approveClaim}>Approve Claim</button>
          <button onClick={rejectClaim}>Reject Claim</button>
        </div>
      )}

      <hr />
      <div>
        <h3>Check Claim Status</h3>
        <input placeholder="Claim ID" onChange={(e) => setClaimStatusId(e.target.value)} />
        <button onClick={getClaimStatus}>Get Status</button>
        {claimStatus && <p>Status: <strong>{claimStatus}</strong></p>}
      </div>

      <hr />
      <div>
        <h3>Verified Hospitals</h3>
        <ul>
          {hospitals.map((addr, i) => (
            <li key={i}>{addr}</li>
          ))}
        </ul>

        <h3>Verified Insurance Companies</h3>
        <ul>
          {insurances.map((addr, i) => (
            <li key={i}>{addr}</li>
          ))}
        </ul>
      </div>

      <hr />
      <div>
        <h3>View Medical Record</h3>
        <input
          placeholder="Record ID"
          onChange={(e) => setRecordIdToView(e.target.value)}
        />
        <button onClick={getMedicalRecord}>View Record</button>

        {recordData && (
          <div>
            <p><strong>Patient:</strong> {recordData.patient}</p>
            <p><strong>Diagnosis:</strong> {recordData.diagnosis}</p>
            <p><strong>Cost:</strong> {recordData.cost.toString()}</p>
            <p><strong>Duration:</strong> {recordData.duration.toString()} hari</p>
          </div>
        )}
      </div>

      <div>
        <h4>Your Medical Record IDs</h4>
        <ul>
          {patientRecordIds.map((id, i) => (
            <li key={i}>{id}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default App;
