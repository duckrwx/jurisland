// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./VitrineCore.sol";

contract Marketplace is Ownable, ReentrancyGuard {

    VitrineCore public vitrineCore;

    enum PurchaseStatus {
        Pending,
        DeliveryConfirmed,
        ReturnRequested,
        ReturnReceived,
        Completed,
        Refunded
    }

    struct Product {
        uint256 id;
        address seller;
        address deliverer;
        string metadataFID;     // CESS FID for metadata JSON
        uint256 price;
        uint256 creatorCommissionBps;
        bool active;
        uint256 createdAt;      // Timestamp de criação
    }

    struct EscrowedPurchase {
        address buyer;
        address seller;
        address creator;
        address deliverer;
        uint256 productId;      // Referência ao produto
        uint256 price;
        uint256 creatorCommissionBps;
        uint256 releaseTimestamp;
        uint256 inspectionTimestamp;
        PurchaseStatus status;
    }

    uint256 public platformFeeBps = 250; // 2.5%
    address public feeRecipient;
    uint256 private _productCounter;
    uint256 private _purchaseCounter;

    mapping(uint256 => Product) public products;
    mapping(uint256 => EscrowedPurchase) public purchases;

    // --- Eventos ---
    event ProductListed(uint256 indexed productId, address indexed seller, uint256 price, string metadataFID);
    event PurchaseInitiated(uint256 indexed purchaseId, uint256 indexed productId, address indexed buyer);
    event DeliveryConfirmed(uint256 indexed purchaseId, address deliverer);
    event PurchaseCompleted(uint256 indexed purchaseId);
    event PurchaseRefunded(uint256 indexed purchaseId);
    event DisputeOpened(uint256 indexed purchaseId, address initiator);
    event ProductDeactivated(uint256 indexed productId, address seller);

    constructor(address _vitrineCoreAddress, address _feeRecipient) Ownable(msg.sender) {
        vitrineCore = VitrineCore(_vitrineCoreAddress);
        feeRecipient = _feeRecipient;
    }
    
    // --- FUNÇÕES PRINCIPAIS DO FLUXO ---

    function listProduct(
        address _deliverer, 
        string calldata _metadataFID,
        uint256 _price, 
        uint256 _creatorCommissionBps
    ) external {
        require(bytes(_metadataFID).length > 0, "Metadata FID required");
        require(_price > 0, "Price must be greater than 0");
        require(_creatorCommissionBps <= 5000, "Commission too high"); // Max 50%
        
        _productCounter++;
        products[_productCounter] = Product({
            id: _productCounter,
            seller: msg.sender,
            deliverer: _deliverer,
            metadataFID: _metadataFID,
            price: _price,
            creatorCommissionBps: _creatorCommissionBps,
            active: true,
            createdAt: block.timestamp
        });
        
        emit ProductListed(_productCounter, msg.sender, _price, _metadataFID);
    }

    function purchaseProduct(uint256 _productId, address _creator) external payable {
        Product storage product = products[_productId];
        require(product.active, "Product not active");
        require(product.seller != msg.sender, "Cannot buy own product");
        require(msg.value == product.price, "Incorrect payment amount");

        _purchaseCounter++;
        
        purchases[_purchaseCounter] = EscrowedPurchase({
            buyer: msg.sender,
            seller: product.seller,
            creator: _creator,
            deliverer: product.deliverer,
            productId: _productId,
            price: product.price,
            creatorCommissionBps: product.creatorCommissionBps,
            releaseTimestamp: 0,
            inspectionTimestamp: 0,
            status: PurchaseStatus.Pending
        });
        
        emit PurchaseInitiated(_purchaseCounter, _productId, msg.sender);
    }

    function confirmDelivery(uint256 _purchaseId) external {
        EscrowedPurchase storage purchase = purchases[_purchaseId];
        require(msg.sender == purchase.deliverer, "Only deliverer can confirm");
        require(purchase.status == PurchaseStatus.Pending, "Purchase not pending delivery");

        purchase.status = PurchaseStatus.DeliveryConfirmed;
        purchase.releaseTimestamp = block.timestamp + 7 days;
        emit DeliveryConfirmed(_purchaseId, msg.sender);
    }

    function finalizePurchase(uint256 _purchaseId) external nonReentrant {
        EscrowedPurchase storage purchase = purchases[_purchaseId];
        require(purchase.status == PurchaseStatus.DeliveryConfirmed, "Purchase not in valid state");
        require(block.timestamp >= purchase.releaseTimestamp || msg.sender == purchase.buyer, "Dispute window still open");

        purchase.status = PurchaseStatus.Completed;
        _distributeFunds(purchase);

        // Atualizar reputações
        vitrineCore.updateReputation(purchase.seller, "SELLER", 10);
        vitrineCore.updateReputation(purchase.buyer, "BUYER", 5);
        if (purchase.creator != address(0)) {
            vitrineCore.updateReputation(purchase.creator, "CREATOR", 8);
        }
        
        emit PurchaseCompleted(_purchaseId);
    }

    function requestReturn(uint256 _purchaseId) external {
        EscrowedPurchase storage purchase = purchases[_purchaseId];
        require(msg.sender == purchase.buyer, "Only buyer can request return");
        require(purchase.status == PurchaseStatus.DeliveryConfirmed, "Purchase not in valid state");
        require(block.timestamp < purchase.releaseTimestamp, "Return window closed");

        purchase.status = PurchaseStatus.ReturnRequested;
    }

    function confirmReturnReceipt(uint256 _purchaseId) external {
        EscrowedPurchase storage purchase = purchases[_purchaseId];
        require(msg.sender == purchase.seller, "Only seller can confirm return");
        require(purchase.status == PurchaseStatus.ReturnRequested, "Return not requested");

        purchase.status = PurchaseStatus.ReturnReceived;
        purchase.inspectionTimestamp = block.timestamp + 3 days;
    }

    function approveReturn(uint256 _purchaseId) external nonReentrant {
        EscrowedPurchase storage purchase = purchases[_purchaseId];
        require(purchase.status == PurchaseStatus.ReturnReceived, "Return not in inspection");
        require(block.timestamp >= purchase.inspectionTimestamp || msg.sender == purchase.seller, "Inspection window still open");
        
        _processRefund(_purchaseId, purchase);
    }

    function openDispute(uint256 _purchaseId) external {
        EscrowedPurchase storage purchase = purchases[_purchaseId];
        bool isBuyer = msg.sender == purchase.buyer;
        bool isSeller = msg.sender == purchase.seller;
        require(isBuyer || isSeller, "Only buyer or seller can open dispute");
        require(purchase.status == PurchaseStatus.DeliveryConfirmed || 
                purchase.status == PurchaseStatus.ReturnReceived, "Invalid state for dispute");
        
        emit DisputeOpened(_purchaseId, msg.sender);
    }

    function resolveDispute(uint256 _purchaseId, address _winner) external onlyOwner nonReentrant {
        EscrowedPurchase storage purchase = purchases[_purchaseId];
        require(purchase.status == PurchaseStatus.DeliveryConfirmed || 
                purchase.status == PurchaseStatus.ReturnReceived, "Invalid state for dispute");

        if (_winner == purchase.buyer) {
            _processRefund(_purchaseId, purchase);
            vitrineCore.updateReputation(purchase.seller, "SELLER", -20);
        } else if (_winner == purchase.seller) {
            purchase.status = PurchaseStatus.Completed;
            _distributeFunds(purchase);
            vitrineCore.updateReputation(purchase.buyer, "BUYER", -15);
        } else {
            revert("Invalid winner address");
        }
    }

    function deactivateProduct(uint256 _productId) external {
        Product storage product = products[_productId];
        require(msg.sender == product.seller || msg.sender == owner(), "Not authorized");
        require(product.active, "Product already inactive");
        
        product.active = false;
        emit ProductDeactivated(_productId, product.seller);
    }

    // --- FUNÇÕES INTERNAS ---

    function _distributeFunds(EscrowedPurchase memory _purchase) internal {
        uint256 remainingAmount = _purchase.price;
        
        // Taxa da plataforma
        uint256 platformFee = (remainingAmount * platformFeeBps) / 10000;
        if (platformFee > 0) {
            payable(feeRecipient).transfer(platformFee);
            remainingAmount -= platformFee;
        }
        
        // Comissão do criador
        if (_purchase.creator != address(0) && _purchase.creatorCommissionBps > 0) {
            uint256 creatorAmount = (_purchase.price * _purchase.creatorCommissionBps) / 10000;
            if (creatorAmount > 0) {
                payable(_purchase.creator).transfer(creatorAmount);
                remainingAmount -= creatorAmount;
            }
        }

        // Restante para o vendedor
        if (remainingAmount > 0) {
            payable(_purchase.seller).transfer(remainingAmount);
        }
    }

    function _processRefund(uint256 _purchaseId, EscrowedPurchase storage _purchase) internal {
        _purchase.status = PurchaseStatus.Refunded;
        payable(_purchase.buyer).transfer(_purchase.price);
        vitrineCore.recordReturn(_purchase.buyer, _purchase.seller);
        emit PurchaseRefunded(_purchaseId);
    }

    // --- FUNÇÕES DE LEITURA ---
    
    function getProduct(uint256 _productId) external view returns (Product memory) {
        require(_productId > 0 && _productId <= _productCounter, "Product not found");
        return products[_productId];
    }
    
    function getPurchase(uint256 _purchaseId) external view returns (EscrowedPurchase memory) {
        require(_purchaseId > 0 && _purchaseId <= _purchaseCounter, "Purchase not found");
        return purchases[_purchaseId];
    }
    
    function getProductCounter() external view returns (uint256) {
        return _productCounter;
    }

    function getPurchaseCounter() external view returns (uint256) {
        return _purchaseCounter;
    }

    function getProductsBySeller(address _seller) external view returns (uint256[] memory) {
        uint256[] memory sellerProducts = new uint256[](_productCounter);
        uint256 count = 0;
        
        for (uint256 i = 1; i <= _productCounter; i++) {
            if (products[i].seller == _seller && products[i].active) {
                sellerProducts[count] = i;
                count++;
            }
        }
        
        // Redimensionar array
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = sellerProducts[i];
        }
        
        return result;
    }

    function getPurchasesByBuyer(address _buyer) external view returns (uint256[] memory) {
        uint256[] memory buyerPurchases = new uint256[](_purchaseCounter);
        uint256 count = 0;
        
        for (uint256 i = 1; i <= _purchaseCounter; i++) {
            if (purchases[i].buyer == _buyer) {
                buyerPurchases[count] = i;
                count++;
            }
        }
        
        // Redimensionar array
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = buyerPurchases[i];
        }
        
        return result;
    }

    function getActiveProducts(uint256 _limit, uint256 _offset) external view returns (uint256[] memory, uint256) {
        uint256[] memory activeProducts = new uint256[](_limit);
        uint256 count = 0;
        uint256 processed = 0;
        
        for (uint256 i = 1; i <= _productCounter && count < _limit; i++) {
            if (products[i].active) {
                if (processed >= _offset) {
                    activeProducts[count] = i;
                    count++;
                }
                processed++;
            }
        }
        
        // Redimensionar array
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = activeProducts[i];
        }
        
        return (result, processed); // Retorna produtos e total de ativos
    }

    // --- FUNÇÕES ADMIN ---
    
    function setPlatformFee(uint256 _newFeeBps) external onlyOwner {
        require(_newFeeBps <= 1000, "Fee too high"); // Max 10%
        platformFeeBps = _newFeeBps;
    }
    
    function setFeeRecipient(address _newRecipient) external onlyOwner {
        require(_newRecipient != address(0), "Invalid address");
        feeRecipient = _newRecipient;
    }

    function setVitrineCore(address _newVitrineCore) external onlyOwner {
        require(_newVitrineCore != address(0), "Invalid address");
        vitrineCore = VitrineCore(_newVitrineCore);
    }

    // --- FUNÇÃO DE EMERGÊNCIA ---
    function emergencyWithdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    // --- FUNÇÃO PARA RECEBER ETHER ---
    receive() external payable {}
}
