// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Address.sol";
import "./RecoverableFunds.sol";
import "./ArtiTimeToken.sol";
import "./VestingWallet.sol";

contract Configurator is RecoverableFunds {
    using Address for address;

    ArtiTimeToken public token;
    VestingWallet public wallet;

    constructor(address owner) {
        // create wallet
        wallet = new VestingWallet();

        address[] memory addresses = new address[](1);
        uint256[] memory amounts = new uint256[](1);

        addresses[0] = address(wallet);
        amounts[0] = 1_500_000_000 ether;

        // create token
        token = new ArtiTimeToken("Artitime", "ARTI", addresses, amounts);
        token.transferOwnership(owner);

        // finish wallet configuration
        wallet.setToken(address(token));
        wallet.transferOwnership(owner);
    }

}

