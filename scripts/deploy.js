const hre = require("hardhat");

async function main() {
    const ContractFactory = await hre.ethers.getContractFactory("MedicalInsuranceClaim");
    const contract = await ContractFactory.deploy(); 
await contract.waitForDeployment(); 

console.log("Contract deployed to:", contract.getAddress());
}

main().catch((error) => {   
    console.error(error);
    process.exitCode = 1;
});