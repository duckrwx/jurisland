// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title VitrineCore
 * @dev Sistema de reputação para marketplace com melhorias de segurança e eficiência
 */
contract VitrineCore {

    address public owner;
    address public marketplaceContract;

    // Constantes para roles - mais eficiente que string comparison
    bytes32 private constant BUYER_ROLE = keccak256("BUYER");
    bytes32 private constant SELLER_ROLE = keccak256("SELLER");
    bytes32 private constant CREATOR_ROLE = keccak256("CREATOR");

    // Constantes para configuração
    uint256 private constant INITIAL_REPUTATION = 10;
    uint256 private constant BUYER_PENALTY_THRESHOLD = 10;
    uint256 private constant SELLER_PENALTY_THRESHOLD = 5;
    uint256 private constant BUYER_PENALTY_POINTS = 10;
    uint256 private constant SELLER_PENALTY_POINTS = 15;
    uint256 private constant MAX_REPUTATION = 1000; // Limite máximo de reputação

    struct UserData {
        bytes32 personaHash;
        uint256 buyerReputation;
        uint256 sellerReputation;
        uint256 creatorReputation;
        uint256 sellerReturnCount;
        uint256 buyerReturnCount;
        bool exists;
    }

    mapping(address => UserData) private users;

    event PersonaRegistered(address indexed user, bytes32 personaHash);
    event ReputationUpdated(address indexed user, string role, uint256 newReputation);
    event MarketplaceContractSet(address indexed marketplace);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    error NotOwner();
    error NotMarketplace();
    error InvalidAddress();
    error UserNotExists();
    error InvalidRole();
    error ReputationOverflow();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyMarketplace() {
        if (msg.sender != marketplaceContract) revert NotMarketplace();
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    // --- FUNÇÕES DE ADMINISTRAÇÃO ---
    
    function setMarketplaceContract(address _marketplaceAddress) external onlyOwner {
        if (_marketplaceAddress == address(0)) revert InvalidAddress();
        marketplaceContract = _marketplaceAddress;
        emit MarketplaceContractSet(_marketplaceAddress);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert InvalidAddress();
        address oldOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }

    // --- FUNÇÕES DE REGISTRO ---

    function registerPersona(bytes32 personaHash) external {
        UserData storage user = users[msg.sender];
        if (!user.exists) {
            user.exists = true;
            user.buyerReputation = INITIAL_REPUTATION;
            user.sellerReputation = INITIAL_REPUTATION;
            user.creatorReputation = INITIAL_REPUTATION;
        }
        user.personaHash = personaHash;
        emit PersonaRegistered(msg.sender, personaHash);
    }

    // --- FUNÇÕES DE REPUTAÇÃO (PROTEGIDAS) ---

    function updateReputation(address _user, string calldata _role, int256 _points) external onlyMarketplace {
        if (!users[_user].exists) revert UserNotExists();
        
        bytes32 roleHash = keccak256(bytes(_role));
        
        if (roleHash == BUYER_ROLE) {
            users[_user].buyerReputation = _applyPoints(users[_user].buyerReputation, _points);
            emit ReputationUpdated(_user, "BUYER", users[_user].buyerReputation);
        } else if (roleHash == SELLER_ROLE) {
            users[_user].sellerReputation = _applyPoints(users[_user].sellerReputation, _points);
            emit ReputationUpdated(_user, "SELLER", users[_user].sellerReputation);
        } else if (roleHash == CREATOR_ROLE) {
            users[_user].creatorReputation = _applyPoints(users[_user].creatorReputation, _points);
            emit ReputationUpdated(_user, "CREATOR", users[_user].creatorReputation);
        } else {
            revert InvalidRole();
        }
    }

    function recordReturn(address _buyer, address _seller) external onlyMarketplace {
        // Registra retorno para o comprador
        if (users[_buyer].exists) {
            users[_buyer].buyerReturnCount++;
            if (users[_buyer].buyerReturnCount % BUYER_PENALTY_THRESHOLD == 0) {
                users[_buyer].buyerReputation = _applyPoints(
                    users[_buyer].buyerReputation, 
                    -int256(BUYER_PENALTY_POINTS)
                );
                emit ReputationUpdated(_buyer, "BUYER", users[_buyer].buyerReputation);
            }
        }

        // Registra retorno para o vendedor
        if (users[_seller].exists) {
            users[_seller].sellerReturnCount++;
            if (users[_seller].sellerReturnCount % SELLER_PENALTY_THRESHOLD == 0) {
                users[_seller].sellerReputation = _applyPoints(
                    users[_seller].sellerReputation, 
                    -int256(SELLER_PENALTY_POINTS)
                );
                emit ReputationUpdated(_seller, "SELLER", users[_seller].sellerReputation);
            }
        }
    }

    // --- FUNÇÕES DE LEITURA ---

    function getUserReputations(address _user) external view returns (uint256, uint256, uint256) {
        return (
            users[_user].buyerReputation, 
            users[_user].sellerReputation, 
            users[_user].creatorReputation
        );
    }

    function getUserData(address _user) external view returns (
        bytes32 personaHash,
        uint256 buyerReputation,
        uint256 sellerReputation,
        uint256 creatorReputation,
        uint256 sellerReturnCount,
        uint256 buyerReturnCount,
        bool exists
    ) {
        UserData memory user = users[_user];
        return (
            user.personaHash,
            user.buyerReputation,
            user.sellerReputation,
            user.creatorReputation,
            user.sellerReturnCount,
            user.buyerReturnCount,
            user.exists
        );
    }

    function getPersonaHash(address _user) external view returns (bytes32) {
        return users[_user].personaHash;
    }

    function getReturnCounts(address _user) external view returns (uint256 buyerReturns, uint256 sellerReturns) {
        return (users[_user].buyerReturnCount, users[_user].sellerReturnCount);
    }

    function userExists(address _user) external view returns (bool) {
        return users[_user].exists;
    }

    // --- FUNÇÕES INTERNAS ---

    function _applyPoints(uint256 _currentReputation, int256 _points) internal pure returns (uint256) {
        if (_points < 0) {
            uint256 absPoints = uint256(-_points);
            if (_currentReputation <= absPoints) { 
                return 0; 
            }
            return _currentReputation - absPoints;
        } else {
            uint256 newReputation = _currentReputation + uint256(_points);
            // Protege contra overflow e limita reputação máxima
            if (newReputation > MAX_REPUTATION) {
                return MAX_REPUTATION;
            }
            return newReputation;
        }
    }
}
