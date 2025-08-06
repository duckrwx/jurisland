# main.py - Backend Completo para Vitrine DApp

from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import logging
import json
import os
import tempfile
import hashlib
import httpx
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("main")

app = FastAPI(title="Vitrine DApp Backend", version="1.0.0")

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# MODELOS PYDANTIC
# ============================================

class Product(BaseModel):
    name: str
    description: str
    price: float
    category: str
    images: List[str]
    seller: str
    created_at: Optional[str] = None

class ProductResponse(BaseModel):
    id: str
    name: str
    description: str
    price: float
    category: str
    images: List[str]
    seller: str
    created_at: str
    status: str = "active"

class ContractProduct(BaseModel):
    """Modelo para integração com smart contract"""
    deliverer_address: str
    metadata_fid: str  # FID retornado pelo CESS
    price_wei: int     # Preço em Wei (não float)
    creator_commission_bps: int = 0  # Basis points (ex: 500 = 5%)

class ProductMetadata(BaseModel):
    """Metadados que vão para o CESS"""
    name: str
    description: str
    category: str
    images: List[str]  # FIDs das imagens no CESS
    attributes: Optional[dict] = None
    created_at: str

class ProductFull(BaseModel):
    """Modelo completo do produto para o frontend"""
    # Dados do backend
    id: str
    name: str
    description: str
    price: float  # Em ETH para o frontend
    category: str
    images: List[str]  # FIDs das imagens
    seller: str
    created_at: str
    status: str = "active"
    
    # Dados do smart contract
    contract_product_id: Optional[int] = None
    metadata_fid: Optional[str] = None
    deliverer_address: Optional[str] = None
    creator_commission_bps: Optional[int] = None

class PersonaData(BaseModel):
    wallet_address: str
    interests: List[str]
    browsing_history: dict
    preferences: dict
    demographics: Optional[dict] = None
    updated_at: Optional[str] = None

# ============================================
# ARMAZENAMENTO TEMPORÁRIO
# ============================================

products_db = {}
personas_db = {}
product_counter = 0

# ============================================
# FUNÇÕES AUXILIARES
# ============================================

def eth_to_wei(eth_amount: float) -> int:
    """Converte ETH para Wei"""
    return int(eth_amount * 10**18)

def wei_to_eth(wei_amount: int) -> float:
    """Converte Wei para ETH"""
    return wei_amount / 10**18

def validate_cess_credentials():
    """Validar se as credenciais do CESS estão configuradas"""
    required_vars = ["CESS_ACCOUNT", "CESS_MESSAGE", "CESS_SIGNATURE", "CESS_GATEWAY_URL"]
    missing = [var for var in required_vars if not os.getenv(var)]
    
    if missing:
        logger.warning(f"Missing CESS credentials: {', '.join(missing)}")
        return False
    return True

def save_products_to_file():
    """Salvar produtos em arquivo para persistência básica"""
    try:
        with open("products.json", "w") as f:
            json.dump(products_db, f, indent=2)
    except Exception as e:
        logger.error(f"Error saving products to file: {str(e)}")

def load_products_from_file():
    """Carregar produtos do arquivo ao iniciar"""
    global products_db, product_counter
    try:
        if os.path.exists("products.json"):
            with open("products.json", "r") as f:
                products_db = json.load(f)
                # Atualizar contador baseado nos produtos existentes
                if products_db:
                    max_id = max([int(pid.split("_")[1]) for pid in products_db.keys()])
                    product_counter = max_id
            logger.info(f"Loaded {len(products_db)} products from file")
    except Exception as e:
        logger.error(f"Error loading products from file: {str(e)}")
        products_db = {}

def save_personas_to_file():
    """Salvar personas em arquivo"""
    try:
        with open("personas.json", "w") as f:
            json.dump(personas_db, f, indent=2)
    except Exception as e:
        logger.error(f"Error saving personas to file: {str(e)}")

def load_personas_from_file():
    """Carregar personas do arquivo"""
    global personas_db
    try:
        if os.path.exists("personas.json"):
            with open("personas.json", "r") as f:
                personas_db = json.load(f)
            logger.info(f"Loaded {len(personas_db)} personas from file")
    except Exception as e:
        logger.error(f"Error loading personas from file: {str(e)}")
        personas_db = {}

