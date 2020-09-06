[![buidler](https://buidler.dev/buidler-plugin-badge.svg?1)](https://buidler.dev)

# buidler-deploy

_A Plugin For Replicable Deployments And Tests_

[Buidler](http://getbuidler.com) Deployment And Test Plugin.

## What

This [buidler](https://buidler.dev) plugin adds a mechanism to deploy contracts to any network, keeping track of them and replicating the same environment for testing.

It also adds a mechanism to associate names to addresses so test and deployment scripts can be reconfigured by simply changing the address a name points to, allowing different configurations per network. This also results in much clearer test and deployment scripts.

This plugin contains more features, all geared toward a better developer experience :

- chain configuration export, listing deployed contract, their abi and address, usefull for webapps.
- library linking at time of deployment
- create2 deterministic deployment
- ability to submit contract source to etherscan for verification. Because buidler-deploy will save all necessary info, it can be executed at any time.
- deployment dependency system (allowing you to only deploy what is needed).
- deployment as migration so once a deployment is done, it can be set to never be executed again.
- deployment retrying (by saving pending tx): so you can feel confident when making a deployment that you can always recover.
- test fixture using `evm_snapshot` to speed up testing.
- ability to create test fixture that automatically benefit from `evm_snapshot` to speed up these fixture.
- combined with `buidler-ethers-v5` it has the ability to get ethers contract instance by name (like `await ethers.getContract("ContractName")`).
- importing previously compiled contract (possibly in different solidity compiler version).
- importing artifact from external sources (like npm packages)
- importing deployments from external sources (like npm packages)
- ability to log information in `deploy` mode only (while in test the console remains clean).
- contains helpers to read and execute transaction on deployed contract referring to them by name.
- These helpers contains options to auto mine on dev envoronment like ganache (to speed up deployments).
- save metadata of deployed contract so they can alwasy be fully verified, via [sourcify](https://github.com/ethereum/sourcify) or [etherscan](https://etherscan.io).
- proxy deployment with ability to upgrade them transparently, only if code changes.
- diamond deployment with facets, allowing you to focus on what the new version will be. It will generate the diamondCuts necessary to reach that state.
- watch and deploy: buidler-deploy can watch both your deploy script and contract code and redeploy on changes.
- HCR (Hot Contract Replacement): the watch feature combined with proxy or diamond, gives you an experience akin to frontend Hot Module Replacement: Once your contract change, the deployment is executed and your contract retain the same address and same state.

## Installation

```bash
npm install buidler-deploy
```

And add the following statement to your `buidler.config.js`:

```js
usePlugin("buidler-deploy");
```

### TypeScript support

You need to add this to your `tsconfig.json`'s `files` array: `"node_modules/buidler-deploy/src/type-extensions.d.ts"`

you also need to set up the `include` field in `tsconfig.json` to set the folder in which your ts files are located.

for example: `include": ["./scripts", "./deploy", "./test"]`

see doc here : https://www.typescriptlang.org/docs/handbook/tsconfig-json.html#details

for deploy script (see below) you can write them this way to benefit from typing :

```
import {
  BuidlerRuntimeEnvironment,
  DeployFunction,
} from "@nomiclabs/buidler/types";

const func: DeployFunction = async function (bre: BuidlerRuntimeEnvironment) {
  // code here
};
export default func;
```

See a full example of typescript usage here : https://github.com/wighawag/buidler-deploy-ts-test

### Migrating existing deployment to buidler-deploy

You might want to switch your current deployment process to use buidler-deploy. In that case you probably have some deployment saved elsewhere.

In order to port them to buidler-deploy, you'll need to create one `.json` file per contract in the `deployments/<network>` folder.

The network folder is simply the buidler network name (as configured in buidler.config.js) (accessible at runtime via `bre.network.name`).
Such folder need to have a file named `.chainId` containing the chainId as decimal

For example for a rinkeby the file `deployments/rinkeby/.chainId` would be

```
4
```

Note, prior to buidler 0.6 the chainId was appended to the folder name (expect for some known network name). This has changed and upgrading to 0.6 will require you to change the folder name and add the '.chainId' file.

Each contract file must follow this type (as defined in [src/type-extensions.d.ts](src/type-extensions.d.ts)) :

```ts
export interface Deployment {
  abi: any[];
  address: string;
  receipt?: Receipt;
  transactionHash?: string;
  contractFilepath?: string;
  contractName?: string;
  history?: Deployment[];
  args?: any[];
  linkedData?: any;
  metadata?: string;
  bytecode?: string;
  deployedBytecode?: string;
  userdoc?: any;
  devdoc?: any;
  methodIdentifiers?: any;
  diamondCuts?: string[];
  facets?: { address: string; sigs: string[] }[];
  storageLayout?: any;
}
```

As you can see, only abi, address and receipt are mandatory.

For Receipt, the following type is expected:

```ts
export type Receipt = {
  from: string;
  transactionHash: string;
  blockHash: string;
  blockNumber: number;
  transactionIndex: number;
  cumulativeGasUsed: string | number;
  gasUsed: string | number;
  contractAddress?: string;
  to?: string;
  logs?: Log[];
  events?: any[];
  logsBloom?: string;
  byzantium?: boolean;
  status?: number;
  confirmations?: number;
};
```

Here is an example:

Let sey you have:

- 2 Contract named Greeter and Registry deployed on rinkeby
- 1 contract named Greeter on mainnet
- 2 Contract named Greeter and Registry deployed on a network named rinkeby2

You would get the following folder structure:

```
deployments/
  mainnet/
    .chainId
    Greeter.json
  rinkeby/
    .chainId
    Greeter.json
    Registry.json
  rinkeby2/
    .chainId
    Greeter.json
    Registry.json
```

The reason why buidler-deploy save chainId in the `.chainId` fie is both for

- safety: so that if you were to change the network to point to a different chain, it would not attempt to read the wrong folder and assume that a contract has been deployed while it has not.
- ability to know the chainId without requring to be connected to a node (and so not dependent on buidler.config.js settings)

## Tasks

### `buidler deploy`

This plugin adds the _deploy_ task to Buidler.

This task will execute the scripts in the `deploy` folder and save the contract deployments to disk. These deployments are supposed to be saved for example in a git repository. This way they can be accessed later.

With the deployment saved, it allows you to deploy a contract only if changed were made.

Deploy scripts (also called Deploy functions) can also perform aribtrary logic.

For further details on how to use it and write deploy script, see [section](#deploy-scripts) below.

#### Options

`--export <filepath>`: export one file that contains all contracts (address, abi + extra data) for the network being invoked. The file contains the minimal information so to not bloat your frontend.

`--export-all <filepath>`: export one file that contains all contracts across all saved deployment, regardless of the network being invoked.

`--tags <tags>`: only excute deploy script with the given tags and their dependencies (see more info below about deploy scripts)

`--gasprice <gasprice>`: specify the gasprice to use by default for tx in deploy scripts

`--write <boolean>`: default to true (except for buidlerevm network). If true, write deployments to disk (in deployments path, see config)

#### Flags

`--reset`: This flag reset the deployments from scratch. Previously deployed contract are not considered

`--silent`: This flag remove buidler-deploy log output (see log function and log options for [`bre.deployments`](#deployments-field))

`--watch`: This flag make the task never ending, watching for file changes in the deploy scripts folder or the contract source folder. If any changes happen the contracts are recompiled and the deploy script are re-run. Combined with a proxy deployment ([Proxies](#proxies) or [Diamond](#diamonds-and-facets)) this allow to have HCR (Hot Contract Replacement).

### `buidler node`

This plugin modify the _node_ task so that it also execute the deployment script before exposing the server http RPC interface

It also add the same options as the _deploy_ task with the same functionality. It adds an extra flag:

`--no-deploy` that discard all other options to revert to normal `buidler node` behavior without any deployment being performed.

Note that the deployments are saved as if the network name is `localhost`. This is because `buidler node` is expected to be used as localhost: You can for example execute `buidler --network localhost console` after `node` is running. Doing `builder console` would not attach it to anything. It still take the configuration from `buidlerevm` in the buidler.config.js file.

### `buidler etherscan-verify`

This plugin adds the _etherscan-verify_ task to Buidler.

This task will submit the contract source and other info to all deployed contract to allow etherscan to verify and record the sources.

Instead of using the full solc input, this task will first attempt to send the minimal sources from the metadata.
But Etherscan sometime fails for some reason (even if it should not). As such this task can fallback on full solc input (see option --solc-input). Note that if your contract was deployed with a previous version of buidler-deploy, it might not contains the full information.

This task will also attempt to automatically find the SPDX license in the source.

To execute it you need to specifiy the network to run against :

```
buidler --network mainnet etherscan-verify --api-key <apikey>
```

#### Options

`--api-key <API_KEY>`: Etherscan API key. Optional as such api key can also be set by setting the environment variable : ETHERSCAN_API_KEY

`--license <SPDX>`: specifiy the license to use (using SPDX id) or can be "UNLICENSED". Note that etherscan have limited support for licenses, see : https://etherscan.io/contract-license-types

#### Flags

`--solcInput`: allow the use of full solc-input as fallback. Note that the whole source folder will be included in the result of the verification on etherscan.

`--force-license`: This flag force the use of the license specified by --license (useful if your inline SPDX are not compatible with etherscan list)

### `buidler export`

This plugin adds the _export_ task to Buidler.

This task will export the contract deployed (saved in `deployments` folder) to a simple format containing only contract addresses and abi, useful for web apps.

One of the following options need to be set for this task to have any effects :

#### Options

`--export <filepath>`: export one file that contains all contracts (address, abi + extra data) for the network being invoked. The file contains the minimal information so to not bloat your frontend.

`--export-all <filepath>`: export one file that contains all contracts across all saved deployment, regardless of the network being invoked.
This last option has some limitations, when combined with the use of external deployments (see [Configuration](#configuration)). If such external deployments were using older version of buidler-deploy or truffle, the chainId might be missing. In order for these to be exported, the buidler network config need to explicity state the chainId.

## Environment extensions

This plugin extends the Buidler Runtime Environment by adding 3 fields:

- `getNamedAccounts: () => Promise<{ [name: string]: Address }>`: a function returning an object whose keys are names and values are addresses. It is parsed from the `namedAccounts` configuration (see [Configuration](#configuration)).

- `deployments`: contains functions to access past deployments or to save new ones, as well as helpers functions.

- `getChainId(): Promise<string>`: offer an easy way to fetch the current chainId

## Configuration

### `namedAccounts`

This plugin extends the `BuidlerConfig`'s object with an optional `namedAccounts` field.

`namedAccounts` allows you to associate names to addresses and have them configured per chain.
This allows you to have meaningful names in your tests while the addresses match to multi sig in real network for example.

```js
{
    namedAccounts: {
        deployer: {
            default: 0, // here this will by default take the first account as deployer
            4: '0xffffeffffff', // but for rinkeby it will be a specific address
            "specialnetwork": "0xf34e...", //it can also specify a specific netwotk name (specified in buidler.config.js)
        },
        feeCollector:{
            default: 1, // here this will by default take the second account as feeCollector (so in the test this will be a different account than the deployer)
            1: '0xffffeaaa', // on the mainnet the feeCollector could be a multi sig
            4: '0xaaaeffffff', // on rinkeby it could be another account
        }
    }
}
```

### `paths`

It also adds fields to `BuidlerConfig`'s `ProjectPaths` object.

Here is an example showing the default values :

```js
{
    paths: {
        deploy: 'deploy',
        deployments: 'deployments',
        imports: `imports`
    }
}
```

The deploy folder is expected to contains the deploy script that are executed upon invocation of `buidler deploy` or `buidler node`

The deployment folder will contains the resulting deployments (contract addresses along their abi, bytecode, metadata...). One folder per network and one file per contract.

The imports folder is expected to contains artifacts that were pre-compiled. Useful if you want to upgrade to a new solidity version but want to keep using previously compiled contracts. The artifact is the same format as normal buidler artifact, so you can easily copy them over, before switching to a new compiler version.

### `external`

It also add the `external` field to `BuidlerConfig`

Such fiels allows to specify paths for external artifacts or deployments. The use of the `paths` field was not possible as of writing buidler, expect all paths field to be string. It does not accept arrays or objects

The external object has 2 fields:

```js
{
    external: {
        artifacts: ["node_modules/@cartesi/arbitration/build/contracts"],
        deployments: {
          rinkeby: ["node_modules/@cartesi/arbitration/build/contracts"],
        }
    }
}
```

The artifacts fields specify an array of path to look for artifact. it support both buidler and truffle artifacts.

The deployments fields specify an object whose field name are the buidler network and the value is an array of path to look for deployments. It supports both buidler-deploy and truffle formats.

## Deploying Contracts

`buidler --network <networkName> deploy [options and flags]`

This is a new task that the plugin adds. As the name suggests it deploys contracts.
To be exact it will look for files in the folder `deploy` or whatever was configured in `paths.deploy`.

It will scan for files in alphabetical order and execute them in turn.

- it will `require` each of these files and execute the exported function with the BRE as argument

Note that running `buidler deploy` without specifying a network will use the default network. If the default network is an internal ganache or buidlerevm then nothing will happen as a result but this can be used to ensure the deployment is without issues.

### deploy scripts

The deploy script need to be of the following type :

```js
export interface DeployFunction {
  (env: BuidlerRuntimeEnvironment): Promise<void | boolean>;
  skip?: (env: BuidlerRuntimeEnvironment) => Promise<boolean>;
  tags?: string[];
  dependencies?: string[];
  runAtTheEnd?: boolean;
}
```

The skip function can be used to skip executing the script under whatever condition. It simply need to resolve a promise to true.

The tags is a list of string that when the _deploy_ task is executed with, the script will be executed (unless it skips). In other word if the deploy task is executed with a tag that does not belong to that script, that script will not be executed unless it is a dependency of a script that does get executed.

The dependencies is a list of tag that will be executed if that script is executed. So if the script is executed, every script whose tag match any of the dependency will be executed first.

The `runAtTheEnd` is a boolean that if set to true, will queue that script to be executed after all other scripts are executed.

These set of fields allow more flexibility to organize the script. You are not limited to alphabetical order.

Finally the function can return true if it wishes to never be executed again. This can be usfeul to emulate migration scripts that are meant to be executed only once. Once such script return true (async), the file name will be saved so to not be executed again.
In other word, if the file name changes, the script will be executed again, unless that names belonged to an older script that returned true before.

In any case, as a general advice every deploy function should be idempotent. This is so they can always recover from failure or pending transaction.

This is why the `bre.deployments.deploy` function will by default only deploy if the contract code has changed, making it easier to write idempotent script.

An example of a deploy script :

```js
module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  // the following will only deploy "GenericMetaTxProcessor" if the contract was never deployed or if the code changed since last deployment
  await deploy("GenericMetaTxProcessor", {
    from: deployer,
    gas: 4000000,
    args: []
  });
};
```

As you can see the BRE passed in has 3 new fields :

- `getNamedAccounts` is a function that returns a promise to an object whose keys are names and values are addresses. It is parsed from the `namedAccounts` configuration (see [`namedAccounts`](#namedaccounts)).

- `deployments`, which contains functions to access past deployments or to save new ones, as well as helpers functions.

- `getChainId` which return a promise for the chainId

The deploynments field contains the `deploy` function taht allow you to deploy contract and save them. It contains a lot more functions though :

### deployments field

The deployments field contains several helpers function to deploy contract but also execute transaction.

```js
deploy(name: string, options: DeployOptions): Promise<DeployResult>; // deploy a contract
diamond: { // deploy diamond based contract (see section below)
  deploy(name: string, options: DiamondOptions): Promise<DeployResult>;
  executeAsOwner(
    name: string,
    options: TxOptions,
    methodName: string,
    ...args: any[]
  ): Promise<Receipt | null>;
};
create2( // return the determinsitic address as well as a function to deploy the contract, can pass the `salt` field in the option to use different salt
      name: string,
      options: Create2DeployOptions
    ): Promise<{
      address: Address;
      deploy(): Promise<DeployResult>;
    }>;
fetchIfDifferent(name: string, options: DeployOptions): Promise<boolean>; // return true if new compiled code is different than deployed contract
save(name: string, deployment: DeploymentSubmission): Promise<void>; // low level save of deployment
get(name: string): Promise<Deployment>; // fetch a deployment by name, throw if not existing
getOrNull(name: string): Promise<Deployment | null>; // fetch deployment by name, return null if not existing
all(): Promise<{ [name: string]: Deployment }>; // return all deployments
getArtifact(name: string): Promise<Artifact>; // return an artifact (same as buidler artifact)
run( // execute deployment scripts
  tags?: string | string[],
  options?: {
    resetMemory?: boolean;
    deletePreviousDeployments?: boolean;
    writeDeploymentsToFiles?: boolean;
    export?: string;
    exportAll?: string;
  }
): Promise<{ [name: string]: Deployment }>;
fixture(tags?: string | string[]): Promise<{ [name: string]: Deployment }>; // execute deployment as fixture for test // use evm_snapshot to revert back
createFixture(func: FixtureFunc, id?: string): () => Promise<any>; // execute a function as fixture using evm_snaphost to revert back each time
log(...args: any[]): void; // log data only ig log enabled (disabled in test fixture)
execute( // execute function call on contract
  name: string,
  options: TxOptions,
  methodName: string,
  ...args: any[]
): Promise<Receipt | null>;
batchExecute( // execute a series of tx
  txs: Execute[],
  batchOptions: { dev_forceMine: boolean }
): Promise<(Receipt | null)[]>;
rawTx(tx: SimpleTx): Promise<Receipt | null>; // execute a simple transaction
read( // make a read-only call to a contract
  name: string,
  options: CallOptions,
  methodName: string,
  ...args: any[]
): Promise<any>;
read(name: string, methodName: string, ...args: any[]): Promise<any>;
```

#### deploy function

The deploy function as mentioned allow you to deploy a contract and save it under a specific name.

The deploy function expect 2 parameters: one for the name and one for the options

See below the full list of fields that the option parameter allows and requires:

```js
from: string; // address (or private key) that will perform the transaction. you can use `getNamedAccounts` to retrived the address you want by name.
contract?: // this is an optional field. If not specified it defaults to the contract with the same name as the first parameter
  | string // this field can be either a string for the name of the contract
  | { // or abi and bytecode
      abi: ABI;
      bytecode: string;
      deployedBytecode?: string;
    };
args?: any[]; // the list of argument for the constructor (or the upgrade function in case of proxy)
skipIfAlreadyDeployed?: boolean; // if set it to true, will not attempt to deploy even if the contract deployed under the same name is different
log?: boolean; // if true, it will log the result of the deployment (address and gas used)
linkedData?: any; // This allow to associate any JSON data to the deployment. Useful for merkleize data for example
libraries?: { [libraryName: string]: Address }; // This let you associate libraries to the deployed contract
proxy?: boolean | string | ProxyOptions; // This options allow to consider yoru contract as a proxy (see below for more details)

// here some common tx options :
gasLimit?: string | number | BigNumber;
gasPrice?: string | BigNumber;
value?: string | BigNumber;
nonce?: string | number | BigNumber;

estimatedGasLimit?: string | number | BigNumber; // to speed up the estimation, it is possible to provide an upper gasLimit
estimateGasExtra?: string | number | BigNumber; // this option allow you to add a gas buffer on top of the estimation

dev_forceMine?: boolean; // this force a evm_mine to be executed. this is usefule to speed deployment on test network that allow to specify a block delay (ganache for example)
skipUnknownSigner?: boolean; // This options will prevent the call to throw if the signer for the `from` address is unavailbale. It will still display the information necessary to perform the tx. So instead of blocking the whole deployment flow, it will output all operation taht need to be done to finalise the deployment
useCreate2? boolean | string; // if true use the create2 deployment with 0x000.. salt. If it is a string, the string will be used as the salt.
```

## Deploying contracts that have libraries

In the deploy function, one of the `DeployOptions` that can be passed into the function is `libraries`.

First, deploy the library using the `deploy` function, then when we deploy a contract that needs the the linked library, we can pass the deployed library name and address in as an argument to the `libraries` object.

```
const exampleLibrary = await deploy("ExampleLibary", {
    from: <deployer>
    contractName: "ExampleLibrary"
});

```

ExampleLibrary is now deployed to whatever network is in the context of the environment.

For example, if we are deploying on Rinkeby, this library will get deployed on rinkeby, and the `exampleLibrary` variable will be an deployment object that contains the abi as well as the deployed address for the contract.

Now that the library is deployed, we can link it in our next deployed contract.

```
const example = await deploy("Example", {
    from: <deployer>
    contractName: "Example",
    args: ["This is an example string argument in the constructor for the 'Example' contract"],
    libraries: {
        ["ExampleLibrary"]: exampleLibrary.address
    }
});

```

This `libraries` object takes the name as a string of the library, and its deployed address on the network. Multiple libraries can be passed into the `libraries` object.

This works on buidler-deploy version `0.4.10` and above.

## Exporting Deployments

Apart from deployments saved in the `deployments` folder which contains all information available about the contract (compile time data + deployment data), `buidler-deploy` allows you to export lightweight file.

These can be used for example to power your frontend with contract's address and abi.

This come into 2 flavors.

The first one is exported via the `--export <file>` option and follow the following format :

```js
export interface Export {
  chainId: string;
  name: string;
  contracts: { [name: string]: ContractExport };
}
```

where name is the name of the network configuration chosen (see buidler option `--network`)

The second one is exported via the `--export-all <file>` option and follow the following format :

```js
export type MultiExport = {
  [chainId: string]: { [name: string]: Export }
};
```

As you see the second format include the previous. While in most case you'll need the single export where your application will support only one network, there are case where your app would want to support multiple network at nonce. This second format allow for that.

Furthermore as buidler support multiple network configuration for the same network (rinkeby, mainnet...), the export-all format will contains each of them grouped by their chainId.

## Proxies

As mentioned above, the deploy function can also deploy a contract through a proxy. It can be done without modification of the contract as long as it does not have a constructor (or constructor with zero arguments).

The Proxy is ERC-1967 Compliant, based on the [Transparent Proxy concept by open zeppelin](https://blog.openzeppelin.com/the-transparent-proxy-pattern/).

Code can be found [here](solc_0.6/proxy/TransparentProxy.sol)

To perform such proxy deployment, you just need to invoke the deploy function with the following options : `{..., proxy: true}`

See example :

```js
module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  await deploy("Greeter", {
    from: deployer,
    proxy: true
  });
};
```

You can also set it to `proxy: "<upgradeMethodName>"` in which case the function `upgradeMethodName` will be executed upon upgrade.
the `args` field will be then used for that function instead of the contructor. It is also possible to then have a constructor with the same arguments and have the proxy be disabled. It can be useful if you want to have your contract as upgradeable in a test network but be non-upgradeable on the mainnet. Further documentation need to written for that.

See example :

```js
module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  await deploy("Greeter", {
    from: deployer,
    proxy: "postUpgrade",
    args: ["arg1", 2, 3]
  });
};
```

The proxy option can also be an object which can set the specific owner that the proxy is going to be managed by.

See example:

```js
module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {
  const { deploy } = deployments;
  const { deployer, greeterOwner } = await getNamedAccounts();
  await deploy("Greeter", {
    from: deployer,
    proxy: {
      owner: greeterOwner,
      methodName: "postUpgrade"
    },
    args: ["arg1", 2, 3]
  });
};
```

Note that for the second invokation, this deployment will fails to upgrade the proxy as the `from` which is `deployer` is not the same as the proxy's owner : `greeterOwner`

As part of the error that will be throw, the tx data necessary for the upgrade will be emitted, allowing you to execute as the owner, maybe in a special interface if the owner is a multi sig, etc...

## Diamonds and Facets

The deployments field also expose the diamond field: `bre.deployments.diamond` that let you deploy [Diamonds](https://eips.ethereum.org/EIPS/eip-2535) in an easy way.

Instead of specifying the facets to cut out or cut in, which the diamond contract expect, you specify the facets you want to end up having on the deployed contract.

`diamond.deploy` expect the facet as names. The name represent the compiled contract name that going to be deployed as facet. In future version you ll be able to specify deployed contract or artifact object as facet.

To deploy a contract with 3 facet you can do as follow :

```js
module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {
  const { diamond } = deployments;
  const { deployer, diamondAdmin } = await getNamedAccounts();
  await diamond.deploy("ADiamondContract", {
    from: deployer,
    owner: diamondAdmin,
    facets: ["Facet1", "Facet2", "Facet3"]
  });
};
```

if you then later execute the following script:

```js
module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {
  const { diamond } = deployments;
  const { deployer, diamondAdmin } = await getNamedAccounts();
  await diamond.deploy("ADiamondContract", {
    from: diamondAdmin, // this need to be the diamondAdmin for upgrade
    owner: diamondAdmin,
    facets: ["NewFacet", "Facet2", "Facet3"]
  });
};
```

Then the NewFactet will be deployed automatically if needed and then the diamondCut will cut Facet1 out and add NewFacet.

Note that if the code for Facet2 and Facet3 changes, they will also be redeployed automatically and the diamondCuts will replace the existing facets with these new ones.

Note that The Diamond contract's code is part of buidler-deploy and contains 3 built-in facet that can be removed manually if desired.
These facets are used for ownership, diamondCut and diamond loupe.

The implementation is based on the [reference implementation by Nick Mudge](https://github.com/mudgen/Diamond) with some small modification to allow ownership change, see code [here](solc_0.6/proxy/diamond)

Like normal proxies you can also execute a function at the time of an upgrade.

This is done by specifying the execute field in the diamond deploy options :

```js
diamond.deploy("ADiamondContract", {
  from: deployer,
  owner: diamondAdmin,
  facets: ["NewFacet", "Facet2", "Facet3"],
  execute: {
    methodName: "postUpgrade",
    args: ["one", 2, "0x3"]
  }
});
```

Since the diamond standard has no builtin mechanism to make the execution atomic, the Diamond when deployed is actually deployed along a special contract, the `Diamantaire` (see code [here](solc_0.6/proxy/diamond/Diamantaire.sol)) that act as a wrapper to the diamond that can only be executed by the specified `owner`,
The actual owner of the Diamond is this contract and not the address specified in the option. The latter is the owner of the Diamantaire contract instead.

This contract add the functionality to perform atomic upggrade with method execution.

If you need to execute a function as an owner, you can use the following that make the transaction go through the `Diamantaire` contract :

```js
diamond.executeAsOwner(
  "ADiamondContract",
  {
    from: diamondAdmin
  },
  "methodToExecute",
  "arg1",
  2,
  "arg3"
);
```

## Tests

You can continue using the usual test task :

`buidler test`

Tests can then use the `bre.deployments.fixture` function to run the deployment for the test and snapshot it so that tests don't need to perform all the deployments transaction every time, they simply reuse the snapshot for every test (this leverages `evm_snapshot` and `evm_revert` provided by both `buidlerevm` and `ganache`). You can for example set them in a `beaforeEach`.

Here is an example of a test :

```js
const { deployments } = require("@nomiclabs/buidler");

describe("Token", () => {
  beforeEach(async () => {
    await deployments.fixture();
  });
  it("testing 1 2 3", async function() {
    const Token = await deployments.get("Token"); // Token is available because the fixture was executed
    console.log(Token.address);
    const ERC721BidSale = await deployments.get("ERC721BidSale");
    console.log({ ERC721BidSale });
  });
});
```

If the deployment scripts are complex, the first test could take while (as the fixture need to execute the deployment) but then from the second test onward, the deployments are never re-executed, instead the fixture will do `evm_revert` and test will run far faster.

Tests can also leverage named accounts for clearer test. Combined with `buidler-ethers-v5` plugin, you can write succint test :

```js
const { ethers, getNamedAccounts } = require("@nomiclabs/buidler");

describe("Token", () => {
  beforeEach(async () => {
    await deployments.fixture();
  });
  it("testing 1 2 3", async function() {
    const { tokenOwner } = await getNamedAccounts();
    const TokenContract = await ethers.getContract("Token", tokenOwner);
    await TokenContract.mint(2);
  });
});
```

Furthermore, tests can easily create efficient fixture using `deployments.createFixture`

See example :

```js
const setupTest = deployments.createFixture(async ({deployments, getNamedAccounts, ethers}, options) => {
  await deployments.fixture(); // ensure you start from a fresh deployments
  const { tokenOwner } = await getNamedAccounts();
  const TokenContract = await ethers.getContract("Token", tokenOwner);
  await TokenContract.mint(10); //this mint is executed once and then `createFixture` will ensure it is snapshotted
  return {
    tokenOwner: {
      address: tokenOwner,
      TokenContract
    }
  };
};
describe("Token", () => {
  it("testing 1 2 3", async function() {
    const {tokenOwner} = await setupTest()
    await tokenOwner.TokenContract.mint(2);
  });
});
```

While this example is trivial, some fixture can requires several transaction and the ability to snapshot them automatically speed up the tests greatly.

## Buidler Task Informations

### node task

as mentioned above, the node task is slighly modified and augmented with various flag and options

`buidler node`

In particulat It adds an argument `--export` that allows you to specify a destination file where the info about the contracts deployed is written.
Your webapp can then access all contracts information.

### run task

`buidler --network <networkName> run <script>`

The run task act as before but thanks to the `bre.deployments` field it can access deployed contract :

```js
const bre = require("@nomiclabs/buidler");
const { deployments, getNamedAccounts } = bre;

(async () => {
  console.log(await deployments.all());
  console.log({ namedAccounts: await getNamedAccounts() });
})();
```

You can also run it directly from the command line as usual.

`BUIDLER_NETWORK=rinkeby node <script>` is the equivalent except it does not load the buidler environment twice (which the run task does)

### console task

`buidler console`

The same applies to the `console` task.

## deploy scripts tags and dependencies

It is possible to execute only specific part of the deployments with `buidler deploy --tags <tags>`

Tags represent what the deploy script acts on. In general it will be a single string value, the name of the contract it deploys or modifies.

Then if another deploy script has such tag as a dependency, then when this latter deploy script has a specific tag and that tag is requested, the dependency will be executed first.

Here is an example of two deploy scripts :

```js
module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deployIfDifferent, log } = deployments;
  const namedAccounts = await getNamedAccounts();
  const { deployer } = namedAccounts;
  const deployResult = await deploy("Token", {
    from: deployer,
    args: ["hello", 100]
  });
  if (deployResult.newlyDeployed) {
    log(
      `contract Token deployed at ${deployResult.contract.address} using ${deployResult.receipt.gasUsed} gas`
    );
  }
};
module.exports.tags = ["Token"];
```

```js
module.exports = async function({ getNamedAccounts, deployments }) {
  const { deployIfDifferent, log } = deployments;
  const namedAccounts = await getNamedAccounts();
  const { deployer } = namedAccounts;
  const Token = await deployments.get("Token");
  const deployResult = await deploy("Sale", {
    from: deployer,
    contractName: "ERC721BidSale",
    args: [Token.address, 1, 3600]
  });
  if (deployResult.newlyDeployed) {
    log(
      `contract Sale deployed at ${deployResult.contract.address} using ${deployResult.receipt.gasUsed} gas`
    );
  }
};
module.exports.tags = ["Sale"];
module.exports.dependencies = ["Token"]; // this ensure the TOken script above is executed first, so `deployments.get('Token') succeeds
```

As you can see the second one depends on the first. This is because the second script depends on a tag that the first script registers as using.

With that when `buidler deploy --tags Sale` is executed

then both scripts will be run, ensuring Sale is ready.

You can also define the script to run after another script is run by setting `runAtTheEnd` to be true. For example:

```js
module.exports = async function({ getNamedAccounts, deployments }) {
  const { deployIfDifferent, execute, log } = deployments;
  const namedAccounts = await getNamedAccounts();
  const { deployer, admin } = namedAccounts;
  await execute("Sale", { from: deployer }, "setAdmin", admin);
};
module.exports.tags = ["Sale"];
module.exports.runAtTheEnd = true;
```
