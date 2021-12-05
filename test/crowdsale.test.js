const { accounts, contract, web3 } = require('@openzeppelin/test-environment');
const { BN, ether, expectRevert, time } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const {getTransactionCost} = require("./util");

const Token = contract.fromArtifact('ArtiTimeToken');
const Sale = contract.fromArtifact('Crowdsale');

const [owner, buyer, account2] = accounts;

const CONFIG = {
  BASE_PRICE: ether('57750'),
  STAGE1_START: 0,
  STAGE1_END: 0,
  STAGE1_SOFTCAP: ether('6050000'),
  STAGE1_HARDCAP: ether('30250000'),
  STAGE2_START: 0,
  STAGE2_END: 0,
  STAGE2_SOFTCAP: ether('5775000'),
  STAGE2_HARDCAP: ether('57750000'),
  PUBLIC_SALE_END: 0
}

describe('Crowdsale', async function () {
  let token;
  let sale;

  beforeEach(async function () {
    CONFIG.STAGE1_START = (await time.latest()).add(time.duration.days(1));
    CONFIG.STAGE1_END = CONFIG.STAGE1_START.add(time.duration.weeks(1));
    CONFIG.STAGE2_START = CONFIG.STAGE1_END.add(time.duration.days(1));
    CONFIG.STAGE2_END = CONFIG.STAGE2_START.add(time.duration.weeks(1));
    CONFIG.PUBLIC_SALE_END = CONFIG.STAGE2_END.add(time.duration.weeks(4))

    token = await Token.new({from: owner});
    sale = await Sale.new({from: owner});

    await sale.setToken(token.address, {from: owner});
    await sale.setPrice(CONFIG.BASE_PRICE, {from: owner});
    await sale.setVestingSchedule(1, CONFIG.PUBLIC_SALE_END, 0, 0, {from: owner});
    await sale.addStage(CONFIG.STAGE1_START, CONFIG.STAGE1_END, 0, 0, 0, 0, CONFIG.STAGE1_SOFTCAP, CONFIG.STAGE1_HARDCAP, 1, false, {from: owner});
    await sale.addStage(CONFIG.STAGE2_START, CONFIG.STAGE2_END, 0, 0, 0, 0, CONFIG.STAGE2_SOFTCAP, CONFIG.STAGE2_HARDCAP, 1, false, {from: owner});
    await token.excludeFromMaxTxLimit(owner, {from: owner});
    await token.excludeFromMaxTxLimit(sale.address, {from: owner});
    await token.transfer(sale.address, CONFIG.STAGE1_HARDCAP.add(CONFIG.STAGE2_HARDCAP), {from: owner});
  });

  describe('payable', () => {
    it('should not accept ETH before crowdsale start', async function () {
      await expectRevert(sale.sendTransaction({ value: ether('1'), from: buyer }), 'Crowdsale: No suitable stage found');
    });

    it('should not accept ETH below min limit', async function () {
      const minLimit = ether('3');
      await sale.updateStage(0, CONFIG.STAGE1_START, CONFIG.STAGE1_END, 0, minLimit, CONFIG.STAGE1_SOFTCAP, CONFIG.STAGE1_HARDCAP, 1, false, {from: owner});
      await time.increaseTo(CONFIG.STAGE1_START);
      await expectRevert(sale.sendTransaction({ value: minLimit.subn(1), from: buyer }), 'Crowdsale: The amount of ETH you sent is too small.');
    });

    it('should accept ETH above min limit', async function () {
      const minLimit = ether('3');
      await sale.updateStage(0, CONFIG.STAGE1_START, CONFIG.STAGE1_END, 0, minLimit, CONFIG.STAGE1_SOFTCAP, CONFIG.STAGE1_HARDCAP, 1, false, {from: owner});
      await time.increaseTo(CONFIG.STAGE1_START);
      await sale.sendTransaction({value: minLimit, from: buyer});
      const tokensReserved = (await sale.getAccountInfo(buyer)).initial;
      const tokensExpected = minLimit.mul(CONFIG.BASE_PRICE).div(ether('1'));
      expect(tokensReserved).to.be.bignumber.equal(tokensExpected);
    });

    it('should not sell tokens above the hardcap', async function () {
      const hardcap = ether('3');
      await time.increaseTo(CONFIG.STAGE1_START);
      await sale.updateStage(0, CONFIG.STAGE1_START, CONFIG.STAGE1_END, 0, 0, CONFIG.STAGE1_SOFTCAP, hardcap, 1, false, {from: owner});
      await sale.sendTransaction({ value: hardcap.add(ether('1')), from: buyer });
      const tokensReserved = (await sale.getAccountInfo(buyer)).initial;
      expect(tokensReserved).to.be.bignumber.equal(hardcap);
    });

    it('should calculate change correctly', async function () {
      const hardcap = ether('3');
      await time.increaseTo(CONFIG.STAGE1_START);
      await sale.updateStage(0, CONFIG.STAGE1_START, CONFIG.STAGE1_END, 0, 0, CONFIG.STAGE1_SOFTCAP, hardcap, 1, false, {from: owner});
      const ethBalanceBefore = new BN(await web3.eth.getBalance(buyer));
      const ethSent = hardcap.add(ether('0.123'))
      const {receipt: {gasUsed, transactionHash}} = await sale.sendTransaction({ value: ethSent, from: buyer });
      const { gasPrice } = await web3.eth.getTransaction(transactionHash);
      const ethBalanceAfter = new BN(await web3.eth.getBalance(buyer));
      const ethTxFee = new BN(gasUsed * gasPrice);
      expect(ethBalanceBefore.sub(ethSent).sub(ethTxFee)).to.be.bignumber.equal(ethBalanceAfter);
    });

    it('should not accept ETH between crowdsale stages', async function () {
      await time.increaseTo(CONFIG.STAGE1_END);
      await expectRevert(sale.sendTransaction({ value: ether('1'), from: buyer }), 'Crowdsale: No suitable stage found');
    });

    it('should not accept ETH if the previous stage has not been finalized', async function () {
      await time.increaseTo(CONFIG.STAGE2_START);
      await expectRevert(sale.sendTransaction({ value: ether('1'), from: buyer }), 'Crowdsale: The previous stage did not collect the required amount');
    });

    it('should not accept ETH if the previous stage has not reached softcap', async function () {
      await time.increaseTo(CONFIG.STAGE1_START);
      await sale.finalizeStage(0, {from: owner});
      await time.increaseTo(CONFIG.STAGE2_START);
      await expectRevert(sale.sendTransaction({ value: ether('1'), from: buyer }), 'Crowdsale: The previous stage did not collect the required amount');
    });

    it('should accept ETH after the start of the next stage', async function () {
      const softcap = ether('12.345');
      await sale.updateStage(0, CONFIG.STAGE1_START, CONFIG.STAGE1_END, 0, 0, softcap, CONFIG.STAGE1_HARDCAP, 1, false, {from: owner});
      await time.increaseTo(CONFIG.STAGE1_START);
      await sale.sendTransaction({ value: softcap, from: buyer });
      await time.increaseTo(CONFIG.STAGE2_START);
      const ethSent = ether('0.123');
      await sale.sendTransaction({ value: ethSent, from: buyer });
      const tokensExpected = softcap.add(ethSent).mul(CONFIG.BASE_PRICE).div(ether('1'));
      const tokensReserved = (await sale.getAccountInfo(buyer)).initial;
      expect(tokensReserved).to.be.bignumber.equal(tokensExpected);
    });
  });

  describe('refund', () => {
    it('should revert until the end of the stage', async () => {
      await time.increaseTo(CONFIG.STAGE1_START);
      const ethSent = ether('12.3')
      await sale.sendTransaction({ value: ethSent, from: buyer });
      await expectRevert(sale.refund({from: buyer}), 'Crowdsale. Nothing to refund')
    })

    it('should revert if stage has reached softcap', async () => {
      const softcap = ether('12.345');
      await sale.updateStage(0, CONFIG.STAGE1_START, CONFIG.STAGE1_END, 0, 0, softcap, CONFIG.STAGE1_HARDCAP, 1, false, {from: owner});
      await time.increaseTo(CONFIG.STAGE1_START);
      await sale.sendTransaction({ value: softcap, from: buyer });
      await expectRevert(sale.refund({from: buyer}), 'Crowdsale. Nothing to refund')
    })

    it('should return correct amount of eth for single stage', async function () {
      await time.increaseTo(CONFIG.STAGE1_START);
      const ethSent = ether('12.3')
      await sale.sendTransaction({ value: ethSent, from: buyer });
      const ethBalanceBefore = new BN(await web3.eth.getBalance(buyer));
      await time.increaseTo(CONFIG.STAGE2_END);
      const {receipt: {transactionHash}} = await sale.refund({from: buyer});
      const txCost = await getTransactionCost(transactionHash, web3);
      const ethBalanceAfter = new BN(await web3.eth.getBalance(buyer));
      expect(ethBalanceAfter).to.be.bignumber.equal(ethBalanceBefore.add(ethSent).sub(txCost));
      await expectRevert(sale.refund({from: buyer}), 'Crowdsale. Nothing to refund')
    });


    it('should return correct amount of eth for both stages', async () => {
      const softcap = ether('12.345');
      await sale.updateStage(0, CONFIG.STAGE1_START, CONFIG.STAGE1_END, 0, 0, softcap, CONFIG.STAGE1_HARDCAP, 1, false, {from: owner});
      await time.increaseTo(CONFIG.STAGE1_START);
      await sale.sendTransaction({ value: softcap, from: buyer });
      await time.increaseTo(CONFIG.STAGE2_START);
      await expectRevert(sale.refund({from: buyer}), 'Crowdsale. Nothing to refund')
      const ethSent = ether('34.567');
      await sale.sendTransaction({ value: ethSent, from: buyer });
      await expectRevert(sale.refund({from: buyer}), 'Crowdsale. Nothing to refund')
      await time.increaseTo(CONFIG.STAGE2_END.addn(1));
      const ethBalanceBefore = new BN(await web3.eth.getBalance(buyer));
      const {receipt: {transactionHash}} = await sale.refund({from: buyer});
      const txCost = await getTransactionCost(transactionHash, web3);
      const ethBalanceAfter = new BN(await web3.eth.getBalance(buyer));
      expect(ethBalanceAfter).to.be.bignumber.equal(ethBalanceBefore.add(ethSent).sub(txCost));
      await expectRevert(sale.refund({from: buyer}), 'Crowdsale. Nothing to refund')
    })
  });
});
