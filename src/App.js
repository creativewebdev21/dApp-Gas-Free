import React, { useState, useEffect } from "react";
import './App.css';
import Web3 from 'web3'
import Biconomy from "@biconomy/mexa";
import { ethers } from "ethers";
import { NotificationContainer, NotificationManager } from 'react-notifications';
import 'react-notifications/lib/notifications.css';
const { config } = require("./config");
const showErrorMessage = message => {
  NotificationManager.error(message, "Error", 5000);
};
const showSuccessMessage = message => {
  NotificationManager.success(message, "Message", 3000);
};

const showInfoMessage = message => {
  NotificationManager.info(message, "Info", 3000);
};

let contract;
let contractEthers;
let signer;
let domainData = {
  name: "Quote",
  version: "1",
  chainId: "42",  // Kovan
  verifyingContract: config.contract.address
};
const domainType = [
  { name: "name", type: "string" },
  { name: "version", type: "string" },
  { name: "chainId", type: "uint256" },
  { name: "verifyingContract", type: "address" }
];

const metaTransactionType = [
  { name: "nonce", type: "uint256" },
  { name: "from", type: "address" }
];

let web3;
let _ethers;

function App() {


  const [owner, setOwner] = useState("Default Owner Address");
  const [quote, setQuote] = useState("This is a default quote");
  const [newQuote, setNewQuote] = useState("");
  useEffect(() => {


    if (!window.ethereum) {
      showErrorMessage("Metamask is required to use this DApp")
      return;
    }

    const biconomy = new Biconomy(window.ethereum, { dappId: "5e9a0fc5667350123f4de8fe", apiKey: "q9oEztJM8.e8ed08a7-5b38-48e3-b4c0-f66e6b66f407" });

    web3 = new Web3(biconomy);
    _ethers = new ethers.providers.Web3Provider(biconomy);

    biconomy.onEvent(biconomy.READY, async () => {
      // Initialize your dapp here like getting user accounts etc

      await window.ethereum.enable();
      let signer = _ethers.getSigner();
      contractEthers = new ethers.Contract(config.contract.address, config.contract.abi ,signer);
      contract = new web3.eth.Contract(config.contract.abi, config.contract.address);
      console.log(contractEthers);
      startApp();
    }).onEvent(biconomy.ERROR, (error, message) => {
      // Handle error while initializing mexa
      console.log(error)
    });
  }
    , []);

  const onQuoteChange = event => {
    setNewQuote(event.target.value);
  };

  async function startApp() {
    const result = await contract.methods.getQuote().call({ from: window.ethereum.selectedAddress });
    const resultEthers = await contractEthers.getQuote();
    if (result.currentOwner !== "0x0000000000000000000000000000000000000000") {
      setQuote(result.currentQuote)
      setOwner(result.currentOwner)
    }
  }
  async function onButtonClickMeta() {
    console.log(window.ethereum.selectedAddress)
    setNewQuote("");
    console.log(contract)
    let nonce = await contractEthers.nonces(window.ethereum.selectedAddress);
    let message = {};
    message.nonce = parseInt(nonce);
    message.from = window.ethereum.selectedAddress;

    const dataToSign = JSON.stringify({
      types: {
        EIP712Domain: domainType,
        MetaTransaction: metaTransactionType
      },
      domain: domainData,
      primaryType: "MetaTransaction",
      message: message
    });
    const result = await _ethers.send("eth_signTypedData_v4",[window.ethereum.selectedAddress, dataToSign]);
        const signature = result.substring(2);
        const r = "0x" + signature.substring(0, 64);
        const s = "0x" + signature.substring(64, 128);
        const v = parseInt(signature.substring(128, 130), 16);
        console.log(r, "r");
        console.log(s, "s");
        console.log(v, "v");
        console.log(window.ethereum.address, "userAddress")
        //const tx = await contractEthers.populateTransaction.setQuoteMeta(window.ethereum.selectedAddress, newQuote, r, s, v,{from:window.ethereum.selectedAddress});
        //await _ethers.send("eth_sendTransaction",[tx]);
        await contractEthers.setQuoteMeta(window.ethereum.selectedAddress, newQuote, r, s, v);
       // issue, a signer isn't being passed into Ethers provider by Biconomy
  }
  return (
    <div className="App">
      *Use this DApp only on Kovan Network
      <header className="App-header">
        <h1>Quotes</h1>
        <section className="main">
          <div className="mb-wrap mb-style-2">
            <blockquote cite="http://www.gutenberg.org/ebboks/11">
              <h4>{quote} </h4>
            </blockquote>
          </div>

          <div className="mb-attribution">
            <p className="mb-author">- {owner}</p>
          </div>
        </section>
        <section>
          <div className="submit-container">
            <div className="submit-row">
              <input size="100"
                border-radius="15"
                type="text"
                placeholder="Enter your quote"
                onChange={onQuoteChange}
                value={newQuote}
              />
              <button type="button" className="button" onClick={onButtonClickMeta}>Submit</button>
            </div>
          </div>
        </section>
      </header>
      <NotificationContainer />
    </div >
  );
}

export default App;
