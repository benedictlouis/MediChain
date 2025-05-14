const { expect } = require("chai");

describe("MedicalInsuranceClaim", function () {
  let contract;
  let admin, hospital, patient, insurance, attacker;

  beforeEach(async function () {
    [admin, hospital, patient, insurance, attacker] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("MedicalInsuranceClaim");
    contract = await Factory.deploy();
    await contract.waitForDeployment();

    await contract.connect(admin).addHospital(hospital.address);
    await contract.connect(admin).addInsurance(insurance.address);
  });

  it("seharusnya menambahkan dan memproses klaim dengan benar", async function () {
    await contract.connect(hospital).submitMedicalRecord(
      patient.address,
      "Demam",
      1000,
      2
    );
    await contract.connect(patient).submitClaim(1, insurance.address);
    await contract.connect(insurance).validateClaim(1, true);

    const status = await contract.getClaimStatus(1);
    expect(status).to.equal(1); // Approved
  });

  it("harus gagal jika bukan pasien yang mengajukan klaim", async function () {
    await contract.connect(hospital).submitMedicalRecord(
      patient.address,
      "Flu",
      800,
      1
    );

    await expect(
      contract.connect(attacker).submitClaim(1, insurance.address)
    ).to.be.revertedWith("Bukan pemilik data.");
  });

  it("hanya asuransi yang ditunjuk yang bisa memvalidasi", async function () {
    await contract.connect(hospital).submitMedicalRecord(
      patient.address,
      "Covid",
      3000,
      3
    );
    await contract.connect(patient).submitClaim(1, insurance.address);

    await expect(
      contract.connect(attacker).validateClaim(1, true)
    ).to.be.revertedWith("Bukan pihak asuransi.");
  });

  it("tidak boleh memproses klaim dua kali", async function () {
    await contract.connect(hospital).submitMedicalRecord(
      patient.address,
      "Tipes",
      2500,
      2
    );
    await contract.connect(patient).submitClaim(1, insurance.address);
    await contract.connect(insurance).validateClaim(1, false);

    await expect(
      contract.connect(insurance).validateClaim(1, true)
    ).to.be.revertedWith("Klaim sudah diproses.");
  });

  it("harus gagal jika data rekam medis tidak ditemukan", async function () {
    await expect(
      contract.connect(patient).submitClaim(999, insurance.address)
    ).to.be.revertedWith("Data tidak ditemukan.");
  });
});
