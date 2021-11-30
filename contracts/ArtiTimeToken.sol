// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";

contract ArtiTimeToken is Context, IERC20, Ownable {
    using SafeMath for uint256;
    using Address for address;

    mapping (address => uint256) private _rOwned;
    mapping (address => uint256) private _tOwned;
    mapping (address => mapping (address => uint256)) private _allowances;

    mapping (address => bool) private _isExcludedFromFee;
    mapping (address => bool) private _isExcluded;
    address[] private _excluded;

    uint256 private constant MAX = ~uint256(0);
    uint256 private _tTotal = 1_000_000_000 ether;
    uint256 private _rTotal = (MAX - (MAX % _tTotal));
    uint256 private _tFeeTotal;

    string private _name = "Artitime";
    string private _symbol = "ARTI";
    uint8 private _decimals = 18;

    uint256 public _taxFee;
    uint256 private _previousTaxFee;

    uint256 public _liquidityFee;
    uint256 private _previousLiquidityFee;

    uint256 public _burnFee;
    uint256 private _previousBurnFee;

    address public _developersAddress;
    uint256 public _developersReward;
    uint256 private _previousDevelopersReward;

    address public _marketingAddress;
    uint256 public _marketingReward;
    uint256 private _previousMarketingReward;

    IUniswapV2Router02 public uniswapV2Router;
    address public uniswapV2Pair;

    bool inSwapAndLiquify;
    bool public swapAndLiquifyEnabled;

    uint256 public maxTxAmount = 5_000_000 ether;
    uint256 private numTokensSellToAddToLiquidity = 500_000 ether;

    event MinTokensBeforeSwapUpdated(uint256 minTokensBeforeSwap);
    event SwapAndLiquifyEnabledUpdated(bool enabled);
    event SwapAndLiquify(
        uint256 tokensSwapped,
        uint256 ethReceived,
        uint256 tokensIntoLiqudity
    );

    modifier lockTheSwap {
        inSwapAndLiquify = true;
        _;
        inSwapAndLiquify = false;
    }

    constructor() {
        _rOwned[_msgSender()] = _rTotal;
        emit Transfer(address(0), _msgSender(), _tTotal);
        _isExcludedFromFee[address(this)] = true;
    }

    struct TVal {
        uint256 amount;
        uint256 transferAmount;
        uint256 fee;
        uint256 liquidity;
        uint256 developers;
        uint256 marketing;
        uint256 burn;
    }

    struct RVal {
        uint256 amount;
        uint256 transferAmount;
        uint256 fee;
        uint256 liquidity;
        uint256 developers;
        uint256 marketing;
        uint256 burn;
    }

    function name() public view returns (string memory) {
        return _name;
    }

    function symbol() public view returns (string memory) {
        return _symbol;
    }

    function decimals() public view returns (uint8) {
        return _decimals;
    }

    function totalSupply() public view override returns (uint256) {
        return _tTotal;
    }

    function balanceOf(address account) public view override returns (uint256) {
        if (_isExcluded[account]) return _tOwned[account];
        else return tokenFromReflection(_rOwned[account]);
    }

    function transfer(address recipient, uint256 amount) public override returns (bool) {
        _transfer(_msgSender(), recipient, amount);
        return true;
    }

    function allowance(address owner, address spender) public view override returns (uint256) {
        return _allowances[owner][spender];
    }

    function approve(address spender, uint256 amount) public override returns (bool) {
        _approve(_msgSender(), spender, amount);
        return true;
    }

    function transferFrom(address sender, address recipient, uint256 amount) public override returns (bool) {
        _transfer(sender, recipient, amount);
        _approve(sender, _msgSender(), _allowances[sender][_msgSender()].sub(amount, "ERC20: transfer amount exceeds allowance"));
        return true;
    }

    function increaseAllowance(address spender, uint256 addedValue) public virtual returns (bool) {
        _approve(_msgSender(), spender, _allowances[_msgSender()][spender].add(addedValue));
        return true;
    }

    function decreaseAllowance(address spender, uint256 subtractedValue) public virtual returns (bool) {
        _approve(_msgSender(), spender, _allowances[_msgSender()][spender].sub(subtractedValue, "ERC20: decreased allowance below zero"));
        return true;
    }

    function isExcludedFromReward(address account) public view returns (bool) {
        return _isExcluded[account];
    }

    function totalFees() public view returns (uint256) {
        return _tFeeTotal;
    }

    function deliver(uint256 tAmount) public {
        address sender = _msgSender();
        require(!_isExcluded[sender], "Excluded addresses cannot call this function");
        (RVal memory r,) = _getValues(tAmount);
        _rOwned[sender] = _rOwned[sender].sub(r.amount);
        _rTotal = _rTotal.sub(r.amount);
        _tFeeTotal = _tFeeTotal.add(tAmount);
    }

    function burn(address account, uint256 amount) public {
        require(account != address(0), "ERC20: burn from the zero address");
        require(_tOwned[account] >= amount, "ERC20: burn amount exceeds balance");
        require(amount <= maxTxAmount, "Burn amount exceeds the maxTxAmount");
        (RVal memory r, TVal memory t) = _getValues(amount);
        _decreaseBalance(account, t.amount, r.amount);
        _decreaseTotalSupply(t.amount, r.amount);
        emit Transfer(account, address(0), amount);
    }

    function reflectionFromToken(uint256 tAmount, bool deductTransferFee) public view returns(uint256) {
        require(tAmount <= _tTotal, "Amount must be less than supply");
        (RVal memory r,) = _getValues(tAmount);
        if (!deductTransferFee) {
            return r.amount;
        } else {
            return r.transferAmount;
        }
    }

    function tokenFromReflection(uint256 rAmount) public view returns(uint256) {
        require(rAmount <= _rTotal, "Amount must be less than total reflections");
        uint256 currentRate =  _getRate();
        return rAmount.div(currentRate);
    }

    function excludeFromReward(address account) public onlyOwner() {
        require(!_isExcluded[account], "Account is already excluded");
        if(_rOwned[account] > 0) {
            _tOwned[account] = tokenFromReflection(_rOwned[account]);
        }
        _isExcluded[account] = true;
        _excluded.push(account);
    }

    function includeInReward(address account) external onlyOwner() {
        require(_isExcluded[account], "Account is not excluded");
        for (uint256 i = 0; i < _excluded.length; i++) {
            if (_excluded[i] == account) {
                _excluded[i] = _excluded[_excluded.length - 1];
                _tOwned[account] = 0;
                _isExcluded[account] = false;
                _excluded.pop();
                break;
            }
        }
    }

    function excludeFromFee(address account) public onlyOwner {
        _isExcludedFromFee[account] = true;
    }

    function includeInFee(address account) public onlyOwner {
        _isExcludedFromFee[account] = false;
    }

    function setTaxFeePercent(uint256 taxFee) external onlyOwner() {
        _taxFee = taxFee;
    }

    function setLiquidityFeePercent(uint256 liquidityFee) external onlyOwner() {
        _liquidityFee = liquidityFee;
    }

    function setBurnFeePercent(uint256 burnFee) external onlyOwner() {
        _burnFee = burnFee;
    }

    function setDevelopersRewardPercent(uint256 developersReward) external onlyOwner() {
        _developersReward = developersReward;
    }

    function setDevelopersAddress(address developersAddress) external onlyOwner() {
        _developersAddress = developersAddress;
    }

    function setMarketingRewardPercent(uint256 marketingReward) external onlyOwner() {
        _marketingReward = marketingReward;
    }

    function setMarketingAddress(address marketingAddress) external onlyOwner() {
        _marketingAddress = marketingAddress;
    }

    function setMaxTxPercent(uint256 maxTxPercent) external onlyOwner() {
        maxTxAmount = _tTotal.mul(maxTxPercent).div(10**2);
    }

    function setSwapAndLiquifyEnabled(bool _enabled) public onlyOwner {
        swapAndLiquifyEnabled = _enabled;
        emit SwapAndLiquifyEnabledUpdated(_enabled);
    }

    function setUniswapRouter(address routerAddress) public onlyOwner {
        uniswapV2Router = IUniswapV2Router02(routerAddress);
    }

    function setUniswapPair(address uniswapPairAddress) public onlyOwner {
        uniswapV2Pair = uniswapPairAddress;
    }

    function removeAllFees() public onlyOwner {
        _removeAllFees();
    }

    function restoreAllFees() public onlyOwner {
        _restoreAllFees();
    }

    //to recieve ETH from uniswapV2Router when swaping
    receive() external payable {}

    function _reflectFee(uint256 rFee, uint256 tFee) private {
        _rTotal = _rTotal.sub(rFee);
        _tFeeTotal = _tFeeTotal.add(tFee);
    }

    function _getValues(uint256 tAmount) private view returns (RVal memory r, TVal memory t) {
        t = _getTValues(tAmount);
        r = _getRValues(t, _getRate());
    }

    function _getTValues(uint256 tAmount) private view returns (TVal memory t) {
        t.amount = tAmount;
        t.fee = calculateTaxFee(tAmount);
        t.liquidity = calculateLiquidityFee(tAmount);
        t.burn = calculateBurnFee(tAmount);
        t.developers = calculateDevelopersReward(tAmount);
        t.marketing = calculateMarketingReward(tAmount);
        t.transferAmount = t.amount.sub(t.fee).sub(t.liquidity).sub(t.burn).sub(t.developers).sub(t.marketing);
    }

    function _getRValues(TVal memory t, uint256 currentRate) private pure returns (RVal memory r) {
        r.amount = t.amount.mul(currentRate);
        r.fee = t.fee.mul(currentRate);
        r.liquidity = t.liquidity.mul(currentRate);
        r.burn = t.burn.mul(currentRate);
        r.developers = t.developers.mul(currentRate);
        r.marketing = t.marketing.mul(currentRate);
        r.transferAmount = r.amount.sub(r.fee).sub(r.liquidity).sub(r.burn).sub(r.developers).sub(r.marketing);
    }

    function _getRate() private view returns(uint256) {
        (uint256 rSupply, uint256 tSupply) = _getCurrentSupply();
        return rSupply.div(tSupply);
    }

    function _getCurrentSupply() private view returns(uint256, uint256) {
        uint256 rSupply = _rTotal;
        uint256 tSupply = _tTotal;
        for (uint256 i = 0; i < _excluded.length; i++) {
            if (_rOwned[_excluded[i]] > rSupply || _tOwned[_excluded[i]] > tSupply) return (_rTotal, _tTotal);
            rSupply = rSupply.sub(_rOwned[_excluded[i]]);
            tSupply = tSupply.sub(_tOwned[_excluded[i]]);
        }
        if (rSupply < _rTotal.div(_tTotal)) return (_rTotal, _tTotal);
        return (rSupply, tSupply);
    }

    function calculateTaxFee(uint256 _amount) private view returns (uint256) {
        return _amount.mul(_taxFee).div(10**2);
    }

    function calculateLiquidityFee(uint256 _amount) private view returns (uint256) {
        return _amount.mul(_liquidityFee).div(10**2);
    }

    function calculateBurnFee(uint256 _amount) private view returns (uint256) {
        return _amount.mul(_burnFee).div(10**2);
    }

    function calculateDevelopersReward(uint256 _amount) private view returns (uint256) {
        return _amount.mul(_developersReward).div(10**2);
    }

    function calculateMarketingReward(uint256 _amount) private view returns (uint256) {
        return _amount.mul(_marketingReward).div(10**2);
    }

    function _removeAllFees() private {
        if (_taxFee == 0 && _liquidityFee == 0 && _burnFee == 0 && _developersReward == 0 && _marketingReward == 0) return;

        _previousTaxFee = _taxFee;
        _previousLiquidityFee = _liquidityFee;
        _previousBurnFee = _burnFee;
        _previousDevelopersReward = _developersReward;
        _previousMarketingReward = _marketingReward;

        _taxFee = 0;
        _liquidityFee = 0;
        _burnFee = 0;
        _developersReward = 0;
        _marketingReward = 0;
    }

    function _restoreAllFees() private {
        _taxFee = _previousTaxFee;
        _liquidityFee = _previousLiquidityFee;
        _burnFee = _previousBurnFee;
        _developersReward = _previousDevelopersReward;
        _marketingReward = _previousMarketingReward;
    }

    function isExcludedFromFee(address account) public view returns(bool) {
        return _isExcludedFromFee[account];
    }

    function _approve(address owner, address spender, uint256 amount) private {
        require(owner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");
        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    function _transfer(address from, address to, uint256 amount) private {
        require(from != address(0), "ERC20: transfer from the zero address");
        require(to != address(0), "ERC20: transfer to the zero address");
        require(amount > 0, "Transfer amount must be greater than zero");
        if (from != owner() && to != owner()) {
            require(amount <= maxTxAmount, "Transfer amount exceeds the maxTxAmount");
        }

        // is the token balance of this contract address over the min number of
        // tokens that we need to initiate a swap + liquidity lock?
        // also, don't get caught in a circular liquidity event.
        // also, don't swap & liquify if sender is uniswap pair.
        uint256 contractTokenBalance = balanceOf(address(this));

        if (contractTokenBalance >= maxTxAmount) {
            contractTokenBalance = maxTxAmount;
        }

        bool overMinTokenBalance = contractTokenBalance >= numTokensSellToAddToLiquidity;
        if (overMinTokenBalance && !inSwapAndLiquify && from != uniswapV2Pair && swapAndLiquifyEnabled) {
            contractTokenBalance = numTokensSellToAddToLiquidity;
            swapAndLiquify(contractTokenBalance);
        }

        bool takeFee;

        if (!_isExcludedFromFee[from] && _isExcludedFromFee[to]){
            takeFee = true;
        }

        _tokenTransfer(from, to, amount, takeFee);
    }

    function swapAndLiquify(uint256 contractTokenBalance) private lockTheSwap {
        // split the contract balance into halves
        uint256 half = contractTokenBalance.div(2);
        uint256 otherHalf = contractTokenBalance.sub(half);

        // capture the contract's current ETH balance.
        // this is so that we can capture exactly the amount of ETH that the
        // swap creates, and not make the liquidity event include any ETH that
        // has been manually sent to the contract
        uint256 initialBalance = address(this).balance;

        // swap tokens for ETH
        swapTokensForEth(half); // <- this breaks the ETH -> HATE swap when swap+liquify is triggered

        // how much ETH did we just swap into?
        uint256 newBalance = address(this).balance.sub(initialBalance);

        // add liquidity to uniswap
        addLiquidity(otherHalf, newBalance);

        emit SwapAndLiquify(half, newBalance, otherHalf);
    }

    function swapTokensForEth(uint256 tokenAmount) private {
        // generate the uniswap pair path of token -> weth
        address[] memory path = new address[](2);
        path[0] = address(this);
        path[1] = uniswapV2Router.WETH();

        _approve(address(this), address(uniswapV2Router), tokenAmount);

        // make the swap
        uniswapV2Router.swapExactTokensForETHSupportingFeeOnTransferTokens(
            tokenAmount,
            0, // accept any amount of ETH
            path,
            address(this),
            block.timestamp
        );
    }

    function addLiquidity(uint256 tokenAmount, uint256 ethAmount) private {
        // approve token transfer to cover all possible scenarios
        _approve(address(this), address(uniswapV2Router), tokenAmount);

        // add the liquidity
        uniswapV2Router.addLiquidityETH{value: ethAmount}(
            address(this),
            tokenAmount,
            0, // slippage is unavoidable
            0, // slippage is unavoidable
            owner(),
            block.timestamp
        );
    }

    // this method is responsible for taking all fees, if takeFee is true
    function _tokenTransfer(address sender, address recipient, uint256 amount, bool takeFee) private {
        if (!takeFee) _removeAllFees();

        (RVal memory r, TVal memory t) = _getValues(amount);
        _decreaseBalance(sender, t.amount, r.amount);
        _increaseBalance(recipient, t.transferAmount, r.transferAmount);
        emit Transfer(sender, recipient, t.transferAmount);

        // rfi
        if (t.fee > 0) {
            _reflectFee(r.fee, t.fee);
        }
        // take liquidity
        if (t.liquidity > 0) {
            _increaseBalance(address(this), t.liquidity, r.liquidity);
            emit Transfer(sender, address(this), t.liquidity);
        }
        // burn
        if (t.burn > 0) {
            _decreaseTotalSupply(t.burn, r.burn);
            emit Transfer(sender, address(0), t.burn);
        }
        // developers reward
        if (t.developers > 0) {
            _increaseBalance(_developersAddress, t.developers, r.developers);
            emit Transfer(sender, _developersAddress, t.developers);
        }
        // marketing reward
        if (t.marketing > 0) {
            _increaseBalance(_marketingAddress, t.marketing, r.marketing);
            emit Transfer(sender, _marketingAddress, t.marketing);
        }

        if (!takeFee) _restoreAllFees();
    }

    function _increaseBalance(address account, uint256 tAmount, uint256 rAmount) private {
        _rOwned[account] = _rOwned[account].add(rAmount);
        if (_isExcluded[account]) {
            _tOwned[account] = _tOwned[account].add(tAmount);
        }
    }

    function _decreaseBalance(address account, uint256 tAmount, uint256 rAmount) private {
        _rOwned[account] = _rOwned[account].sub(rAmount);
        if (_isExcluded[account]) {
            _tOwned[account] = _tOwned[account].sub(tAmount);
        }
    }

    function _decreaseTotalSupply(uint256 tAmount, uint256 rAmount) private {
        _tTotal = _tTotal.sub(tAmount);
        _rTotal = _rTotal.sub(rAmount);
    }

}
