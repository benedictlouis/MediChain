// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MedicalInsuranceClaim {
    address public admin;

    enum ClaimStatus { Pending, Approved, Rejected }

    struct MedicalRecord {
        address patient;
        string diagnosis;
        uint256 cost;
        string treatment;
        uint256 duration; // lama rawat inap dalam hari
        address hospital;
        bool exists;
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

    mapping(address => uint256[]) public patientRecords;

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

    // RUMAH SAKIT mencatat data medis pasien
    function submitMedicalRecord(address _patient, string memory _diagnosis, uint256 _cost, string memory _treatment, uint256 _duration) public onlyVerifiedHospital {
        recordCounter++;
        medicalRecords[recordCounter] = MedicalRecord(_patient, _diagnosis, _cost, _treatment, _duration, msg.sender, true);
        patientRecords[_patient].push(recordCounter); // Tambah ID ke daftar pasien
    }

    // PASIEN mengajukan klaim berdasarkan ID rekam medis
    function submitClaim(uint256 _recordId, address _insuranceCompany) public {
        require(medicalRecords[_recordId].exists, "Data tidak ditemukan.");
        require(medicalRecords[_recordId].patient == msg.sender, "Bukan pemilik data.");

        claimCounter++;
        claims[claimCounter] = Claim(_recordId, _insuranceCompany, ClaimStatus.Pending);
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
        string memory diagnosis,
        uint256 cost,
        string memory treatment,
        uint256 duration
    ) {
        require(medicalRecords[_recordId].exists, "Rekam medis tidak ditemukan.");
        MedicalRecord memory record = medicalRecords[_recordId];
        return (record.patient, record.diagnosis, record.cost, record.treatment, record.duration);
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
}
