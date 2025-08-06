import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  console.log("🚀 Starting Vitrine DApp contracts deployment...");

  const [deployer] = await ethers.getSigners();
  console.log("📋 Deploying contracts with account:", deployer.address);
  
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");

  // --- 1. DEPLOY DOS CONTRATOS ---
  console.log("\n📦 Deploying Core Contracts...");

  // Deploy VitrineCore primeiro
  console.log("Deploying VitrineCore...");
  const VitrineCore = await ethers.getContractFactory("VitrineCore");
  const vitrineCore = await VitrineCore.deploy();
  await vitrineCore.waitForDeployment();
  const vitrineCoreAddress = await vitrineCore.getAddress();
  console.log("✅ VitrineCore deployed to:", vitrineCoreAddress);

  // Deploy Marketplace (precisa do VitrineCore)
  console.log("Deploying Marketplace...");
  const feeRecipientAddress = deployer.address;
  const Marketplace = await ethers.getContractFactory("Marketplace");
  const marketplace = await Marketplace.deploy(vitrineCoreAddress, feeRecipientAddress);
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  console.log("✅ Marketplace deployed to:", marketplaceAddress);

  // Deploy token mock para desenvolvimento (opcional)
  let tokenAddress = ethers.ZeroAddress;
  if (process.env.DEPLOY_MOCK_TOKEN === "true") {
    console.log("Deploying Mock ERC20 Token...");
    const MockToken = await ethers.getContractFactory("MockERC20"); // Você precisa criar este contrato
    const mockToken = await MockToken.deploy("Vitrine Token", "VTR", ethers.parseEther("1000000"));
    await mockToken.waitForDeployment();
    tokenAddress = await mockToken.getAddress();
    console.log("✅ Mock Token deployed to:", tokenAddress);
  }

  // --- 2. CONFIGURAÇÃO PÓS-DEPLOY ---
  console.log("\n⚙️ Setting up contract connections...");

  try {
    await vitrineCore.setMarketplaceContract(marketplaceAddress);
    console.log("✅ Marketplace address set in VitrineCore");
  } catch (error: any) {
    console.log("⚠️  Could not set marketplace in VitrineCore:", error.message);
  }

  // --- 3. VERIFICAÇÃO DOS CONTRATOS ---
  console.log("\n🔍 Verifying contract setup...");
  
  try {
    const marketplaceInCore = await vitrineCore.marketplaceContract();
    console.log("✅ VitrineCore.marketplaceContract:", marketplaceInCore);
    
  } catch (error: any) {
    console.log("⚠️  Some verification checks failed:", error.message);
  }

  // --- 4. SALVAR ARTEFATOS E ATUALIZAR ARQUIVOS ---
  const network = await ethers.provider.getNetwork();
  const networkName = network.name === "unknown" ? "localhost" : network.name;
  
  console.log(`\n💾 Saving deployment info for network: ${networkName}`);
  
  const contractInfo = {
    VitrineCore: { address: vitrineCoreAddress },
    Marketplace: { address: marketplaceAddress },
    ...(tokenAddress !== ethers.ZeroAddress && { MockToken: { address: tokenAddress } })
  };
  
  saveDeploymentJson(networkName, contractInfo);

  updateEnvFiles(network.chainId.toString(), {
    VITRINE_CORE_ADDRESS: vitrineCoreAddress,
    MARKETPLACE_ADDRESS: marketplaceAddress,
    ...(tokenAddress !== ethers.ZeroAddress && { MOCK_TOKEN_ADDRESS: tokenAddress })
  });

  copyAbisToFrontend(["VitrineCore", "Marketplace"]);

  // --- 5. VERIFICAÇÃO NO ETHERSCAN (OPCIONAL) ---
  if (process.env.ETHERSCAN_API_KEY && networkName !== "hardhat" && networkName !== "localhost") {
    console.log("\n🔍 Verifying contracts on Etherscan... (waiting 30s for propagation)");
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    try {
      const { run } = require("hardhat");
      
      await run("verify:verify", { 
        address: vitrineCoreAddress, 
        constructorArguments: [] 
      });
      
      await run("verify:verify", { 
        address: marketplaceAddress, 
        constructorArguments: [vitrineCoreAddress, feeRecipientAddress] 
      });
      
      console.log("✅ All contracts verified on Etherscan");
    } catch (error: any) {
      console.log("⚠️  Etherscan verification failed:", error.message);
    }
  }

  // --- 6. RESUMO FINAL ---
  console.log("\n🎉 Deployment completed successfully!");
  console.log("📋 Contract Summary:");
  console.log(`   VitrineCore:  ${vitrineCoreAddress}`);
  console.log(`   Marketplace:  ${marketplaceAddress}`);
  if (tokenAddress !== ethers.ZeroAddress) {
    console.log(`   MockToken:    ${tokenAddress}`);
  }
  console.log(`   Network:      ${networkName} (Chain ID: ${network.chainId})`);
  console.log(`   Deployer:     ${deployer.address}`);
}

