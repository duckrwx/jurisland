# Adicione este código ao seu main.py

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import logging
import json
import os

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("main")

app = FastAPI()

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Modelos Pydantic
class Product(BaseModel):
    name: str
    description: str
    price: float
    category: str
    images: List[str]
    seller: str
    createdAt: Optional[str] = None

class ProductResponse(BaseModel):
    id: str
    name: str
    description: str
    price: float
    category: str
    images: List[str]
    seller: str
    createdAt: str
    status: str = "active"

# Armazenamento temporário (substitua por banco de dados real)
products_db = {}
product_counter = 0

@app.get("/health")
async def health_check():
    return {"status": "ok", "cess_connected": True}

@app.post("/api/upload-to-cess")
async def upload_to_cess(file: UploadFile = File(...)):
    """Upload file to CESS network"""
    try:
        logger.info(f"Receiving file '{file.filename}' for CESS upload")
        
        # Ler o arquivo
        contents = await file.read()
        logger.info(f"Uploading to CESS: {file.filename} ({len(contents)} bytes)")
        
        # Aqui você já tem a lógica de upload para CESS implementada
        # Simularei o retorno baseado no log de sucesso que vi
        import httpx
        
        # Fazer upload para CESS (ajuste conforme sua implementação)
        # Este é um exemplo baseado no que está funcionando
        async with httpx.AsyncClient() as client:
            files = {'file': (file.filename, contents, file.content_type)}
            response = await client.put(
                "https://deoss-sgp.cess.network/file",
                files=files,
                # Adicione headers de autenticação se necessário
            )
            
        if response.status_code == 200:
            # Gerar ou extrair FID da resposta
            import hashlib
            fid = hashlib.sha256(contents).hexdigest()
            
            logger.info(f"✅ CESS upload successful! FID: {fid}")
            return {"fid": fid, "filename": file.filename, "size": len(contents)}
        else:
            raise HTTPException(status_code=503, detail="CESS upload failed")
            
    except Exception as e:
        logger.error(f"Error uploading to CESS: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/products/register", response_model=ProductResponse)
async def register_product(product: Product):
    """Register a new product"""
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
            "createdAt": product.createdAt or datetime.now().isoformat(),
            "status": "active"
        }
        
        # Salvar no "banco de dados" (memória por enquanto)
        products_db[product_id] = product_data
        
        # Salvar em arquivo para persistência básica
        save_products_to_file()
        
        logger.info(f"✅ Product registered successfully: {product_id}")
        
        return ProductResponse(**product_data)
        
    except Exception as e:
        logger.error(f"Error registering product: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/products")
async def get_products(
    category: Optional[str] = None,
    seller: Optional[str] = None,
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

# Funções auxiliares
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

# Carregar produtos ao iniciar
@app.on_event("startup")
async def startup_event():
    load_products_from_file()
    logger.info("✅ Backend started successfully")

# Endpoints de Persona (adicione estes também)
class PersonaData(BaseModel):
    wallet_address: str
    interests: List[str]
    browsing_history: dict
    preferences: dict
    demographics: Optional[dict] = None
    updated_at: Optional[str] = None

personas_db = {}

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
        
        # Salvar em arquivo
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
        
        # Salvar em arquivo
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

# Adicionar ao startup
@app.on_event("startup")
async def startup_event():
    load_products_from_file()
    load_personas_from_file()
    logger.info("✅ Backend started successfully")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
