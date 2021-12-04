const { accounts, contract } = require('@openzeppelin/test-environment')
const { BN, ether, time } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const { fromArtifact } = require("./util");

const ArtiTimeToken = contract.fromArtifact('ArtiTimeToken');
const WETH = contract.fromArtifact('canonical-weth/WETH9');
const UniswapFactory = fromArtifact("@uniswap/v2-core/build/UniswapV2Factory.json");
const UniswapRouter = fromArtifact("@uniswap/v2-periphery/build/UniswapV2Router02.json");
const UniswapPairMock = fromArtifact("@uniswap/v2-core/build/UniswapV2Pair.json");

const [uniswapOwner, owner, account1, account2, developers, marketing] = accounts;

const FEES = {
  BURN: 1,
  DEVELOPERS: 2,
  LIQUDITY: 2,
  MARKETING: 2,
  RFI: 3
}

describe('Token', async function () {

  let token;
  let weth;
  let uniswapFactory;
  let uniswapRouter;
  let uniswapPair;

  beforeEach(async () => {
    // configure
    token = await ArtiTimeToken.new({from: owner});
    weth = await WETH.new({from: owner});
    uniswapFactory = await UniswapFactory.new(uniswapOwner, {from: uniswapOwner});
    uniswapRouter = await UniswapRouter.new(uniswapFactory.address, weth.address, {from: uniswapOwner});
    await uniswapFactory.createPair(token.address, weth.address, {from: owner});
    uniswapPair = await UniswapPairMock.at(await uniswapFactory.getPair(token.address, weth.address));
    // provide liquidity
    const liquidity = ether('3000000');
    const value = ether('60');
    const deadline = (await time.latest()).addn(300);
    await token.approve(uniswapRouter.address, liquidity, {from: owner});
    await uniswapRouter.addLiquidityETH(token.address, liquidity, liquidity, value, owner, deadline, {from: owner, value})
    // configure token
    await token.setLiquidityFeePercent(FEES.LIQUDITY, {from: owner});
    await token.setUniswapRouter(uniswapRouter.address, {from: owner});
    await token.setUniswapPair(uniswapPair.address, {from: owner});
    await token.toggleSwapAndLiquify({from: owner});
  });

  describe('transfer', () => {
    it('should charge correct liquidity fee', async function() {
      const value = ether('12345');
      await token.transfer(account1, value, {from: owner});
      const account1Balance = await token.balanceOf(account1);
      const tokenBalance = await token.balanceOf(token.address);
      expect(tokenBalance).to.be.bignumber.equal(value.mul(new BN(FEES.LIQUDITY)).div(new BN(100)));
      expect(tokenBalance.add(account1Balance)).to.be.bignumber.equal(value);
    });

    it('should not trigger replenishment of the liquidity pool when token balance is below the max value', async function() {
      const liquidityThreshhold = await token.liquidityThreshold();
      const tokensToSend = liquidityThreshhold.mul(new BN(100)).div(new BN(FEES.LIQUDITY));
      await token.transfer(account1, tokensToSend, {from: owner});
      const tokenBalance = await token.balanceOf(token.address);
      expect(tokenBalance).to.be.bignumber.equal(liquidityThreshhold);
    });

    it('should trigger replenishment of the liquidity pool when token balance exceeds the max value', async function() {
      const liquidityThreshhold = await token.liquidityThreshold();
      const tokensToSend = liquidityThreshhold.mul(new BN(100)).div(new BN(FEES.LIQUDITY));
      await token.transfer(account1, tokensToSend, {from: owner});
      const tokenBalanceBeforeSwap = await token.balanceOf(token.address);
      await token.transfer(account1, new BN(1), {from: owner});
      const tokenBalanceAfterSwap = await token.balanceOf(token.address);
      expect(tokenBalanceBeforeSwap).to.be.bignumber.equal(liquidityThreshhold);
      expect(tokenBalanceAfterSwap).to.be.zero;
    });

    it('should trigger replenishment of the liquidity pool correctly when all fees are enabled', async function() {
      await Promise.all([
        token.setTaxFeePercent(FEES.RFI, {from: owner}),
        token.setBurnFeePercent(FEES.BURN, {from: owner}),
        token.setDevelopersRewardPercent(FEES.DEVELOPERS, {from: owner}),
        token.setMarketingRewardPercent(FEES.MARKETING, {from: owner}),
        token.setDevelopersAddress(developers, {from: owner}),
        token.setMarketingAddress(marketing, {from: owner})
      ]);
      const liquidityThreshhold = await token.liquidityThreshold();
      const tokensToSend = liquidityThreshhold.mul(new BN(100)).div(new BN(FEES.LIQUDITY));
      await token.transfer(account1, tokensToSend, {from: owner});
      const tokenBalanceBeforeSwap = await token.balanceOf(token.address);
      await token.transfer(account1, new BN(1), {from: owner});
      const tokenBalanceAfterSwap = await token.balanceOf(token.address);
      expect(tokenBalanceBeforeSwap).to.be.bignumber.gte(liquidityThreshhold);
      expect(tokenBalanceAfterSwap).to.be.zero;
    });
  })

});

