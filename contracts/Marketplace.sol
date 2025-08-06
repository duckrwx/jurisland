// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./VitrineCore.sol";

contract Marketplace is Ownable, ReentrancyGuard {

    VitrineCore public vitrineCore;

    enum PurchaseStatus {
        Pending,        // Aguardando entrega
        DeliveryConfirmed, // Entregue, janela de 7 dias para disputa/devolução
        ReturnRequested, // Comprador pediu devolução
        ReturnReceived, // Vendedor recebeu devolução, janela de 3 dias para inspeção
        Completed,      // Venda finalizada com sucesso
        Refunded        // Dinheiro devolvido ao comprador
    }

    struct Product {
        uint256 id;
        address seller;
        address deliverer;
        uint256 price;
        uint256 creatorCommissionBps; // Em Basis Points (ex: 500 para 5%)
        bool active;
    }

    struct EscrowedPurchase {
        address buyer;
        address seller;
        address creator;
        address deliverer;
        uint256 price;
        uint256 creatorCommissionBps;
        uint256 releaseTimestamp;   // Prazo para finalizar ou disputar
        uint256 inspectionTimestamp; // Prazo para vendedor inspecionar devolução
        PurchaseStatus status;
    }

    uint256 public platformFeeBps = 250; // 2.5%
    address public feeRecipient;
    uint256 private _productCounter;

    mapping(uint256 => Product) public products;
    mapping(uint256 => EscrowedPurchase) public purchases;

    // --- Eventos ---
    event ProductListed(uint256 indexed productId, address indexed seller, uint256 price);
    event PurchaseInitiated(uint256 indexed purchaseId, uint256 indexed productId, address indexed buyer);
    event DeliveryConfirmed(uint256 indexed purchaseId, address deliverer);
    event PurchaseCompleted(uint256 indexed purchaseId);
    event PurchaseRefunded(uint256 indexed purchaseId);
    event DisputeOpened(uint256 indexed purchaseId, address initiator);

    constructor(address _vitrineCoreAddress, address _feeRecipient) Ownable(msg.sender) {
        vitrineCore = VitrineCore(_vitrineCoreAddress);
        feeRecipient = _feeRecipient;
    }
    
    // --- FUNÇÕES PRINCIPAIS DO FLUXO ---

    function listProduct(address _deliverer, uint256 _price, uint256 _creatorCommissionBps) external {
        _productCounter++;
        products[_productCounter] = Product({
            id: _productCounter,
            seller: msg.sender,
            deliverer: _deliverer,
            price: _price,
            creatorCommissionBps: _creatorCommissionBps,
            active: true
        });
        emit ProductListed(_productCounter, msg.sender, _price);
    }

    function purchaseProduct(uint256 _productId, address _creator) external payable {
        Product storage product = products[_productId];
        require(product.active, "Product not active");
        require(msg.value == product.price, "Incorrect payment amount");

        uint256 purchaseId = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, _productId)));
        
        purchases[purchaseId] = EscrowedPurchase({
            buyer: msg.sender,
            seller: product.seller,
            creator: _creator,
            deliverer: product.deliverer,
            price: product.price,
            creatorCommissionBps: product.creatorCommissionBps,
            releaseTimestamp: 0, // Inicia em 0, definido na confirmação da entrega
            inspectionTimestamp: 0,
            status: PurchaseStatus.Pending
        });
        emit PurchaseInitiated(purchaseId, _productId, msg.sender);
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
        require(block.timestamp >= purchase.releaseTimestamp, "Dispute window still open");

        purchase.status = PurchaseStatus.Completed;
        _distributeFunds(purchase);

        // Atualiza reputações para o caminho feliz
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
        require(block.timestamp >= purchase.inspectionTimestamp, "Inspection window still open");
        
        _processRefund(_purchaseId, purchase);
    }

    // --- DISPUTE SIMPLIFICADO (SEM JÚRI) ---
    function openDispute(uint256 _purchaseId) external {
        EscrowedPurchase storage purchase = purchases[_purchaseId];
        bool isBuyer = msg.sender == purchase.buyer;
        bool isSeller = msg.sender == purchase.seller;
        require(isBuyer || isSeller, "Only buyer or seller can open dispute");
        
        emit DisputeOpened(_purchaseId, msg.sender);
        
        // Por enquanto, disputas ficam abertas para resolução manual
        // TODO: Implementar sistema de júri futuramente
    }

    // --- FUNÇÃO ADMIN PARA RESOLVER DISPUTAS (TEMPORÁRIA) ---
    function resolveDispute(uint256 _purchaseId, address _winner) external onlyOwner nonReentrant {
        EscrowedPurchase storage purchase = purchases[_purchaseId];
        require(purchase.status == PurchaseStatus.DeliveryConfirmed || 
                purchase.status == PurchaseStatus.ReturnReceived, "Invalid state for dispute");

        if (_winner == purchase.buyer) {
            _processRefund(_purchaseId, purchase);
            // Penalidade leve para vendedor
            vitrineCore.updateReputation(purchase.seller, "SELLER", -20);
        } else if (_winner == purchase.seller) {
            purchase.status = PurchaseStatus.Completed;
            _distributeFunds(purchase);
            // Penalidade leve para comprador
            vitrineCore.updateReputation(purchase.buyer, "BUYER", -15);
        }
    }

    // --- FUNÇÕES INTERNAS ---

    function _distributeFunds(EscrowedPurchase memory _purchase) internal {
        uint256 remainingAmount = _purchase.price;
        
        uint256 platformFee = (remainingAmount * platformFeeBps) / 10000;
        payable(feeRecipient).transfer(platformFee);
        remainingAmount -= platformFee;
        
        if (_purchase.creator != address(0) && _purchase.creatorCommissionBps > 0) {
            uint256 creatorAmount = (_purchase.price * _purchase.creatorCommissionBps) / 10000;
            payable(_purchase.creator).transfer(creatorAmount);
            remainingAmount -= creatorAmount;
        }

        payable(_purchase.seller).transfer(remainingAmount);
    }

    function _processRefund(uint256 _purchaseId, EscrowedPurchase storage _purchase) internal {
        _purchase.status = PurchaseStatus.Refunded;
        payable(_purchase.buyer).transfer(_purchase.price);
        vitrineCore.recordReturn(_purchase.buyer, _purchase.seller);
        emit PurchaseRefunded(_purchaseId);
    }

    // --- FUNÇÕES DE LEITURA ---
    
    function getProduct(uint256 _productId) external view returns (Product memory) {
        return products[_productId];
    }
    
    function getPurchase(uint256 _purchaseId) external view returns (EscrowedPurchase memory) {
        return purchases[_purchaseId];
    }
    
    function getProductCounter() external view returns (uint256) {
        return _productCounter;
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
}
