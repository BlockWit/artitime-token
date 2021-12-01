const { accounts, contract, web3} = require('@openzeppelin/test-environment');
const { BN, constants, ether, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const {getEvents} = require("./util");

const Token = contract.fromArtifact('ArtiTimeToken');

const [owner, account1, account2, account3, developers, marketing] = accounts;
const SUPPLY1 = ether('400000000');
const SUPPLY2 = ether('250000000');
const SUPPLY3 = ether('210000000');
const initialAccounts = [account1, account2, account3];
const initialBalances = [SUPPLY1, SUPPLY2, SUPPLY3];
const FEES = {
  BURN: 1,
  DEVELOPERS: 2,
  LIQUDITY: 2,
  MARKETING: 2,
  RFI: 3
}

describe('Token', async function () {

  let token;

  beforeEach(async function() {
    token = await Token.new({from: owner});
    await Promise.all(initialAccounts.map((account, i) => token.transfer(account, initialBalances[i], {from: owner})));
    await token.setTaxFeePercent(FEES.RFI, {from: owner});
    await token.setLiquidityFeePercent(FEES.LIQUDITY, {from: owner});
    await token.setBurnFeePercent(FEES.BURN, {from: owner});
    await token.setDevelopersRewardPercent(FEES.DEVELOPERS, {from: owner});
    await token.setMarketingRewardPercent(FEES.MARKETING, {from: owner});
    await token.setDevelopersAddress(developers, {from: owner});
    await token.setMarketingAddress(marketing, {from: owner});
  })

    it('should transfer tokens correctly and burn correct amount of tokens', async function() {
      const tokensToSend = ether('1749');
      const fees = tokensToSend.mul(new BN(Object.values(FEES).reduce((prev, curr) => prev + curr))).div(new BN(100));
      const tokensToBurn = tokensToSend.mul(new BN(FEES.BURN)).div(new BN(100));
      const tokensToReceive = tokensToSend.sub(fees);
      const totalSupplyBefore = await token.totalSupply();
      const balance1before = await token.balanceOf(account1);
      const balance2before = await token.balanceOf(account2);
      const balance3before = await token.balanceOf(account3);
      const { receipt: { transactionHash } } =  await token.transfer(account2, tokensToSend, {from: account1})
      const events = await getEvents(transactionHash, token, 'TakeFee', web3);
      const totalSupplyAfter = await token.totalSupply();
      const balance1after = await token.balanceOf(account1);
      const balance2after = await token.balanceOf(account2);
      const balance3after = await token.balanceOf(account3);
      const diff1 = balance1after.add(tokensToSend).sub(balance1before);
      const diff2 = balance2after.sub(balance2before).sub(tokensToReceive);
      const diff3 = balance3after.sub(balance3before);
      const ratio1 = balance1after.div(diff1);
      const ratio2 = balance2after.div(diff2);
      const ratio3 = balance3after.div(diff3);
      expect(ratio1).to.be.bignumber.equal(ratio2).and.equal(ratio3);
      expect(totalSupplyAfter).to.be.bignumber.equal(totalSupplyBefore.sub(tokensToBurn));
    });

    it('should transfer tokens correctly from excluded account', async function() {
      const tokensToSend = ether('1749');
      const fees = tokensToSend.mul(new BN(Object.values(FEES).reduce((prev, curr) => prev + curr))).div(new BN(100));
      const tokensToReceive = tokensToSend.sub(fees);
      await token.excludeFromReward(account1, {from: owner});
      const balance1before = await token.balanceOf(account1);
      const balance2before = await token.balanceOf(account2);
      const balance3before = await token.balanceOf(account3);
      await token.transfer(account2, tokensToSend, {from: account1})
      const balance1after = await token.balanceOf(account1);
      const balance2after = await token.balanceOf(account2);
      const balance3after = await token.balanceOf(account3);
      const diff2 = balance2after.sub(balance2before).sub(tokensToReceive);
      const diff3 = balance3after.sub(balance3before);
      const ratio2 = balance2after.div(diff2);
      const ratio3 = balance3after.div(diff3);
      expect(ratio2).to.be.bignumber.equal(ratio3);
      expect(balance1after).to.be.bignumber.equal(balance1before.sub(tokensToSend));
    });

});

