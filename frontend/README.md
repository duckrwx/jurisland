# 🚀 Vitrine Marketplace Frontend

Frontend modular para o marketplace descentralizado Vitrine, construído com React + TypeScript + Web3.

## 🏗️ Arquitetura

- **Frontend**: React 18 + TypeScript + Vite
- **Web3**: wagmi v2 + viem (Ethereum interaction)
- **Backend API**: Integração com FastAPI + CESS storage
- **UI**: Tailwind CSS + Headless UI components
- **State**: Zustand + React Query
- **Upload**: Sistema de upload para CESS network

## 📦 Setup Inicial

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar environment

Crie o arquivo `.env.local` baseado no `.env.local.example`:

```bash
cp .env.local.example .env.local
```

Edite as variáveis conforme necessário:

```bash
# Backend API
VITE_API_BASE_URL=http://localhost:8000
VITE_API_TIMEOUT=10000

# Smart Contracts 
VITE_VITRINE_CORE_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
VITE_MARKETPLACE_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512

# Blockchain
VITE_WEB3_PROVIDER_URL=http://localhost:8545
VITE_CHAIN_ID=31337

# WalletConnect (obtenha em https://cloud.walletconnect.com)
VITE_WALLETCONNECT_PROJECT_ID=your_project_id_here
```

### 3. Iniciar desenvolvimento

```bash
npm run dev
```

O app estará disponível em `http://localhost:5173`

## 🛠️ Scripts Disponíveis

```bash
npm run dev          # Desenvolvimento
npm run build        # Build para produção
npm run preview      # Preview do build
npm run lint         # Linting
npm run test         # Testes
npm run type-check   # Verificação de tipos
```

## 📁 Estrutura do Projeto

```
src/
├── components/          # Componentes reutilizáveis
│   ├── ui/             # Componentes base (Button, Input, etc.)
│   ├── web3/           # Componentes Web3 (ConnectWallet, etc.)
│   ├── upload/         # Sistema de upload para CESS
│   └── layout/         # Layout components
├── pages/              # Páginas principais
├── hooks/              # Custom hooks
├── stores/             # Zustand stores
├── services/           # Serviços (API, Web3)
│   ├── api/           # Backend API calls
│   ├── web3/          # Web3 configuration
│   └── upload/        # Upload to CESS via backend
├── types/              # TypeScript types
├── utils/              # Utilitários
├── constants/          # Constantes e configurações
└── assets/            # Imagens, ícones, etc.
```

## 🔧 Funcionalidades Implementadas

### ✅ Fase 1 - Fundação (COMPLETA)

- [x] Setup do projeto Vite + React + TypeScript
- [x] Configuração Web3 com wagmi + viem
- [x] Integração com backend FastAPI
- [x] Sistema de upload para CESS network
- [x] Stores Zustand para estado global
- [x] Componentes base de UI
- [x] Layout responsivo
- [x] Error boundaries
- [x] Sistema de notificações

### 🔌 Integrações

#### Web3 (Smart Contracts)
- **ConnectWallet**: Conexão com MetaMask, WalletConnect
- **Network Detection**: Verificação de rede correta
- **Contract Hooks**: Integração com Marketplace, VitrineCore, VitrineJuri

#### Backend API
- **Products**: CRUD de produtos
- **Personas**: Sistema de personas
- **Upload**: Upload de arquivos para CESS

#### File Upload
- **Drag & Drop**: Interface intuitiva
- **Progress Tracking**: Progresso em tempo real  
- **Multiple Files**: Upload de múltiplos arquivos
- **CESS Integration**: Storage descentralizado

## 🎯 Próximas Fases

### Fase 2 - Core Marketplace (Próxima)
- [ ] Listagem de produtos
- [ ] Criação de produtos
- [ ] Fluxo de compra
- [ ] Sistema de busca

### Fase 3 - Personas + Reputação
- [ ] Registro de persona
- [ ] Visualização de reputação
- [ ] Analytics comportamentais

### Fase 4 - Sistema de Júri
- [ ] Interface de staking
- [ ] Sistema de votação
- [ ] Resolução de disputas

## 🚀 Como Usar

### 1. Conectar Carteira

```tsx
import { ConnectWallet } from '@/components/web3/ConnectWallet'

function MyComponent() {
  return (
    <ConnectWallet 
      showBalance={true}
      variant="button"
      size="md"
    />
  )
}
```

### 2. Upload de Arquivos

```tsx
import { FileUpload } from '@/components/upload/FileUpload'

function CreateProduct() {
  const handleUploadComplete = (results) => {
    console.log('Files uploaded to CESS:', results)
    // results contém os FIDs dos arquivos
  }

  return (
    <FileUpload
      onUploadComplete={handleUploadComplete}
      maxFiles={5}
      acceptedTypes={['image/*']}
    />
  )
}
```

### 3. Usar API Backend

```tsx
import { productAPI } from '@/services/api/client'
import { useQuery } from '@tanstack/react-query'

function ProductList() {
  const { data, loading, error } = useQuery({
    queryKey: ['products'],
    queryFn: () => productAPI.getProducts()
  })

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div>
      {data?.products?.map(product => (
        <div key={product.id}>{product.name}</div>
      ))}
    </div>
  )
}
```

### 4. Estado Global com Zustand

```tsx
import { useWalletStore, walletSelectors } from '@/stores/walletStore'

function WalletInfo() {
  const address = walletSelectors.useAddress()
  const isConnected = walletSelectors.useIsConnected()
  const displayName = walletSelectors.useDisplayName()

  return (
    <div>
      {isConnected ? (
        <p>Connected as: {displayName}</p>
      ) : (
        <p>Not connected</p>
      )}
    </div>
  )
}
```

## 🔍 Debugging

### Desenvolvimento
- React Query DevTools habilitadas
- Zustand DevTools disponível
- Console logs detalhados para API calls

### Logs importantes
```bash
🚀 API Request: GET /api/products
✅ API Response: GET /api/products  
❌ API Response Error: Network connection failed
🔗 Wallet Connected: 0x1234...5678
⛓️  Wrong Network: Expected 31337, got 1
📁 Upload Progress: 75%
```

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/amazing-feature`)
3. Commit suas mudanças (`git commit -m 'Add amazing feature'`)
4. Push para a branch (`git push origin feature/amazing-feature`)
5. Abra um Pull Request

## 📝 Licença

MIT License - veja o arquivo [LICENSE](LICENSE) para detalhes.

---

**Status**: 🟢 Fase 1 Completa - Pronto para desenvolvimento da Fase 2!
