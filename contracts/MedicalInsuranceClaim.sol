// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MedicalInsuranceClaim {
    address public admin;

    enum ClaimStatus { Pending, Approved, Rejected, NotClaimed }

    struct MedicalRecord {
        address patient;
        string ipfsHash; // ADDED: The hash/CID from IPFS pointing to the encrypted medical data
        uint256 cost;    // REMAINS: Kept on-chain for smart contract logic (e.g., claim validation)
        address hospital;
        bool exists;
        // REMOVED: string diagnosis, string treatment, uint256 duration
    }

    struct Claim {
        uint256 recordId;
        address insuranceCompany;
        ClaimStatus status;
    }

    uint256 public recordCounter;
    uint256 public claimCounter;

    mapping(uint256 => MedicalRecord) public medicalRecords;
    mapping(uint256 => Claim) public claims;

    mapping(address => bool) public verifiedHospitals;
    mapping(address => bool) public verifiedInsurance;

    mapping(address => uint256[]) public recordsByPatient;
    mapping(address => uint256[]) public claimsByPatient;
    mapping(uint256 => uint256) public claimIdByRecordId;

    address[] public hospitalList;
    address[] public insuranceList;

    modifier onlyAdmin() {
        require(msg.sender == admin, "Hanya admin.");
        _;
    }

    modifier onlyVerifiedHospital() {
        require(verifiedHospitals[msg.sender], "Rumah sakit belum terverifikasi.");
        _;
    }

    modifier onlyInsurance() {
        require(verifiedInsurance[msg.sender], "Bukan pihak asuransi.");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    function getPatientClaims(address _patient) public view returns (uint256[] memory) {
    uint256 count = 0;

    // Hitung dulu berapa banyak klaim milik pasien
    for (uint256 i = 1; i <= claimCounter; i++) {
        if (medicalRecords[claims[i].recordId].patient == _patient) {
            count++;
        }
    }

    uint256[] memory result = new uint256[](count);
    uint256 index = 0;

    for (uint256 i = 1; i <= claimCounter; i++) {
        if (medicalRecords[claims[i].recordId].patient == _patient) {
            result[index] = i;
            index++;
        }
    }

    return result;
    }

    function getPatientRecords(address _patient) public view returns (uint256[] memory) {
    uint256 count = 0;

    for (uint256 i = 1; i <= recordCounter; i++) {
        if (medicalRecords[i].patient == _patient) {
            count++;
        }
    }

    uint256[] memory result = new uint256[](count);
    uint256 index = 0;

    for (uint256 i = 1; i <= recordCounter; i++) {
        if (medicalRecords[i].patient == _patient) {
            result[index] = i;
            index++;
        }
    }

    return result;
    }

    // ADMIN menambahkan rumah sakit & asuransi
    function addHospital(address _hospital) public onlyAdmin {
        require(!verifiedHospitals[_hospital], "Sudah terdaftar.");
        verifiedHospitals[_hospital] = true;
        hospitalList.push(_hospital);
    }

    function addInsurance(address _insurance) public onlyAdmin {
        require(!verifiedInsurance[_insurance], "Sudah terdaftar.");
        verifiedInsurance[_insurance] = true;
        insuranceList.push(_insurance);
    }

    // Fungsi untuk melihat daftar rumah sakit & asuransi
    function getHospitals() public view returns (address[] memory) {
        return hospitalList;
    }

    function getInsurances() public view returns (address[] memory) {
        return insuranceList;
    }

     // OPTIMIZED: This now reads directly from a mapping, saving immense gas costs.
    function getRecordsByPatient(address _patient) public view returns (uint256[] memory) {
        return recordsByPatient[_patient];
    }
    
    // OPTIMIZED: This also reads directly from a mapping.
    function getClaimsByPatient(address _patient) public view returns (uint256[] memory) {
        return claimsByPatient[_patient];
    }

    // RUMAH SAKIT mencatat data medis pasien
    function submitMedicalRecord(
        address _patient,
        string memory _ipfsHash, // CHANGED
        uint256 _cost
    ) public onlyVerifiedHospital {
        recordCounter++;
        medicalRecords[recordCounter] = MedicalRecord(
            _patient,
            _ipfsHash, // CHANGED
            _cost,
            msg.sender,
            true
        );
        recordsByPatient[_patient].push(recordCounter);
    }

    // PASIEN mengajukan klaim berdasarkan ID rekam medis
   function submitClaim(uint256 _recordId, address _insuranceCompany) public {
        MedicalRecord storage record_ = medicalRecords[_recordId];
        require(record_.exists, "Medical record does not exist.");
        require(record_.patient == msg.sender, "Only the patient can submit a claim for their record.");
        require(claimIdByRecordId[_recordId] == 0, "This record has already been claimed."); // Prevent duplicate claims

        claimCounter++;
        claims[claimCounter] = Claim(_recordId, _insuranceCompany, ClaimStatus.Pending);
        
        // Add to our efficient lookup mappings
        claimIdByRecordId[_recordId] = claimCounter;
        claimsByPatient[msg.sender].push(claimCounter);
    }

    // PERUSAHAAN ASURANSI memvalidasi klaim
    function validateClaim(uint256 _claimId, bool approve) public onlyInsurance {
        Claim storage claim = claims[_claimId];
        require(claim.insuranceCompany == msg.sender, "Bukan pihak yang ditunjuk.");
        require(claim.status == ClaimStatus.Pending, "Klaim sudah diproses.");

        if (approve) {
            claim.status = ClaimStatus.Approved;
        } else {
            claim.status = ClaimStatus.Rejected;
        }
    }

    // LIHAT STATUS KLAIM
    function getClaimStatus(uint256 _claimId) public view returns (ClaimStatus) {
        return claims[_claimId].status;
    }

    // Tambahan: dapatkan data rekam medis lengkap
    function getMedicalRecord(uint256 _recordId) public view returns (
        address patient,
        string memory ipfsHash,
        uint256 cost,
        address hospital
    ) {
        require(medicalRecords[_recordId].exists, "Medical record does not exist.");
        MedicalRecord storage record_ = medicalRecords[_recordId];
        return (record_.patient, record_.ipfsHash, record_.cost, record_.hospital);
    }

    function getPatientsByHospital(address _hospital) public view returns (address[] memory) {
        address[] memory temp = new address[](recordCounter);
        uint256 count = 0;

        for (uint256 i = 1; i <= recordCounter; i++) {
            if (medicalRecords[i].hospital == _hospital) {
                temp[count] = medicalRecords[i].patient;
                count++;
            }
        }

        address[] memory result = new address[](count);
        for (uint256 j = 0; j < count; j++) {
            result[j] = temp[j];
        }

        return result;
    }

    function getRecordAndClaimDetails(uint256 _recordId) public view returns (
        address patient,
        string memory ipfsHash,
        uint256 cost,
        address hospital,
        ClaimStatus status,
        address insuranceCompany
    ) {
        require(medicalRecords[_recordId].exists, "Medical record does not exist.");
        MedicalRecord storage recordData = medicalRecords[_recordId];
        
        uint256 claimId = claimIdByRecordId[_recordId];
        if (claimId != 0) {
            Claim storage claimData = claims[claimId];
            return (
                recordData.patient,
                recordData.ipfsHash,
                recordData.cost,
                recordData.hospital,
                claimData.status,
                claimData.insuranceCompany
            );
        } else {
            // If no claim exists for this record
            return (
                recordData.patient,
                recordData.ipfsHash,
                recordData.cost,
                recordData.hospital,
                ClaimStatus.NotClaimed,
                address(0) // No insurance company involved yet
            );
        }
    }
    
    function _getClaimStatusString(ClaimStatus _status) internal pure returns (string memory) {
        if (_status == ClaimStatus.Pending) {
            return "Pending";
        } else if (_status == ClaimStatus.Approved) {
            return "Approved";
        } else if (_status == ClaimStatus.Rejected) {
            return "Rejected";
        } else if (_status == ClaimStatus.NotClaimed) { // ADDED: Handle NotClaimed
            return "Not Claimed";
        }
        return "Unknown";
    }
}