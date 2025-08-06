import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  console.log("🚀 Starting Vitrine Marketplace deployment (without Jury)...");

  const [deployer] = await ethers.getSigners();
  console.log("📋 Deploying contracts with account:", deployer.address);
  
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");

  // --- 1. DEPLOY DOS CONTRATOS ---
  console.log("\n📦 Deploying Core Contracts...");

  // Deploy VitrineCore
  console.log("Deploying VitrineCore...");
  const VitrineCore = await ethers.getContractFactory("VitrineCore");
  const vitrineCore = await VitrineCore.deploy();
  await vitrineCore.waitForDeployment();
  const vitrineCoreAddress = await vitrineCore.getAddress();
  console.log("✅ VitrineCore deployed to:", vitrineCoreAddress);

  // Deploy Marketplace
  console.log("Deploying Marketplace...");
  const feeRecipientAddress = deployer.address;
  const Marketplace = await ethers.getContractFactory("Marketplace");
  const marketplace = await Marketplace.deploy(vitrineCoreAddress, feeRecipientAddress);
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  console.log("✅ Marketplace deployed to:", marketplaceAddress);

  // --- 2. CONFIGURAÇÃO PÓS-DEPLOY ---
  console.log("\n⚙️ Setting up contract connections...");

  try {
    await vitrineCore.setMarketplaceContract(marketplaceAddress);
    console.log("✅ Marketplace address set in VitrineCore");
  } catch (error: any) {
    console.log("⚠️  Could not set marketplace in VitrineCore:", error.message);
  }

  // --- 3. VERIFICAÇÃO ---
  console.log("\n🔍 Verifying contract setup...");
  
  try {
    const marketplaceInCore = await vitrineCore.marketplaceContract();
    console.log("✅ VitrineCore.marketplaceContract:", marketplaceInCore);
    
    const productCounter = await marketplace.getProductCounter();
    console.log("✅ Marketplace initial product counter:", productCounter.toString());
    
    const platformFee = await marketplace.platformFeeBps();
    console.log("✅ Marketplace platform fee:", (Number(platformFee) / 100).toFixed(2) + "%");
  } catch (error: any) {
    console.log("⚠️  Some verification checks failed:", error.message);
  }

  // --- 4. SALVAR ARTEFATOS ---
  const network = await ethers.provider.getNetwork();
  const networkName = network.name === "unknown" ? "localhost" : network.name;
  const chainId = network.chainId.toString();
  
  console.log(`\n💾 Saving deployment info for network: ${networkName} (Chain ID: ${chainId})`);
  
  const contractInfo = {
    VitrineCore: { address: vitrineCoreAddress },
    Marketplace: { address: marketplaceAddress },
  };
  
  saveDeploymentJson(networkName, contractInfo, chainId);
  updateEnvFiles(chainId, {
    VITRINE_CORE_ADDRESS: vitrineCoreAddress,
    MARKETPLACE_ADDRESS: marketplaceAddress,
    DEPLOYER_PRIVATE_KEY: "", // Será preenchido separadamente por segurança
    FEE_RECIPIENT: feeRecipientAddress,
  });
  copyAbisToFrontend(["VitrineCore", "Marketplace"]);

  // --- 5. RESUMO FINAL ---
  console.log("\n🎉 Deployment completed successfully!");
  console.log("📋 Contract Summary:");
  console.log(`   VitrineCore:  ${vitrineCoreAddress}`);
  console.log(`   Marketplace:  ${marketplaceAddress}`);
  console.log(`   Network:      ${networkName} (Chain ID: ${chainId})`);
  console.log(`   Fee Recipient: ${feeRecipientAddress}`);
  console.log("\n💡 Note: Jury system disabled for now. Disputes can be resolved manually by owner.");
  
  // Mostrar primeiro produto para teste
  console.log("\n🧪 Ready for testing:");
  console.log("   1. Connect wallet to Hardhat network (Chain ID: 31337)");
  console.log("   2. Use frontend to list your first product");
  console.log("   3. Test purchase flow");
  console.log("   4. Backend ready at: http://localhost:8000");
}