// --- FUNÇÕES AUXILIARES (Melhoradas) ---

function saveDeploymentJson(networkName: string, contracts: { [name: string]: { address: string } }) {
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  const deploymentInfo = {
    network: networkName,
    chainId: (ethers.provider.network || {}).chainId?.toString(),
    deployedAt: new Date().toISOString(),
    contracts,
  };
  
  const deploymentFile = path.join(deploymentsDir, `${networkName}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log(`   - Deployment info saved to: deployments/${networkName}.json`);
}

function updateEnvFiles(chainId: string, addresses: { [name: string]: string }) {
  // Atualizar .env da raiz
  updateEnvFile(path.join(__dirname, "..", ".env"), addresses, chainId);
  
  // Atualizar .env do frontend
  const frontendEnvPath = path.join(__dirname, "..", "frontend", ".env");
  const frontendAddresses = Object.fromEntries(
    Object.entries(addresses).map(([key, value]) => [`VITE_${key}`, value])
  );
  updateEnvFile(frontendEnvPath, frontendAddresses, chainId, "VITE_");
}

function updateEnvFile(filePath: string, addresses: { [name: string]: string }, chainId: string, prefix = "") {
  if (!fs.existsSync(path.dirname(filePath))) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
  }

  let envContent = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
  
  const updateVar = (content: string, varName: string, value: string) => {
    const regex = new RegExp(`^${varName}=.*`, "m");
    const newLine = `${varName}="${value}"`;
    return regex.test(content) ? content.replace(regex, newLine) : `${content}\n${newLine}`;
  };

  // Atualizar endereços dos contratos
  Object.entries(addresses).forEach(([name, address]) => {
    envContent = updateVar(envContent, name, address);
  });
  
  // Atualizar Chain ID
  envContent = updateVar(envContent, `${prefix}CHAIN_ID`, chainId);
  
  fs.writeFileSync(filePath, envContent.trim() + '\n');
  console.log(`   - ${path.relative(path.join(__dirname, '..'), filePath)} updated`);
}

function copyAbisToFrontend(contractNames: string[]) {
  console.log('\n🔄 Copying contract ABIs to frontend...');
  
  const frontendAbiPath = path.join(__dirname, '..', 'frontend', 'src', 'abi');
  if (!fs.existsSync(frontendAbiPath)) {
    fs.mkdirSync(frontendAbiPath, { recursive: true });
  }

  const typeGenPath = path.join(frontendAbiPath, 'types.ts');
  let typeDefinitions = '// Auto-generated contract types\n\n';

  contractNames.forEach(contractName => {
    const sourcePath = path.join(__dirname, '..', 'artifacts', 'contracts', `${contractName}.sol`, `${contractName}.json`);
    const targetPath = path.join(frontendAbiPath, `${contractName}.json`);

    try {
      if (fs.existsSync(sourcePath)) {
        const artifact = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
        
        // Salvar apenas o ABI
        fs.writeFileSync(targetPath, JSON.stringify(artifact.abi, null, 2));
        
        // Gerar tipos TypeScript
        typeDefinitions += `export const ${contractName.toUpperCase()}_ABI = ${JSON.stringify(artifact.abi)} as const;\n`;
        
        console.log(`✅ Copied ${contractName} ABI to frontend`);
      } else {
        console.log(`⚠️  ${contractName} artifact not found at ${sourcePath}`);
      }
    } catch (error: any) {
      console.error(`❌ Error copying ${contractName} ABI:`, error.message);
    }
  });

  // Salvar tipos TypeScript
  fs.writeFileSync(typeGenPath, typeDefinitions);
  console.log(`✅ Generated TypeScript types at src/abi/types.ts`);
}

// --- EXECUTOR PRINCIPAL ---
main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});

import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  console.log("🚀 Starting Vitrine DApp contracts deployment...");

  const [deployer] = await ethers.getSigners();
  console.log("📋 Deploying contracts with account:", deployer.address);
  
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");

  // --- 1. DEPLOY DOS CONTRATOS ---
  console.log("\n📦 Deploying Core Contracts...");

  // Deploy VitrineCore primeiro
  console.log("Deploying VitrineCore...");
  const VitrineCore = await ethers.getContractFactory("VitrineCore");
  const vitrineCore = await VitrineCore.deploy();
  await vitrineCore.waitForDeployment();
  const vitrineCoreAddress = await vitrineCore.getAddress();
  console.log("✅ VitrineCore deployed to:", vitrineCoreAddress);

  // Deploy Marketplace (precisa do VitrineCore)
  console.log("Deploying Marketplace...");
  const feeRecipientAddress = deployer.address;
  const Marketplace = await ethers.getContractFactory("Marketplace");
  const marketplace = await Marketplace.deploy(vitrineCoreAddress, feeRecipientAddress);
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  console.log("✅ Marketplace deployed to:", marketplaceAddress);

  // Deploy token mock para desenvolvimento (opcional)
  let tokenAddress = ethers.ZeroAddress;
  if (process.env.DEPLOY_MOCK_TOKEN === "true") {
    console.log("Deploying Mock ERC20 Token...");
    const MockToken = await ethers.getContractFactory("MockERC20"); // Você precisa criar este contrato
    const mockToken = await MockToken.deploy("Vitrine Token", "VTR", ethers.parseEther("1000000"));
    await mockToken.waitForDeployment();
    tokenAddress = await mockToken.getAddress();
    console.log("✅ Mock Token deployed to:", tokenAddress);
  }

  // --- 2. CONFIGURAÇÃO PÓS-DEPLOY ---
  console.log("\n⚙️ Setting up contract connections...");

  try {
    await vitrineCore.setMarketplaceContract(marketplaceAddress);
    console.log("✅ Marketplace address set in VitrineCore");
  } catch (error: any) {
    console.log("⚠️  Could not set marketplace in VitrineCore:", error.message);
  }

  // --- 3. VERIFICAÇÃO DOS CONTRATOS ---
  console.log("\n🔍 Verifying contract setup...");
  
  try {
    const marketplaceInCore = await vitrineCore.marketplaceContract();
    console.log("✅ VitrineCore.marketplaceContract:", marketplaceInCore);
    
  } catch (error: any) {
    console.log("⚠️  Some verification checks failed:", error.message);
  }

  // --- 4. SALVAR ARTEFATOS E ATUALIZAR ARQUIVOS ---
  const network = await ethers.provider.getNetwork();
  const networkName = network.name === "unknown" ? "localhost" : network.name;
  
  console.log(`\n💾 Saving deployment info for network: ${networkName}`);
  
  const contractInfo = {
    VitrineCore: { address: vitrineCoreAddress },
    Marketplace: { address: marketplaceAddress },
    ...(tokenAddress !== ethers.ZeroAddress && { MockToken: { address: tokenAddress } })
  };
  
  saveDeploymentJson(networkName, contractInfo);

  updateEnvFiles(network.chainId.toString(), {
    VITRINE_CORE_ADDRESS: vitrineCoreAddress,
    MARKETPLACE_ADDRESS: marketplaceAddress,
    ...(tokenAddress !== ethers.ZeroAddress && { MOCK_TOKEN_ADDRESS: tokenAddress })
  });

  copyAbisToFrontend(["VitrineCore", "Marketplace"]);

  // --- 5. VERIFICAÇÃO NO ETHERSCAN (OPCIONAL) ---
  if (process.env.ETHERSCAN_API_KEY && networkName !== "hardhat" && networkName !== "localhost") {
    console.log("\n🔍 Verifying contracts on Etherscan... (waiting 30s for propagation)");
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    try {
      const { run } = require("hardhat");
      
      await run("verify:verify", { 
        address: vitrineCoreAddress, 
        constructorArguments: [] 
      });
      
      await run("verify:verify", { 
        address: marketplaceAddress, 
        constructorArguments: [vitrineCoreAddress, feeRecipientAddress] 
      });
      
      console.log("✅ All contracts verified on Etherscan");
    } catch (error: any) {
      console.log("⚠️  Etherscan verification failed:", error.message);
    }
  }

  // --- 6. RESUMO FINAL ---
  console.log("\n🎉 Deployment completed successfully!");
  console.log("📋 Contract Summary:");
  console.log(`   VitrineCore:  ${vitrineCoreAddress}`);
  console.log(`   Marketplace:  ${marketplaceAddress}`);
  if (tokenAddress !== ethers.ZeroAddress) {
    console.log(`   MockToken:    ${tokenAddress}`);
  }
  console.log(`   Network:      ${networkName} (Chain ID: ${network.chainId})`);
  console.log(`   Deployer:     ${deployer.address}`);
}

// --- FUNÇÕES AUXILIARES (Melhoradas) ---

function saveDeploymentJson(networkName: string, contracts: { [name: string]: { address: string } }) {
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  const deploymentInfo = {
    network: networkName,
    chainId: (ethers.provider.network || {}).chainId?.toString(),
    deployedAt: new Date().toISOString(),
    contracts,
  };
  
  const deploymentFile = path.join(deploymentsDir, `${networkName}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log(`   - Deployment info saved to: deployments/${networkName}.json`);
}

function updateEnvFiles(chainId: string, addresses: { [name: string]: string }) {
  // Atualizar .env da raiz
  updateEnvFile(path.join(__dirname, "..", ".env"), addresses, chainId);
  
  // Atualizar .env do frontend
  const frontendEnvPath = path.join(__dirname, "..", "frontend", ".env");
  const frontendAddresses = Object.fromEntries(
    Object.entries(addresses).map(([key, value]) => [`VITE_${key}`, value])
  );
  updateEnvFile(frontendEnvPath, frontendAddresses, chainId, "VITE_");
}

function updateEnvFile(filePath: string, addresses: { [name: string]: string }, chainId: string, prefix = "") {
  if (!fs.existsSync(path.dirname(filePath))) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
  }

  let envContent = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
  
  const updateVar = (content: string, varName: string, value: string) => {
    const regex = new RegExp(`^${varName}=.*`, "m");
    const newLine = `${varName}="${value}"`;
    return regex.test(content) ? content.replace(regex, newLine) : `${content}\n${newLine}`;
  };

  // Atualizar endereços dos contratos
  Object.entries(addresses).forEach(([name, address]) => {
    envContent = updateVar(envContent, name, address);
  });
  
  // Atualizar Chain ID
  envContent = updateVar(envContent, `${prefix}CHAIN_ID`, chainId);
  
  fs.writeFileSync(filePath, envContent.trim() + '\n');
  console.log(`   - ${path.relative(path.join(__dirname, '..'), filePath)} updated`);
}

