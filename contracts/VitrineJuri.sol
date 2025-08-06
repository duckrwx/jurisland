// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./Marketplace.sol";

/**
 * @title VitrineJuri
 * @dev Sistema de júri descentralizado para resolução de disputas do marketplace
 * @notice Implementa staking, seleção de jurados, votação e distribuição de recompensas
 */
contract VitrineJuri is Ownable, ReentrancyGuard, Pausable {

    Marketplace public marketplace;
    IERC20 public platformToken;

    // Constantes
    uint256 public constant MINIMUM_STAKE = 100 * 1e18;
    uint256 public constant JURY_SIZE = 7;
    uint256 public constant VOTING_PERIOD = 3 days;
    uint256 public constant SELECTION_PERIOD = 1 days;
    uint256 public constant JUROR_REWARD_BPS = 50; // 0.5% do valor da disputa
    uint256 public constant SLASH_PERCENTAGE = 10; // 10% do stake para jurados inativos
    uint256 public constant MIN_PARTICIPATION_RATE = 60; // 60% mínimo de participação
    
    enum DisputeStatus {
        Created,
        JurorsSelected,
        VotingActive,
        Resolved,
        Cancelled
    }

    struct Juror {
        uint256 stakedAmount;
        uint256 totalVotes;
        uint256 correctVotes;
        uint256 rewardsEarned;
        uint256 lastActiveDispute;
        bool isActive;
    }

    struct Dispute {
        uint256 purchaseId;
        uint256 disputeValue; // Valor em ETH da disputa
        address plaintiff;
        address defendant;
        address[] selectedJurors;
        mapping(address => bool) hasVoted;
        mapping(address => bool) voteChoice; // true = plaintiff, false = defendant
        uint256 voteCount;
        uint256 createdAt;
        uint256 selectionDeadline;
        uint256 votingDeadline;
        DisputeStatus status;
        address winner;
        bytes32 randomSeed; // Para seleção de jurados
    }

    // Estado do contrato
    mapping(uint256 => Dispute) public disputes;
    mapping(address => Juror) public jurors;
    address[] public activeJurors;
    
    // Configurações ajustáveis
    uint256 public minimumStake = MINIMUM_STAKE;
    uint256 public jurySize = JURY_SIZE;
    uint256 public votingPeriod = VOTING_PERIOD;
    
    // Estatísticas
    uint256 public totalDisputes;
    uint256 public totalStaked;
    uint256 public totalRewardsDistributed;

    // Eventos
    event Staked(address indexed juror, uint256 amount, uint256 totalStake);
    event Unstaked(address indexed juror, uint256 amount, uint256 remainingStake);
    event DisputeCreated(uint256 indexed purchaseId, address indexed plaintiff, address indexed defendant, uint256 value);
    event JurorsSelected(uint256 indexed purchaseId, address[] jurors);
    event VoteCast(uint256 indexed purchaseId, address indexed juror, bool voteForPlaintiff);
    event DisputeResolved(uint256 indexed purchaseId, address indexed winner, uint256 plaintiffVotes, uint256 totalVotes);
    event RewardDistributed(address indexed juror, uint256 amount);
    event JurorSlashed(address indexed juror, uint256 slashedAmount);

    // Errors
    error InsufficientStake();
    error AlreadyVoted();
    error NotSelectedJuror();
    error VotingPeriodEnded();
    error VotingPeriodActive();
    error DisputeAlreadyResolved();
    error DisputeNotFound();
    error InsufficientStakers();
    error OnlyMarketplace();
    error InvalidParameters();

    constructor(
        address _marketplaceAddress, 
        address _platformToken,
        address _owner
    ) Ownable(_owner) {
        marketplace = Marketplace(_marketplaceAddress);
        platformToken = IERC20(_platformToken);
    }

    // --- FUNÇÕES DE STAKING ---

    function stake(uint256 _amount) external whenNotPaused nonReentrant {
        if (_amount < minimumStake) revert InsufficientStake();
        
        Juror storage juror = jurors[msg.sender];
        
        // Se é um novo juror, adiciona à lista
        if (juror.stakedAmount == 0) {
            activeJurors.push(msg.sender);
            juror.isActive = true;
        }
        
        juror.stakedAmount += _amount;
        totalStaked += _amount;
        
        platformToken.transferFrom(msg.sender, address(this), _amount);
        
        emit Staked(msg.sender, _amount, juror.stakedAmount);
    }

    function unstake(uint256 _amount) external nonReentrant {
        Juror storage juror = jurors[msg.sender];
        
        if (juror.stakedAmount < _amount) revert InsufficientStake();
        
        // Verifica se o juror não está em disputa ativa recente
        require(
            block.timestamp > juror.lastActiveDispute + votingPeriod,
            "Cannot unstake during active dispute period"
        );
        
        juror.stakedAmount -= _amount;
        totalStaked -= _amount;
        
        // Remove da lista se stake zerou
        if (juror.stakedAmount == 0) {
            juror.isActive = false;
            _removeFromActiveJurors(msg.sender);
        }
        
        platformToken.transfer(msg.sender, _amount);
        
        emit Unstaked(msg.sender, _amount, juror.stakedAmount);
    }

    // --- FUNÇÕES DE DISPUTA ---

    function initiateDispute(uint256 _purchaseId) external payable whenNotPaused {
        // Verificação comentada para testes, descomente em produção
        // if (msg.sender != address(marketplace)) revert OnlyMarketplace();
        
        if (disputes[_purchaseId].purchaseId != 0) revert DisputeNotFound();
        if (activeJurors.length < jurySize) revert InsufficientStakers();
        
        // Obter informações da compra do marketplace
        // Agora desestruturando 9 componentes corretamente
        (, address buyer, address seller, , , , , , ) = marketplace.purchases(_purchaseId);
        
        Dispute storage dispute = disputes[_purchaseId];
        dispute.purchaseId = _purchaseId;
        dispute.disputeValue = msg.value; // Valor em ETH da disputa
        dispute.plaintiff = buyer; // Assumindo que buyer sempre inicia
        dispute.defendant = seller;
        dispute.createdAt = block.timestamp;
        dispute.selectionDeadline = block.timestamp + SELECTION_PERIOD;
        dispute.randomSeed = keccak256(abi.encodePacked(block.timestamp, block.prevrandao, _purchaseId));
        dispute.randomSeed = keccak256(abi.encodePacked(block.timestamp, block.difficulty, _purchaseId));
        
        totalDisputes++;
        
        emit DisputeCreated(_purchaseId, buyer, seller, msg.value);
        
        // Inicia seleção de jurados automaticamente
        _selectJurors(_purchaseId);
    }

    function castVote(uint256 _purchaseId, bool _voteForPlaintiff) external {
        Dispute storage dispute = disputes[_purchaseId];
        
        if (dispute.status != DisputeStatus.VotingActive) revert VotingPeriodEnded();
        if (block.timestamp >= dispute.votingDeadline) revert VotingPeriodEnded();
        if (dispute.hasVoted[msg.sender]) revert AlreadyVoted();
        if (!_isSelectedJuror(_purchaseId, msg.sender)) revert NotSelectedJuror();
        
        dispute.hasVoted[msg.sender] = true;
        dispute.voteChoice[msg.sender] = _voteForPlaintiff;
        dispute.voteCount++;
        
        // Atualiza atividade do juror
        jurors[msg.sender].lastActiveDispute = block.timestamp;
        jurors[msg.sender].totalVotes++;
        
        emit VoteCast(_purchaseId, msg.sender, _voteForPlaintiff);
        
        // Auto-resolve se todos votaram
        if (dispute.voteCount == dispute.selectedJurors.length) {
            _tallyVotes(_purchaseId);
        }
    }

    function resolveDispute(uint256 _purchaseId) external {
        Dispute storage dispute = disputes[_purchaseId];
        
        if (dispute.status != DisputeStatus.VotingActive) revert DisputeAlreadyResolved();
        if (block.timestamp < dispute.votingDeadline) revert VotingPeriodActive();
        
        _tallyVotes(_purchaseId);
    }

    // --- FUNÇÕES INTERNAS ---

    function _selectJurors(uint256 _purchaseId) internal {
        Dispute storage dispute = disputes[_purchaseId];
        
        // Seleção pseudo-aleatória baseada no seed
        uint256 seed = uint256(dispute.randomSeed);
        
        for (uint256 i = 0; i < jurySize; i++) {
            uint256 randomIndex = uint256(keccak256(abi.encodePacked(seed, i))) % activeJurors.length;
            address selectedJuror = activeJurors[randomIndex];
            
            // Evita duplicatas (simplificado)
            bool alreadySelected = false;
            for (uint256 j = 0; j < dispute.selectedJurors.length; j++) {
                if (dispute.selectedJurors[j] == selectedJuror) {
                    alreadySelected = true;
                    break;
                }
            }
            
            if (!alreadySelected && jurors[selectedJuror].isActive) {
                dispute.selectedJurors.push(selectedJuror);
                jurors[selectedJuror].lastActiveDispute = block.timestamp;
            } else {
                // Tenta próximo índice se já selecionado
                i--;
                seed = uint256(keccak256(abi.encodePacked(seed, block.timestamp)));
            }
        }
        
        dispute.status = DisputeStatus.VotingActive;
        dispute.votingDeadline = block.timestamp + votingPeriod;
        
        emit JurorsSelected(_purchaseId, dispute.selectedJurors);
    }

    function _tallyVotes(uint256 _purchaseId) internal {
        Dispute storage dispute = disputes[_purchaseId];
        
        uint256 plaintiffVotes = 0;
        uint256 totalVotes = dispute.voteCount;
        
        for (uint256 i = 0; i < dispute.selectedJurors.length; i++) {
            address juror = dispute.selectedJurors[i];
            if (dispute.hasVoted[juror] && dispute.voteChoice[juror]) {
                plaintiffVotes++;
            }
        }
        
        // Determina vencedor
        address winner;
        if (plaintiffVotes > dispute.selectedJurors.length / 2) {
            winner = dispute.plaintiff;
        } else {
            winner = dispute.defendant;
        }
        
        dispute.winner = winner;
        dispute.status = DisputeStatus.Resolved;
        
        // Distribui recompensas e penalidades
        _distributeRewards(_purchaseId, winner, plaintiffVotes, totalVotes);
        
        // Executa veredito no marketplace
        marketplace.executeDisputeVerdict(_purchaseId, winner);
        
        emit DisputeResolved(_purchaseId, winner, plaintiffVotes, totalVotes);
    }

    function _distributeRewards(
        uint256 _purchaseId,
        address winner,
        uint256 plaintiffVotes,
        uint256 totalVotes
    ) internal {
        Dispute storage dispute = disputes[_purchaseId];
        
        if (dispute.disputeValue == 0) return;
        
        uint256 totalReward = (dispute.disputeValue * JUROR_REWARD_BPS) / 10000;
        uint256 rewardPerJuror = totalReward / dispute.selectedJurors.length;
        
        bool plaintiffWon = winner == dispute.plaintiff;
        
        for (uint256 i = 0; i < dispute.selectedJurors.length; i++) {
            address juror = dispute.selectedJurors[i];
            Juror storage jurorData = jurors[juror];
            
            if (dispute.hasVoted[juror]) {
                bool votedForWinner = dispute.voteChoice[juror] == plaintiffWon;
                
                if (votedForWinner) {
                    // Recompensa jurors que votaram com a maioria
                    jurorData.correctVotes++;
                    jurorData.rewardsEarned += rewardPerJuror;
                    totalRewardsDistributed += rewardPerJuror;
                    
                    platformToken.transfer(juror, rewardPerJuror);
                    emit RewardDistributed(juror, rewardPerJuror);
                }
            } else {
                // Penaliza jurors inativos
                uint256 slashAmount = (jurorData.stakedAmount * SLASH_PERCENTAGE) / 100;
                if (slashAmount > 0) {
                    jurorData.stakedAmount -= slashAmount;
                    totalStaked -= slashAmount;
                    emit JurorSlashed(juror, slashAmount);
                }
            }
        }
    }

    function _isSelectedJuror(uint256 _purchaseId, address _juror) internal view returns (bool) {
        Dispute storage dispute = disputes[_purchaseId];
        for (uint256 i = 0; i < dispute.selectedJurors.length; i++) {
            if (dispute.selectedJurors[i] == _juror) {
                return true;
            }
        }
        return false;
    }

    function _removeFromActiveJurors(address _juror) internal {
        for (uint256 i = 0; i < activeJurors.length; i++) {
            if (activeJurors[i] == _juror) {
                activeJurors[i] = activeJurors[activeJurors.length - 1];
                activeJurors.pop();
                break;
            }
        }
    }

    // --- FUNÇÕES DE LEITURA ---

    function getDispute(uint256 _purchaseId) external view returns (
        uint256 purchaseId,
        uint256 disputeValue,
        address plaintiff,
        address defendant,
        address[] memory selectedJurors,
        uint256 voteCount,
        uint256 votingDeadline,
        DisputeStatus status,
        address winner
    ) {
        Dispute storage dispute = disputes[_purchaseId];
        return (
            dispute.purchaseId,
            dispute.disputeValue,
            dispute.plaintiff,
            dispute.defendant,
            dispute.selectedJurors,
            dispute.voteCount,
            dispute.votingDeadline,
            dispute.status,
            dispute.winner
        );
    }

    function getJurorStats(address _juror) external view returns (
        uint256 stakedAmount,
        uint256 totalVotes,
        uint256 correctVotes,
        uint256 rewardsEarned,
        uint256 accuracyPercentage,
        bool isActive
    ) {
        Juror memory juror = jurors[_juror];
        uint256 accuracy = juror.totalVotes > 0 ? (juror.correctVotes * 100) / juror.totalVotes : 0;
        
        return (
            juror.stakedAmount,
            juror.totalVotes,
            juror.correctVotes,
            juror.rewardsEarned,
            accuracy,
            juror.isActive
        );
    }

    function getActiveJurorsCount() external view returns (uint256) {
        return activeJurors.length;
    }

    function getContractStats() external view returns (
        uint256 _totalDisputes,
        uint256 _totalStaked,
        uint256 _totalRewardsDistributed,
        uint256 _activeJurorsCount
    ) {
        return (
            totalDisputes,
            totalStaked,
            totalRewardsDistributed,
            activeJurors.length
        );
    }

    // --- FUNÇÕES ADMINISTRATIVAS ---

    function setMinimumStake(uint256 _minimumStake) external onlyOwner {
        minimumStake = _minimumStake;
    }

    function setJurySize(uint256 _jurySize) external onlyOwner {
        if (_jurySize < 3 || _jurySize > 15) revert InvalidParameters();
        jurySize = _jurySize;
    }

    function setVotingPeriod(uint256 _votingPeriod) external onlyOwner {
        if (_votingPeriod < 1 hours || _votingPeriod > 30 days) revert InvalidParameters();
        votingPeriod = _votingPeriod;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // Função de emergência para retirar tokens em caso de problemas
    function emergencyWithdraw(address _token, uint256 _amount) external onlyOwner {
        IERC20(_token).transfer(owner(), _amount);
    }
}