async def upload_file_to_cess(file_content: bytes, filename: str, content_type: str) -> str:
    """Função auxiliar para fazer upload de arquivo para CESS"""
    headers = {
        "Account": os.getenv("CESS_ACCOUNT"),
        "Message": os.getenv("CESS_MESSAGE"),
        "Signature": os.getenv("CESS_SIGNATURE"),
        "Territory": os.getenv("CESS_TERRITORY"),
    }
    
    if not all([headers["Account"], headers["Message"], headers["Signature"]]):
        raise HTTPException(status_code=500, detail="CESS credentials not configured")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        files = {'file': (filename, file_content, content_type)}
        cess_url = os.getenv("CESS_GATEWAY_URL") + "/file"
        
        response = await client.put(cess_url, files=files, headers=headers)
    
    if response.status_code == 200:
        try:
            response_data = response.json()
            fid = response_data.get("fid")
            if not fid:
                fid = hashlib.sha256(file_content).hexdigest()
        except:
            fid = hashlib.sha256(file_content).hexdigest()
        
        return fid
    else:
        raise HTTPException(
            status_code=503, 
            detail=f"CESS upload failed: {response.status_code}"
        )

# ============================================
# ENDPOINTS PRINCIPAIS
# ============================================

@app.get("/health")
async def health_check():
    return {
        "status": "ok", 
        "cess_connected": validate_cess_credentials(),
        "timestamp": datetime.now().isoformat()
    }

@app.post("/api/upload-to-cess")
async def upload_to_cess(file: UploadFile = File(...)):
    """Upload file to CESS network"""
    try:
        logger.info(f"Receiving file '{file.filename}' for CESS upload")
        
        # Ler o arquivo
        contents = await file.read()
        logger.info(f"Uploading to CESS: {file.filename} ({len(contents)} bytes)")
        
        # Fazer upload usando função auxiliar
        fid = await upload_file_to_cess(contents, file.filename, file.content_type)
        
        logger.info(f"✅ CESS upload successful! FID: {fid}")
        
        return {
            "fid": fid,
            "filename": file.filename,
            "size": len(contents),
            "cess_url": f"{os.getenv('CESS_GATEWAY_URL')}/file/{fid}",
            "success": True
        }
        
    except httpx.TimeoutException:
        logger.error("CESS upload timeout")
        raise HTTPException(status_code=504, detail="CESS upload timeout")
    except Exception as e:
        logger.error(f"Error uploading to CESS: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Upload error: {str(e)}")

@app.post("/api/products/create-metadata")
async def create_product_metadata(
    name: str = Form(...),
    description: str = Form(...),
    category: str = Form(...),
    image_fids: str = Form(...),  # JSON string com lista de FIDs
    attributes: str = Form(None)  # JSON string opcional
):
    """Cria arquivo JSON com metadados do produto e faz upload para CESS"""
    try:
        # Parse dos parâmetros JSON
        image_fids_list = json.loads(image_fids)
        attributes_dict = json.loads(attributes) if attributes else {}
        
        # Criar objeto de metadados
        metadata = ProductMetadata(
            name=name,
            description=description,
            category=category,
            images=image_fids_list,
            attributes=attributes_dict,
            created_at=datetime.now().isoformat()
        )
        
        # Converter para JSON
        metadata_json = metadata.json(indent=2)
        
        # Fazer upload do JSON para CESS
        metadata_fid = await upload_file_to_cess(
            metadata_json.encode('utf-8'),
            f"{name}_metadata.json",
            "application/json"
        )
        
        logger.info(f"✅ Metadata uploaded to CESS! FID: {metadata_fid}")
        
        return {
            "metadata_fid": metadata_fid,
            "metadata": metadata.dict(),
            "cess_url": f"{os.getenv('CESS_GATEWAY_URL')}/file/{metadata_fid}",
            "success": True
        }
        
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON in parameters: {str(e)}")
    except Exception as e:
        logger.error(f"Error creating product metadata: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/products/register-blockchain")
