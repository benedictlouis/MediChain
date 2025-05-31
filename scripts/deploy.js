const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    const ContractFactory = await hre.ethers.getContractFactory("MedicalInsuranceClaim");
    const contract = await ContractFactory.deploy(); 

    await contract.waitForDeployment(); 

    console.log("Contract deployed to:", await contract.getAddress()); 
}

main().catch((error) => {   
    console.error(error);
    process.exitCode = 1;
});