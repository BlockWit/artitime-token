const { accounts, contract } = require('@openzeppelin/test-environment');
const { ether, time } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');

const Token = contract.fromArtifact('ArtiTimeToken');
const Sale = contract.fromArtifact('Crowdsale');

const [owner, account1, account2] = accounts;

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
    CONFIG.STAGE1_START = await time.latest()
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

  it('should allow to add balances', async function () {
    const amount1 = ether('1');
    const amount2 = CONFIG.STAGE1_SOFTCAP;
    await sale.addBalances(1, [account1, account2], [amount1, amount2], { from: owner });
    await sale.finalizeStage(0, { from: owner });
    await sale.finalizeStage(1, { from: owner });
    await time.increaseTo(CONFIG.PUBLIC_SALE_END.addn(1));
    await sale.withdraw({ from: account1 });
    const balance1 = await token.balanceOf(account1);
    await sale.withdraw({ from: account2 });
    const balance2 = await token.balanceOf(account2);
    expect(balance1).to.be.bignumber.equal(amount1);
    expect(balance2).to.be.bignumber.equal(amount2);
    const saleBalance = token.balanceOf(sale.address);
    expect(saleBalance).to.be.zero;
  });
});