async def register_product_blockchain(
    name: str = Form(...),
    description: str = Form(...),
    category: str = Form(...),
    price_eth: float = Form(...),
    seller_address: str = Form(...),
    deliverer_address: str = Form(...),
    image_files: List[UploadFile] = File(...),
    creator_commission_bps: int = Form(0),
    attributes: str = Form("{}")  # JSON string opcional
):
    """
    Fluxo completo: Upload imagens → Criar metadata → Preparar dados para blockchain
    """
    try:
        logger.info(f"Starting blockchain product registration: {name}")
        
        # Parse attributes
        attributes_dict = json.loads(attributes) if attributes else {}
        
        # 1. Upload das imagens para CESS
        image_fids = []
        for image_file in image_files:
            contents = await image_file.read()
            
            # Upload individual da imagem
            image_fid = await upload_file_to_cess(
                contents, 
                image_file.filename, 
                image_file.content_type
            )
            
            image_fids.append(image_fid)
            logger.info(f"Image uploaded: {image_file.filename} → {image_fid}")
        
        # 2. Criar e fazer upload dos metadados
        metadata = ProductMetadata(
            name=name,
            description=description,
            category=category,
            images=image_fids,
            attributes=attributes_dict,
            created_at=datetime.now().isoformat()
        )
        
        metadata_json = metadata.json(indent=2)
        
        # Upload dos metadados
        metadata_fid = await upload_file_to_cess(
            metadata_json.encode('utf-8'),
            f"{name}_metadata.json",
            "application/json"
        )
        
        logger.info(f"Metadata uploaded: {metadata_fid}")
        
        # 3. Preparar dados para o smart contract
        contract_data = {
            "deliverer_address": deliverer_address,
            "metadata_fid": metadata_fid,
            "price_wei": eth_to_wei(price_eth),
            "creator_commission_bps": creator_commission_bps
        }
        
        # 4. Salvar no backend (para referência)
        global product_counter
        product_counter += 1
        product_id = f"prod_{product_counter}_{int(datetime.now().timestamp())}"
        
        product_data = {
            "id": product_id,
            "name": name,
            "description": description,
            "price": price_eth,
            "category": category,
            "images": image_fids,
            "seller": seller_address,
            "created_at": datetime.now().isoformat(),
            "status": "pending_blockchain",  # Status até ser registrado no blockchain
            "metadata_fid": metadata_fid,
            "deliverer_address": deliverer_address,
            "creator_commission_bps": creator_commission_bps
        }
        
        products_db[product_id] = product_data
        save_products_to_file()
        
        return {
            "success": True,
            "product_id": product_id,
            "metadata_fid": metadata_fid,
            "image_fids": image_fids,
            "contract_data": contract_data,
            "message": "Product prepared for blockchain registration"
        }
        
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON in attributes: {str(e)}")
    except Exception as e:
        logger.error(f"Error in blockchain product registration: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/products/register", response_model=ProductResponse)
async def register_product(product: Product):
    """Register a new product (método antigo para compatibilidade)"""
    try:
        global product_counter
        
        logger.info(f"Registering new product: {product.name}")
        
        # Gerar ID único para o produto
        product_counter += 1
        product_id = f"prod_{product_counter}_{int(datetime.now().timestamp())}"
        
        # Criar registro do produto
        product_data = {
            "id": product_id,
            "name": product.name,
            "description": product.description,
            "price": product.price,
            "category": product.category,
            "images": product.images,
            "seller": product.seller,
            "created_at": product.created_at or datetime.now().isoformat(),
            "status": "active"
        }
        
        # Salvar no "banco de dados"
        products_db[product_id] = product_data
        save_products_to_file()
        
        logger.info(f"✅ Product registered successfully: {product_id}")
        
        return ProductResponse(**product_data)
        
    except Exception as e:
        logger.error(f"Error registering product: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/products/{product_id}/update-blockchain-status")