function copyAbisToFrontend(contractNames: string[]) {
  console.log('\n🔄 Copying contract ABIs to frontend...');
  
  const frontendAbiPath = path.join(__dirname, '..', 'frontend', 'src', 'abi');
  if (!fs.existsSync(frontendAbiPath)) {
    fs.mkdirSync(frontendAbiPath, { recursive: true });
  }

  const typeGenPath = path.join(frontendAbiPath, 'types.ts');
  let typeDefinitions = '// Auto-generated contract types\n\n';

  contractNames.forEach(contractName => {
    const sourcePath = path.join(__dirname, '..', 'artifacts', 'contracts', `${contractName}.sol`, `${contractName}.json`);
    const targetPath = path.join(frontendAbiPath, `${contractName}.json`);

    try {
      if (fs.existsSync(sourcePath)) {
        const artifact = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
        
        // Salvar apenas o ABI
        fs.writeFileSync(targetPath, JSON.stringify(artifact.abi, null, 2));
        
        // Gerar tipos TypeScript
        typeDefinitions += `export const ${contractName.toUpperCase()}_ABI = ${JSON.stringify(artifact.abi)} as const;\n`;
        
        console.log(`✅ Copied ${contractName} ABI to frontend`);
      } else {
        console.log(`⚠️  ${contractName} artifact not found at ${sourcePath}`);
      }
    } catch (error: any) {
      console.error(`❌ Error copying ${contractName} ABI:`, error.message);
    }
  });

  // Salvar tipos TypeScript
  fs.writeFileSync(typeGenPath, typeDefinitions);
  console.log(`✅ Generated TypeScript types at src/abi/types.ts`);
}

// --- EXECUTOR PRINCIPAL ---
main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});

