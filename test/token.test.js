const { accounts, contract } = require('@openzeppelin/test-environment');
const { constants, ether, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const { ZERO_ADDRESS } = constants;
const { shouldBehaveLikeERC20 } = require('./behaviors/ERC20.behavior');
const { shouldBehaveLikeERC20Burnable } = require('./behaviors/ERC20Burnable.behavior');
const { shouldBehaveLikeRecoverableFunds } = require('./behaviors/RecoverableFunds.behaviour');
const { shouldBehaveLikeWithCallback } = require('./behaviors/WithCallback.behaviour');
const transfer = require("@openzeppelin/cli/lib/scripts/transfer");

const Token = contract.fromArtifact('ArtiTimeToken');

const [owner, account1, account2, account3] = accounts;
const SUPPLY1 = ether('400000000');
const SUPPLY2 = ether('250000000');
const SUPPLY3 = ether('210000000');
const initialAccounts = [account1, account2, account3];
const initialBalances = [SUPPLY1, SUPPLY2, SUPPLY3];

describe('ERC20', function () {

  beforeEach(async function() {
    this.token = await Token.new({from: owner});
  })

  shouldBehaveLikeERC20("ERC20", ether('1000000000'), owner, account1, account2);
  shouldBehaveLikeERC20Burnable(owner, ether('1000000000'), [account1]);

});

describe('RecoverableFunds', function () {

  beforeEach(async function() {
    this.testedContract = await Token.new({from: owner});
  })

  shouldBehaveLikeRecoverableFunds(owner, account2, account3);

  describe('ArtiTimeToken', function () {
    describe('retrieveTokens', function () {
      it('should not allow to retrieve Arti tokens', async function () {
        await expectRevert(this.testedContract.retrieveTokens(owner, this.testedContract.address, {from: owner}), "You can't retrieve tokens locked in this contract");
      });
    });
  });

});

describe('Token', async function () {

  let token;

  beforeEach(async function() {
    token = await Token.new({from: owner});
    await Promise.all(initialAccounts.map((account, i) => token.transfer(account, initialBalances[i], {from: owner})));

  })

  describe('transfer', function() {
    it('works correctly', async function () {
      const balance1Before = await token.balanceOf(account1);
      const balance2Before = await token.balanceOf(account2);
      const amountToTransfer = ether('123321');
      await token.transfer(account2, amountToTransfer, {from: account1});
      const balance1After = await token.balanceOf(account1);
      const balance2After = await token.balanceOf(account2);
      expect(balance1After).to.be.bignumber.equal(balance1Before.sub(amountToTransfer));
      expect(balance2After).to.be.bignumber.equal(balance2Before.add(amountToTransfer));
    });
  });

  describe('pausable', function() {
    describe('when not paused', function() {
      it('allows to transfer', async function () {
        const value = ether('123');
        expectEvent(await token.transfer(account2, value, {from: account1}), 'Transfer', {
          from: account1,
          to: account2,
          value,
        });
      });
      it('allows to transfer from another account', async function () {
        const value = ether('123');
        await token.increaseAllowance(account2, value, {from: account1});
        expectEvent(await token.transferFrom(account1, account3, value, {from: account2}), 'Transfer', {
          from: account1,
          to: account3,
          value,
        });
      });
      it('allows to burn', async function() {
        const value = ether('123');
        expectEvent(await token.burn(value, {from: account1}), 'Transfer', {
          from: account1,
          to: ZERO_ADDRESS,
          value,
        });
      });
      it('allows to burn from another account', async function() {
        const value = ether('123');
        await token.increaseAllowance(account2, value, {from: account1});
        expectEvent(await token.burnFrom(account1, value, {from: account2}), 'Transfer', {
          from: account1,
          to: ZERO_ADDRESS,
          value,
        });
      });
    })
    describe('when paused', function() {
      beforeEach(async function() {
        await token.pause({from: owner});
      })
      describe('for non-whitelisted accounts', function() {
        it('prohibits transferring', async function () {
          const value = ether('123');
          await expectRevert(token.transfer(account2, value, { from: account1 }), 'Pausable: paused');
        });
        it('prohibits transferring from another account', async function () {
          const value = ether('123');
          await token.increaseAllowance(account2, value, {from: account1});
          await expectRevert(token.transferFrom(account1, account3, value, {from: account2}), 'Pausable: paused');
        });
        it('prohibits burning', async function() {
          const value = ether('123');
          await expectRevert(token.burn(value, {from: account1}), 'Pausable: paused');
        });
        it('prohibits burning from another account', async function() {
          const value = ether('123');
          await token.increaseAllowance(account2, value, {from: account1});
          await expectRevert(token.burnFrom(account1, value, {from: account2}), 'Pausable: paused');
        });
      });
      describe('for whitelisted accounts', function() {
        beforeEach(async function() {
          token.addToWhitelist([account1], {from: owner});
        });
        it('allows to transfer', async function () {
          const value = ether('123');
          expectEvent(await token.transfer(account2, value, {from: account1}), 'Transfer', {
            from: account1,
            to: account2,
            value,
          });
        });
        it('allows to transfer from another account', async function () {
          const value = ether('123');
          await token.increaseAllowance(account2, value, {from: account1});
          expectEvent(await token.transferFrom(account1, account3, value, {from: account2}), 'Transfer', {
            from: account1,
            to: account3,
            value,
          });
        });
        it('allows to burn', async function() {
          const value = ether('123');
          expectEvent(await token.burn(value, {from: account1}), 'Transfer', {
            from: account1,
            to: ZERO_ADDRESS,
            value,
          });
        });
        it('allows to burn from another account', async function() {
          const value = ether('123');
          await token.increaseAllowance(account2, value, {from: account1});
          expectEvent(await token.burnFrom(account1, value, {from: account2}), 'Transfer', {
            from: account1,
            to: ZERO_ADDRESS,
            value,
          });
        });
      });
    });
  });


});