async def update_product_blockchain_status(
    product_id: str,
    contract_product_id: int,
    status: str = "active"
):
    """Atualizar status do produto após registro no blockchain"""
    try:
        if product_id not in products_db:
            raise HTTPException(status_code=404, detail="Product not found")
        
        products_db[product_id]["contract_product_id"] = contract_product_id
        products_db[product_id]["status"] = status
        save_products_to_file()
        
        logger.info(f"Product {product_id} updated with contract ID {contract_product_id}")
        
        return {
            "success": True,
            "product_id": product_id,
            "contract_product_id": contract_product_id,
            "status": status
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating product status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/products")
async def get_products(
    category: Optional[str] = None,
    seller: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
):
    """Get all products with optional filters"""
    try:
        # Filtrar produtos
        filtered_products = list(products_db.values())
        
        if category:
            filtered_products = [p for p in filtered_products if p["category"] == category]
        
        if seller:
            filtered_products = [p for p in filtered_products if p["seller"] == seller]
            
        if status:
            filtered_products = [p for p in filtered_products if p.get("status") == status]
        
        # Paginação
        total = len(filtered_products)
        products = filtered_products[offset:offset + limit]
        
        return {
            "products": products,
            "total": total,
            "limit": limit,
            "offset": offset
        }
        
    except Exception as e:
        logger.error(f"Error fetching products: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/products/{product_id}")
async def get_product(product_id: str):
    """Get a specific product by ID"""
    try:
        if product_id not in products_db:
            raise HTTPException(status_code=404, detail="Product not found")
        
        return products_db[product_id]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching product: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/products/metadata/{metadata_fid}")
async def get_product_metadata(metadata_fid: str):
    """Buscar metadados do produto no CESS pelo FID"""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            cess_url = f"{os.getenv('CESS_GATEWAY_URL')}/file/{metadata_fid}"
            response = await client.get(cess_url)
        
        if response.status_code == 200:
            try:
                metadata = response.json()
                return metadata
            except json.JSONDecodeError:
                # Se não for JSON, retornar como texto
                return {"content": response.text, "type": "text"}
        else:
            raise HTTPException(
                status_code=404, 
                detail=f"Metadata not found in CESS: {metadata_fid}"
            )
            
    except httpx.TimeoutException:
        logger.error("CESS metadata fetch timeout")
        raise HTTPException(status_code=504, detail="CESS fetch timeout")
    except Exception as e:
        logger.error(f"Error fetching metadata from CESS: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# ENDPOINTS DE PERSONA
# ============================================

@app.post("/api/persona/create")
async def create_persona(persona: PersonaData):
    """Create a new persona"""
    try:
        logger.info(f"Creating persona for wallet: {persona.wallet_address}")
        
        if persona.wallet_address in personas_db:
            raise HTTPException(status_code=409, detail="Persona already exists")
        
        persona_data = persona.dict()
        persona_data["created_at"] = datetime.now().isoformat()
        persona_data["updated_at"] = persona_data["updated_at"] or persona_data["created_at"]
        
        personas_db[persona.wallet_address] = persona_data
        save_personas_to_file()
        
        return {"message": "Persona created successfully", "wallet_address": persona.wallet_address}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating persona: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/persona/update/{wallet_address}")
async def update_persona(wallet_address: str, persona: PersonaData):
    """Update an existing persona"""
    try:
        logger.info(f"Updating persona for wallet: {wallet_address}")
        
        if wallet_address not in personas_db:
            raise HTTPException(status_code=404, detail="Persona not found")
        
        persona_data = persona.dict()
        persona_data["updated_at"] = datetime.now().isoformat()
        persona_data["created_at"] = personas_db[wallet_address]["created_at"]
        
        personas_db[wallet_address] = persona_data
        save_personas_to_file()
        
        return {"message": "Persona updated successfully", "wallet_address": wallet_address}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating persona: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/persona/{wallet_address}")
async def get_persona(wallet_address: str):
    """Get a persona by wallet address"""
    try:
        if wallet_address not in personas_db:
            raise HTTPException(status_code=404, detail="Persona not found")
        
        return personas_db[wallet_address]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching persona: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/persona/{wallet_address}")
async def delete_persona(wallet_address: str):
    """Delete a persona"""
    try:
        if wallet_address not in personas_db:
            raise HTTPException(status_code=404, detail="Persona not found")
        
        del personas_db[wallet_address]
        save_personas_to_file()
        
        return {"message": "Persona deleted successfully", "wallet_address": wallet_address}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting persona: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# ENDPOINTS ADMINISTRATIVOS
# ============================================

@app.get("/api/admin/stats")
async def get_admin_stats():
    """Estatísticas administrativas"""
    try:
        total_products = len(products_db)
        active_products = len([p for p in products_db.values() if p.get("status") == "active"])
        total_personas = len(personas_db)
        
        categories = {}
        for product in products_db.values():
            cat = product.get("category", "unknown")
            categories[cat] = categories.get(cat, 0) + 1
        
        return {
            "total_products": total_products,
            "active_products": active_products,
            "total_personas": total_personas,
            "categories": categories,
            "cess_connected": validate_cess_credentials(),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error fetching admin stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/products/cleanup")
async def cleanup_products():
    """Limpar produtos inativos ou com problemas"""
    try:
        cleaned = 0
        products_to_remove = []
        
        for product_id, product_data in products_db.items():
            # Remover produtos sem campos obrigatórios
            if not all(key in product_data for key in ["name", "price", "seller"]):
                products_to_remove.append(product_id)
                cleaned += 1
        
        for product_id in products_to_remove:
            del products_db[product_id]
        
        if cleaned > 0:
            save_products_to_file()
        
        logger.info(f"Cleaned up {cleaned} products")
        
        return {
            "message": f"Cleaned up {cleaned} products",
            "cleaned_count": cleaned,
            "remaining_products": len(products_db)
        }
        
    except Exception as e:
        logger.error(f"Error in cleanup: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# ENDPOINTS DE UTILIDADE
# ============================================

@app.get("/api/utils/eth-to-wei/{eth_amount}")
async def convert_eth_to_wei(eth_amount: float):
    """Converter ETH para Wei"""
    return {
        "eth": eth_amount,
        "wei": eth_to_wei(eth_amount),
        "wei_string": str(eth_to_wei(eth_amount))
    }

@app.get("/api/utils/wei-to-eth/{wei_amount}")
async def convert_wei_to_eth(wei_amount: int):
    """Converter Wei para ETH"""
    return {
        "wei": wei_amount,
        "eth": wei_to_eth(wei_amount),
        "eth_formatted": f"{wei_to_eth(wei_amount):.6f}"
    }

@app.get("/api/utils/validate-fid/{fid}")
async def validate_cess_fid(fid: str):
    """Validar se um FID existe no CESS"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            cess_url = f"{os.getenv('CESS_GATEWAY_URL')}/file/{fid}"
            response = await client.head(cess_url)  # HEAD request para verificar existência
        
        exists = response.status_code == 200
        
        return {
            "fid": fid,
            "exists": exists,
            "status_code": response.status_code,
            "cess_url": cess_url
        }
        
    except httpx.TimeoutException:
        return {
            "fid": fid,
            "exists": False,
            "error": "Timeout connecting to CESS",
            "cess_url": f"{os.getenv('CESS_GATEWAY_URL')}/file/{fid}"
        }
    except Exception as e:
        return {
            "fid": fid,
            "exists": False,
            "error": str(e),
            "cess_url": f"{os.getenv('CESS_GATEWAY_URL')}/file/{fid}"
        }

# ============================================
# EVENTOS DE STARTUP
# ============================================

@app.on_event("startup")
async def startup_event():
    """Inicialização do aplicativo"""
    logger.info("🚀 Starting Vitrine DApp Backend...")
    
    # Carregar dados
    load_products_from_file()
    load_personas_from_file()
    
    # Validar credenciais CESS
    if validate_cess_credentials():
        logger.info("✅ CESS credentials validated")
    else:
        logger.warning("⚠️ CESS credentials incomplete - some features may not work")
    
    # Log de configuração
    logger.info(f"📊 Loaded {len(products_db)} products and {len(personas_db)} personas")
    logger.info(f"🌐 CORS origins: {app.middleware}")
    logger.info("✅ Backend started successfully")

@app.on_event("shutdown")
async def shutdown_event():
    """Limpeza ao desligar o aplicativo"""
    logger.info("💾 Saving data before shutdown...")
    save_products_to_file()
    save_personas_to_file()
    logger.info("👋 Backend shutdown complete")

# ============================================
# EXECUTAR APLICAÇÃO
# ============================================

if __name__ == "__main__":
    import uvicorn
    
    # Configurações do servidor
    host = os.getenv("API_HOST", "0.0.0.0")
    port = int(os.getenv("API_PORT", 8000))
    debug = os.getenv("DEBUG", "true").lower() == "true"
    
    logger.info(f"Starting server on {host}:{port} (debug={debug})")
    
    uvicorn.run(
        app, 
        host=host, 
        port=port,
        reload=debug,
        log_level="info"
    )