// --- FUNÇÕES AUXILIARES ---
function saveDeploymentJson(networkName: string, contracts: { [name: string]: { address: string } }, chainId: string) {
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  const deploymentInfo = {
    network: networkName,
    chainId: chainId,
    deployedAt: new Date().toISOString(),
    contracts,
    note: "Jury system disabled - only VitrineCore and Marketplace deployed"
  };
  
  const deploymentFile = path.join(deploymentsDir, `${networkName}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log(`   ✅ Deployment info saved to: deployments/${networkName}.json`);
}

function updateEnvFiles(chainId: string, addresses: { [name: string]: string }) {
  // --- FRONTEND .ENV ---
  console.log("\n📝 Updating environment files...");
  
  const frontendEnvPath = path.join(__dirname, "..", "frontend", ".env");
  const frontendEnvContent = `# Vitrine Marketplace Frontend - Generated by deploy script
# Last updated: ${new Date().toISOString()}

# ========================================
# BACKEND API CONFIGURATION
# ========================================
VITE_API_BASE_URL=http://localhost:8000
VITE_API_TIMEOUT=10000

# ========================================
# SMART CONTRACTS
# ========================================
VITE_VITRINE_CORE_ADDRESS=${addresses.VITRINE_CORE_ADDRESS}
VITE_MARKETPLACE_ADDRESS=${addresses.MARKETPLACE_ADDRESS}

# ========================================
# BLOCKCHAIN CONFIGURATION
# ========================================
VITE_WEB3_PROVIDER_URL=http://127.0.0.1:8545
VITE_CHAIN_ID=${chainId}
VITE_NETWORK_NAME=${chainId === "31337" ? "Hardhat Local" : "Unknown"}

# ========================================
# CESS NETWORK
# ========================================
VITE_CESS_GATEWAY_URL=https://deoss-sgp.cess.network
VITE_ENABLE_CESS_STORAGE=true

# ========================================
# FEATURES FLAGS
# ========================================
VITE_ENABLE_REAL_PAYMENTS=false
VITE_ENABLE_AI_PROCESSING=true
VITE_MAX_FILE_SIZE=10485760
VITE_MAX_FILES_PER_PRODUCT=5

# ========================================
# UI CONFIGURATION
# ========================================
VITE_APP_NAME="Vitrine Marketplace"
VITE_APP_VERSION="1.0.0"
VITE_DEBUG=true

# ========================================
# WALLET CONFIGURATION
# ========================================
VITE_WALLETCONNECT_PROJECT_ID=c83bfd700be4b60b6024399e74aadb30

# ========================================
# ANALYTICS (Optional)
# ========================================
VITE_ANALYTICS_ENABLED=false
VITE_MIXPANEL_TOKEN=
`;

  // Criar diretório se não existir
  if (!fs.existsSync(path.dirname(frontendEnvPath))) {
    fs.mkdirSync(path.dirname(frontendEnvPath), { recursive: true });
  }
  
  fs.writeFileSync(frontendEnvPath, frontendEnvContent);
  console.log(`   ✅ Frontend .env updated: ${frontendEnvPath}`);

  // --- BACKEND .ENV ---
  const backendEnvPath = path.join(__dirname, "..", ".env");
  
  // Ler .env existente para preservar credenciais CESS
  let existingEnvContent = "";
  let cessCreds = {
    CESS_ACCOUNT: "",
    CESS_MESSAGE: "",
    CESS_SIGNATURE: "",
    CESS_TERRITORY: "Vitrine",
    CESS_GATEWAY_URL: "https://deoss-sgp.cess.network",
    CESS_ENDPOINT: "https://testnet-rpc.cess.cloud/"
  };
  
  if (fs.existsSync(backendEnvPath)) {
    existingEnvContent = fs.readFileSync(backendEnvPath, 'utf8');
    // Extrair credenciais CESS existentes
    const cessAccountMatch = existingEnvContent.match(/CESS_ACCOUNT=(.+)/);
    const cessMessageMatch = existingEnvContent.match(/CESS_MESSAGE=(.+)/);
    const cessSignatureMatch = existingEnvContent.match(/CESS_SIGNATURE=(.+)/);
    const cessTerritoryMatch = existingEnvContent.match(/CESS_TERRITORY=(.+)/);
    const cessGatewayMatch = existingEnvContent.match(/CESS_GATEWAY_URL=(.+)/);
    const cessEndpointMatch = existingEnvContent.match(/CESS_ENDPOINT=(.+)/);
    
    if (cessAccountMatch) cessCreds.CESS_ACCOUNT = cessAccountMatch[1];
    if (cessMessageMatch) cessCreds.CESS_MESSAGE = cessMessageMatch[1];
    if (cessSignatureMatch) cessCreds.CESS_SIGNATURE = cessSignatureMatch[1];
    if (cessTerritoryMatch) cessCreds.CESS_TERRITORY = cessTerritoryMatch[1];
    if (cessGatewayMatch) cessCreds.CESS_GATEWAY_URL = cessGatewayMatch[1];
    if (cessEndpointMatch) cessCreds.CESS_ENDPOINT = cessEndpointMatch[1];
  }
  
  const backendEnvContent = `# Vitrine Marketplace Backend - Generated by deploy script
# Last updated: ${new Date().toISOString()}

# ========================================
# BACKEND CONFIGURATION
# ========================================

# Smart Contract Addresses
VITRINE_CORE_ADDRESS=${addresses.VITRINE_CORE_ADDRESS}
MARKETPLACE_ADDRESS=${addresses.MARKETPLACE_ADDRESS}

# Blockchain Configuration
DEPLOYER_PRIVATE_KEY=5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a
WEB3_PROVIDER_URL=http://localhost:8545
CHAIN_ID=${chainId}

# Fee Configuration
FEE_RECIPIENT=${addresses.FEE_RECIPIENT}
PLATFORM_FEE_BPS=250

# ========================================
# CESS NETWORK CONFIGURATION
# ========================================
CESS_GATEWAY_URL=${cessCreds.CESS_GATEWAY_URL}
CESS_TERRITORY=${cessCreds.CESS_TERRITORY}
CESS_ACCOUNT=${cessCreds.CESS_ACCOUNT}
CESS_MESSAGE=${cessCreds.CESS_MESSAGE}
CESS_SIGNATURE=${cessCreds.CESS_SIGNATURE}

# CESS Account Configuration (Alternative)
CESS_ACCOUNT_MNEMONIC=${cessCreds.CESS_ACCOUNT ? "protect fragile rebel raccoon grocery keep horse flag ridge prosper pigeon pipe" : "# Add your mnemonic here"}
CESS_ENDPOINT=${cessCreds.CESS_ENDPOINT}

# ========================================
# DATABASE
# ========================================
DATABASE_URL=vitrine.db

# ========================================
# SECURITY
# ========================================
JWT_SECRET_KEY=8f3h9x2m4k7n6p1q5w8e9r3t2y7u4i6o9p3l5k8j2h6g4f7d9s1a3z5x8c2v6b0n4m
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440

# ========================================
# API CONFIGURATION
# ========================================
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=true

# CORS Origins
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# Rate Limiting
RATE_LIMIT_PER_MINUTE=60
RATE_LIMIT_BURST=100

# ========================================
# LOGGING
# ========================================
LOG_LEVEL=INFO
LOG_FILE=vitrine_backend.log

# ========================================
# EXTERNAL APIs
# ========================================
COINBASE_API_KEY=
ETHERSCAN_API_KEY=

# ========================================
# REDIS (optional, for caching)
# ========================================
REDIS_URL=redis://localhost:6379

# ========================================
# FILE UPLOAD
# ========================================
MAX_FILE_SIZE=10485760  # 10MB
UPLOAD_DIRECTORY=uploads/

# ========================================
# EMAIL (for notifications)
# ========================================
SMTP_SERVER=
SMTP_PORT=587
SMTP_USERNAME=
SMTP_PASSWORD=
FROM_EMAIL=noreply@vitrine-dapp.com

# ========================================
# ANALYTICS
# ========================================
ANALYTICS_ENABLED=true
MIXPANEL_TOKEN=

# ========================================
# FEATURE FLAGS
# ========================================
ENABLE_AI_PROCESSING=true
ENABLE_CESS_STORAGE=true
ENABLE_REAL_PAYMENTS=false  # Set to true in production

# ========================================
# DEVELOPMENT
# ========================================
DEVELOPMENT_MODE=true
MOCK_BLOCKCHAIN_CALLS=false
VERBOSE_LOGGING=true
`;

  fs.writeFileSync(backendEnvPath, backendEnvContent);
  console.log(`   ✅ Backend .env updated: ${backendEnvPath}`);
  
  if (!cessCreds.CESS_ACCOUNT) {
    console.log(`   ⚠️  CESS credentials not found - please update manually in .env`);
  } else {
    console.log(`   ✅ CESS credentials preserved from existing .env`);
  }
}

function copyAbisToFrontend(contractNames: string[]) {
  console.log('\n🔄 Copying contract ABIs to frontend...');
  
  const frontendAbiPath = path.join(__dirname, '..', 'frontend', 'src', 'abi');
  if (!fs.existsSync(frontendAbiPath)) {
    fs.mkdirSync(frontendAbiPath, { recursive: true });
  }

  contractNames.forEach(contractName => {
    const sourcePath = path.join(__dirname, '..', 'artifacts', 'contracts', `${contractName}.sol`, `${contractName}.json`);
    const targetPath = path.join(frontendAbiPath, `${contractName}.json`);

    try {
      if (fs.existsSync(sourcePath)) {
        const artifact = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
        
        // Criar arquivo com ABI + endereços para facilitar importação
        const abiWithInfo = {
          abi: artifact.abi,
          contractName: contractName,
          updatedAt: new Date().toISOString(),
          note: "Generated by deploy script - do not edit manually"
        };
        
        fs.writeFileSync(targetPath, JSON.stringify(abiWithInfo, null, 2));
        console.log(`   ✅ Copied ${contractName} ABI to frontend`);
      } else {
        console.log(`   ⚠️  ${contractName} artifact not found at ${sourcePath}`);
      }
    } catch (error: any) {
      console.error(`   ❌ Error copying ${contractName} ABI:`, error.message);
    }
  });
  
  // Criar arquivo de índice para facilitar importações
  const indexPath = path.join(frontendAbiPath, 'index.ts');
  const indexContent = `// Auto-generated ABI exports - Updated: ${new Date().toISOString()}
${contractNames.map(name => `export { default as ${name}ABI } from './${name}.json';`).join('\n')}

// Contract addresses (from environment variables)
export const CONTRACT_ADDRESSES = {
  VitrineCore: import.meta.env.VITE_VITRINE_CORE_ADDRESS,
  Marketplace: import.meta.env.VITE_MARKETPLACE_ADDRESS,
} as const;

export type ContractName = keyof typeof CONTRACT_ADDRESSES;
`;
  
  fs.writeFileSync(indexPath, indexContent);
  console.log(`   ✅ Created ABI index file for easy imports`);
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  console.log("🚀 Starting Vitrine Marketplace deployment (without Jury)...");

  const [deployer] = await ethers.getSigners();
  console.log("📋 Deploying contracts with account:", deployer.address);
  
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");

  // --- 1. DEPLOY DOS CONTRATOS ---
  console.log("\n📦 Deploying Core Contracts...");

  // Deploy VitrineCore
  console.log("Deploying VitrineCore...");
  const VitrineCore = await ethers.getContractFactory("VitrineCore");
  const vitrineCore = await VitrineCore.deploy();
  await vitrineCore.waitForDeployment();
  const vitrineCoreAddress = await vitrineCore.getAddress();
  console.log("✅ VitrineCore deployed to:", vitrineCoreAddress);

  // Deploy Marketplace
  console.log("Deploying Marketplace...");
  const feeRecipientAddress = deployer.address;
  const Marketplace = await ethers.getContractFactory("Marketplace");
  const marketplace = await Marketplace.deploy(vitrineCoreAddress, feeRecipientAddress);
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  console.log("✅ Marketplace deployed to:", marketplaceAddress);

  // --- 2. CONFIGURAÇÃO PÓS-DEPLOY ---
  console.log("\n⚙️ Setting up contract connections...");

  try {
    await vitrineCore.setMarketplaceContract(marketplaceAddress);
    console.log("✅ Marketplace address set in VitrineCore");
  } catch (error: any) {
    console.log("⚠️  Could not set marketplace in VitrineCore:", error.message);
  }

  // --- 3. VERIFICAÇÃO ---
  console.log("\n🔍 Verifying contract setup...");
  
  try {
    const marketplaceInCore = await vitrineCore.marketplaceContract();
    console.log("✅ VitrineCore.marketplaceContract:", marketplaceInCore);
    
    const productCounter = await marketplace.getProductCounter();
    console.log("✅ Marketplace initial product counter:", productCounter.toString());
    
    const platformFee = await marketplace.platformFeeBps();
    console.log("✅ Marketplace platform fee:", (Number(platformFee) / 100).toFixed(2) + "%");
  } catch (error: any) {
    console.log("⚠️  Some verification checks failed:", error.message);
  }

  // --- 4. SALVAR ARTEFATOS ---
  const network = await ethers.provider.getNetwork();
  const networkName = network.name === "unknown" ? "localhost" : network.name;
  const chainId = network.chainId.toString();
  
  console.log(`\n💾 Saving deployment info for network: ${networkName} (Chain ID: ${chainId})`);
  
  const contractInfo = {
    VitrineCore: { address: vitrineCoreAddress },
    Marketplace: { address: marketplaceAddress },
  };
  
  saveDeploymentJson(networkName, contractInfo, chainId);
  updateEnvFiles(chainId, {
    VITRINE_CORE_ADDRESS: vitrineCoreAddress,
    MARKETPLACE_ADDRESS: marketplaceAddress,
    DEPLOYER_PRIVATE_KEY: "", // Será preenchido separadamente por segurança
    FEE_RECIPIENT: feeRecipientAddress,
  });
  copyAbisToFrontend(["VitrineCore", "Marketplace"]);

  // --- 5. RESUMO FINAL ---
  console.log("\n🎉 Deployment completed successfully!");
  console.log("📋 Contract Summary:");
  console.log(`   VitrineCore:  ${vitrineCoreAddress}`);
  console.log(`   Marketplace:  ${marketplaceAddress}`);
  console.log(`   Network:      ${networkName} (Chain ID: ${chainId})`);
  console.log(`   Fee Recipient: ${feeRecipientAddress}`);
  console.log("\n💡 Note: Jury system disabled for now. Disputes can be resolved manually by owner.");
  
  // Mostrar primeiro produto para teste
  console.log("\n🧪 Ready for testing:");
  console.log("   1. Connect wallet to Hardhat network (Chain ID: 31337)");
  console.log("   2. Use frontend to list your first product");
  console.log("   3. Test purchase flow");
  console.log("   4. Backend ready at: http://localhost:8000");
}

// --- FUNÇÕES AUXILIARES ---
function saveDeploymentJson(networkName: string, contracts: { [name: string]: { address: string } }, chainId: string) {
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  const deploymentInfo = {
    network: networkName,
    chainId: chainId,
    deployedAt: new Date().toISOString(),
    contracts,
    note: "Jury system disabled - only VitrineCore and Marketplace deployed"
  };
  
  const deploymentFile = path.join(deploymentsDir, `${networkName}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log(`   ✅ Deployment info saved to: deployments/${networkName}.json`);
}

function updateEnvFiles(chainId: string, addresses: { [name: string]: string }) {
  // --- FRONTEND .ENV ---
  console.log("\n📝 Updating environment files...");
  
  const frontendEnvPath = path.join(__dirname, "..", "frontend", ".env");
  const frontendEnvContent = `# Vitrine Marketplace Frontend - Generated by deploy script
# Last updated: ${new Date().toISOString()}

# ========================================
# BACKEND API CONFIGURATION
# ========================================
VITE_API_BASE_URL=http://localhost:8000
VITE_API_TIMEOUT=10000

# ========================================
# SMART CONTRACTS
# ========================================
VITE_VITRINE_CORE_ADDRESS=${addresses.VITRINE_CORE_ADDRESS}
VITE_MARKETPLACE_ADDRESS=${addresses.MARKETPLACE_ADDRESS}

# ========================================
# BLOCKCHAIN CONFIGURATION
# ========================================
VITE_WEB3_PROVIDER_URL=http://127.0.0.1:8545
VITE_CHAIN_ID=${chainId}
VITE_NETWORK_NAME=${chainId === "31337" ? "Hardhat Local" : "Unknown"}

# ========================================
# CESS NETWORK
# ========================================
VITE_CESS_GATEWAY_URL=https://deoss-sgp.cess.network
VITE_ENABLE_CESS_STORAGE=true

# ========================================
# FEATURES FLAGS
# ========================================
VITE_ENABLE_REAL_PAYMENTS=false
VITE_ENABLE_AI_PROCESSING=true
VITE_MAX_FILE_SIZE=10485760
VITE_MAX_FILES_PER_PRODUCT=5

# ========================================
# UI CONFIGURATION
# ========================================
VITE_APP_NAME="Vitrine Marketplace"
VITE_APP_VERSION="1.0.0"
VITE_DEBUG=true

# ========================================
# WALLET CONFIGURATION
# ========================================
VITE_WALLETCONNECT_PROJECT_ID=c83bfd700be4b60b6024399e74aadb30

# ========================================
# ANALYTICS (Optional)
# ========================================
VITE_ANALYTICS_ENABLED=false
VITE_MIXPANEL_TOKEN=
`;

  // Criar diretório se não existir
  if (!fs.existsSync(path.dirname(frontendEnvPath))) {
    fs.mkdirSync(path.dirname(frontendEnvPath), { recursive: true });
  }
  
  fs.writeFileSync(frontendEnvPath, frontendEnvContent);
  console.log(`   ✅ Frontend .env updated: ${frontendEnvPath}`);

  // --- BACKEND .ENV ---
  const backendEnvPath = path.join(__dirname, "..", ".env");
  
  // Ler .env existente para preservar credenciais CESS
  let existingEnvContent = "";
  let cessCreds = {
    CESS_ACCOUNT: "",
    CESS_MESSAGE: "",
    CESS_SIGNATURE: "",
    CESS_TERRITORY: "Vitrine",
    CESS_GATEWAY_URL: "https://deoss-sgp.cess.network",
    CESS_ENDPOINT: "https://testnet-rpc.cess.cloud/"
  };
  
  if (fs.existsSync(backendEnvPath)) {
    existingEnvContent = fs.readFileSync(backendEnvPath, 'utf8');
    // Extrair credenciais CESS existentes
    const cessAccountMatch = existingEnvContent.match(/CESS_ACCOUNT=(.+)/);
    const cessMessageMatch = existingEnvContent.match(/CESS_MESSAGE=(.+)/);
    const cessSignatureMatch = existingEnvContent.match(/CESS_SIGNATURE=(.+)/);
    const cessTerritoryMatch = existingEnvContent.match(/CESS_TERRITORY=(.+)/);
    const cessGatewayMatch = existingEnvContent.match(/CESS_GATEWAY_URL=(.+)/);
    const cessEndpointMatch = existingEnvContent.match(/CESS_ENDPOINT=(.+)/);
    
    if (cessAccountMatch) cessCreds.CESS_ACCOUNT = cessAccountMatch[1];
    if (cessMessageMatch) cessCreds.CESS_MESSAGE = cessMessageMatch[1];
    if (cessSignatureMatch) cessCreds.CESS_SIGNATURE = cessSignatureMatch[1];
    if (cessTerritoryMatch) cessCreds.CESS_TERRITORY = cessTerritoryMatch[1];
    if (cessGatewayMatch) cessCreds.CESS_GATEWAY_URL = cessGatewayMatch[1];
    if (cessEndpointMatch) cessCreds.CESS_ENDPOINT = cessEndpointMatch[1];
  }
  
  const backendEnvContent = `# Vitrine Marketplace Backend - Generated by deploy script
# Last updated: ${new Date().toISOString()}

# ========================================
# BACKEND CONFIGURATION
# ========================================

# Smart Contract Addresses
VITRINE_CORE_ADDRESS=${addresses.VITRINE_CORE_ADDRESS}
MARKETPLACE_ADDRESS=${addresses.MARKETPLACE_ADDRESS}

# Blockchain Configuration
DEPLOYER_PRIVATE_KEY=5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a
WEB3_PROVIDER_URL=http://localhost:8545
CHAIN_ID=${chainId}

# Fee Configuration
FEE_RECIPIENT=${addresses.FEE_RECIPIENT}
PLATFORM_FEE_BPS=250

# ========================================
# CESS NETWORK CONFIGURATION
# ========================================
CESS_GATEWAY_URL=${cessCreds.CESS_GATEWAY_URL}
CESS_TERRITORY=${cessCreds.CESS_TERRITORY}
CESS_ACCOUNT=${cessCreds.CESS_ACCOUNT}
CESS_MESSAGE=${cessCreds.CESS_MESSAGE}
CESS_SIGNATURE=${cessCreds.CESS_SIGNATURE}

# CESS Account Configuration (Alternative)
CESS_ACCOUNT_MNEMONIC=${cessCreds.CESS_ACCOUNT ? "protect fragile rebel raccoon grocery keep horse flag ridge prosper pigeon pipe" : "# Add your mnemonic here"}
CESS_ENDPOINT=${cessCreds.CESS_ENDPOINT}

# ========================================
# DATABASE
# ========================================
DATABASE_URL=vitrine.db

# ========================================
# SECURITY
# ========================================
JWT_SECRET_KEY=8f3h9x2m4k7n6p1q5w8e9r3t2y7u4i6o9p3l5k8j2h6g4f7d9s1a3z5x8c2v6b0n4m
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440

# ========================================
# API CONFIGURATION
# ========================================
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=true

# CORS Origins
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# Rate Limiting
RATE_LIMIT_PER_MINUTE=60
RATE_LIMIT_BURST=100

# ========================================
# LOGGING
# ========================================
LOG_LEVEL=INFO
LOG_FILE=vitrine_backend.log

# ========================================
# EXTERNAL APIs
# ========================================
COINBASE_API_KEY=
ETHERSCAN_API_KEY=

# ========================================
# REDIS (optional, for caching)
# ========================================
REDIS_URL=redis://localhost:6379

# ========================================
# FILE UPLOAD
# ========================================
MAX_FILE_SIZE=10485760  # 10MB
UPLOAD_DIRECTORY=uploads/

# ========================================
# EMAIL (for notifications)
# ========================================
SMTP_SERVER=
SMTP_PORT=587
SMTP_USERNAME=
SMTP_PASSWORD=
FROM_EMAIL=noreply@vitrine-dapp.com

# ========================================
# ANALYTICS
# ========================================
ANALYTICS_ENABLED=true
MIXPANEL_TOKEN=

# ========================================
# FEATURE FLAGS
# ========================================
ENABLE_AI_PROCESSING=true
ENABLE_CESS_STORAGE=true
ENABLE_REAL_PAYMENTS=false  # Set to true in production

# ========================================
# DEVELOPMENT
# ========================================
DEVELOPMENT_MODE=true
MOCK_BLOCKCHAIN_CALLS=false
VERBOSE_LOGGING=true
`;

  fs.writeFileSync(backendEnvPath, backendEnvContent);
  console.log(`   ✅ Backend .env updated: ${backendEnvPath}`);
  
  if (!cessCreds.CESS_ACCOUNT) {
    console.log(`   ⚠️  CESS credentials not found - please update manually in .env`);
  } else {
    console.log(`   ✅ CESS credentials preserved from existing .env`);
  }
}

function copyAbisToFrontend(contractNames: string[]) {
  console.log('\n🔄 Copying contract ABIs to frontend...');
  
  const frontendAbiPath = path.join(__dirname, '..', 'frontend', 'src', 'abi');
  if (!fs.existsSync(frontendAbiPath)) {
    fs.mkdirSync(frontendAbiPath, { recursive: true });
  }

  contractNames.forEach(contractName => {
    const sourcePath = path.join(__dirname, '..', 'artifacts', 'contracts', `${contractName}.sol`, `${contractName}.json`);
    const targetPath = path.join(frontendAbiPath, `${contractName}.json`);

    try {
      if (fs.existsSync(sourcePath)) {
        const artifact = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
        
        // Criar arquivo com ABI + endereços para facilitar importação
        const abiWithInfo = {
          abi: artifact.abi,
          contractName: contractName,
          updatedAt: new Date().toISOString(),
          note: "Generated by deploy script - do not edit manually"
        };
        
        fs.writeFileSync(targetPath, JSON.stringify(abiWithInfo, null, 2));
        console.log(`   ✅ Copied ${contractName} ABI to frontend`);
      } else {
        console.log(`   ⚠️  ${contractName} artifact not found at ${sourcePath}`);
      }
    } catch (error: any) {
      console.error(`   ❌ Error copying ${contractName} ABI:`, error.message);
    }
  });
  
  // Criar arquivo de índice para facilitar importações
  const indexPath = path.join(frontendAbiPath, 'index.ts');
  const indexContent = `// Auto-generated ABI exports - Updated: ${new Date().toISOString()}
${contractNames.map(name => `export { default as ${name}ABI } from './${name}.json';`).join('\n')}

// Contract addresses (from environment variables)
export const CONTRACT_ADDRESSES = {
  VitrineCore: import.meta.env.VITE_VITRINE_CORE_ADDRESS,
  Marketplace: import.meta.env.VITE_MARKETPLACE_ADDRESS,
} as const;

export type ContractName = keyof typeof CONTRACT_ADDRESSES;
`;
  
  fs.writeFileSync(indexPath, indexContent);
  console.log(`   ✅ Created ABI index file for easy imports`);
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});
