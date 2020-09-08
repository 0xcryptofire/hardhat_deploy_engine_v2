import "@nomiclabs/buidler/types";
import { boolean } from "@nomiclabs/buidler/internal/core/params/argumentTypes";

declare module "@nomiclabs/buidler/types" {
  export interface BuidlerRuntimeEnvironment {
    deployments: DeploymentsExtension;
    getNamedAccounts: () => Promise<{
      [name: string]: Address;
    }>;
    // TODO getUnnamedAccounts: () => Promise<Address[]>; // useful for testing
    getChainId(): Promise<string>;
  }

  export interface BuidlerNetworkConfig {
    live?: boolean;
    saveDeployments?: boolean;
  }

  export interface HttpNetworkConfig {
    live?: boolean;
    saveDeployments?: boolean;
  }

  export interface Network {
    live: boolean;
    saveDeployments: boolean;
  }

  export interface DeployFunction {
    (env: BuidlerRuntimeEnvironment): Promise<void | boolean>;
    skip?: (env: BuidlerRuntimeEnvironment) => Promise<boolean>;
    tags?: string[];
    dependencies?: string[];
    runAtTheEnd?: boolean;
  }

  export type BigNumber = any; // TODO bignumber form ethers
  export type Address = string;

  export type ABI = any[]; // TODO abi

  export type Log = {
    blockNumber: number;
    blockHash: string;
    transactionHash: string;
    transactionIndex: number;
    logIndex: number;
    removed: boolean;
    address: string;
    topics: string[];
    data: string;
  };

  export type Receipt = {
    from: Address;
    transactionHash: string;
    blockHash: string;
    blockNumber: number;
    transactionIndex: number;
    cumulativeGasUsed: BigNumber | string | number;
    gasUsed: BigNumber | string | number;
    contractAddress?: string;
    to?: Address;
    logs?: Log[];
    events?: any[];
    logsBloom?: string;
    byzantium?: boolean;
    status?: number;
    confirmations?: number;
  };

  export type DiamondFacets = Array<string>; // TODO support Object for facet : {contract} // could be deploymentNames too ? or {abi,address}
  export interface DiamondOptions extends TxOptions {
    owner?: Address;
    facets: DiamondFacets;
    log?: boolean;
    libraries?: Libraries;
    linkedData?: any; // JSONable ?
    upgradeIndex?: number;
    execute?: {
      methodName: string;
      args: any[];
    };
  }

  export interface ProxyOptions {
    owner?: Address;
    upgradeIndex?: number;
    methodName?: string;
  }

  export interface DeployOptionsBase extends TxOptions {
    contract?:
      | string
      | {
          abi: ABI;
          bytecode: string;
          deployedBytecode?: string;
          metadata?: string;
          methodIdentifiers?: any;
          storageLayout?: any;
          userdoc?: any;
          devdoc?: any;
          gasEstimates?: any;
        };
    args?: any[];
    fieldsToCompare?: string | string[];
    skipIfAlreadyDeployed?: boolean;
    linkedData?: any; // JSONable ?
    libraries?: Libraries;
    proxy?: boolean | string | ProxyOptions; // TODO support different type of proxies ?
  }

  export interface DeployOptions extends DeployOptionsBase {
    useCreate2?: boolean | string;
  }

  export interface Create2DeployOptions extends DeployOptionsBase {
    salt?: string;
  }

  export interface CallOptions {
    from?: string;
    gasLimit?: string | number | BigNumber;
    gasPrice?: string | BigNumber;
    value?: string | BigNumber;
    nonce?: string | number | BigNumber;
    to?: string; // TODO make to and data part of a `SimpleCallOptions` interface
    data?: string;
  }

  export interface TxOptions extends CallOptions {
    from: string;
    log?: boolean;
    dev_forceMine?: boolean;
    skipUnknownSigner?: boolean;
    estimatedGasLimit?: string | number | BigNumber;
    estimateGasExtra?: string | number | BigNumber;
  }

  export interface Execute extends TxOptions {
    name: string;
    methodName: string;
    args?: any[];
  }

  export interface SimpleTx extends TxOptions {
    to: string;
  }

  export interface DeployedContract {
    address: Address;
    abi: ABI;
  }

  export interface DeployResult extends Deployment {
    newlyDeployed: boolean;
  }

  export type Json =
    | null
    | boolean
    | number
    | string
    | Json[]
    | { [prop: string]: Json };

  // from https://github.com/Microsoft/TypeScript/issues/1897#issuecomment-580962081
  type JsonCompatible<T> = {
    [P in keyof T]: T[P] extends Json
      ? T[P]
      : Pick<T, P> extends Required<Pick<T, P>>
      ? never
      : T[P] extends (() => any) | undefined
      ? never
      : JsonCompatible<T[P]>;
  };

  export type FixtureFunc = (
    env: BuidlerRuntimeEnvironment,
    options?: Json
  ) => Promise<any>;

  export interface DeploymentsExtension {
    deploy(name: string, options: DeployOptions): Promise<DeployResult>;
    diamond: {
      deploy(name: string, options: DiamondOptions): Promise<DeployResult>;
      executeAsOwner(
        name: string,
        options: TxOptions,
        methodName: string,
        ...args: any[]
      ): Promise<Receipt | null>;
    };
    create2(
      name: string,
      options: Create2DeployOptions
    ): Promise<{
      address: Address;
      deploy(): Promise<DeployResult>;
    }>;
    fetchIfDifferent(
      name: string,
      options: DeployOptions
    ): Promise<{ differences: boolean; address?: string }>;
    save(name: string, deployment: DeploymentSubmission): Promise<void>;
    get(name: string): Promise<Deployment>;
    getOrNull(name: string): Promise<Deployment | null>;
    all(): Promise<{ [name: string]: Deployment }>;
    // getArtifactSync(name: string): Artifact; // TODO remove ?
    getArtifact(name: string): Promise<Artifact>;
    run(
      tags?: string | string[],
      options?: {
        resetMemory?: boolean;
        deletePreviousDeployments?: boolean;
        writeDeploymentsToFiles?: boolean;
        export?: string;
        exportAll?: string;
      }
    ): Promise<{ [name: string]: Deployment }>;
    fixture(tags?: string | string[]): Promise<{ [name: string]: Deployment }>;
    createFixture(func: FixtureFunc, id?: string): () => Promise<any>; // TODO Type Parameter
    log(...args: any[]): void;

    execute(
      name: string,
      options: TxOptions,
      methodName: string,
      ...args: any[]
    ): Promise<Receipt | null>;
    batchExecute(
      txs: Execute[],
      batchOptions: { dev_forceMine: boolean }
    ): Promise<(Receipt | null)[]>;
    rawTx(tx: SimpleTx): Promise<Receipt | null>;
    read(
      name: string,
      options: CallOptions,
      methodName: string,
      ...args: any[]
    ): Promise<any>;
    read(name: string, methodName: string, ...args: any[]): Promise<any>;
    // rawCall(to: Address, data: string): Promise<any>; // TODO ?
  }

  export interface BuidlerConfig {
    namedAccounts?: {
      [name: string]:
        | string
        | number
        | { [network: string]: null | number | string };
    }; // TODO better type ? to ensure it ends with string ?
    external?: {
      deployments?: {
        [networkName: string]: string[];
      };
      artifacts?: string[];
    };
  }

  export interface ProjectPaths {
    deploy?: string;
    deployments?: string;
    imports?: string;
  }

  export interface ContractExport {
    address: string;
    abi: any[];
    linkedData?: any;
  }

  export interface Export {
    chainId: string;
    name: string;
    contracts: { [name: string]: ContractExport };
  }

  export type MultiExport = {
    [chainId: string]: { [name: string]: Export };
  };

  export type Libraries = { [libraryName: string]: Address };

  export interface DeploymentSubmission {
    abi: ABI;
    address: Address; // used to override receipt.contractAddress (useful for proxies)
    receipt?: Receipt;
    transactionHash?: string;
    history?: Deployment[];
    args?: any[];
    linkedData?: any;
    solcInput?: string;
    solcInputHash?: string;
    metadata?: string;
    bytecode?: string;
    deployedBytecode?: string;
    userdoc?: any;
    devdoc?: any;
    methodIdentifiers?: any;
    diamondCuts?: string[];
    facets?: { address: string; sigs: string[] }[];
    execute?: {
      methodName: string;
      args: any[];
    };
    storageLayout?: any;
    libraries?: Libraries;
    gasEstimates?: any;
  }

  // export type LibraryReferences = {
  //   [filepath: string]: { [name: string]: { length: number; start: number }[] };
  // };

  export interface Deployment {
    abi: ABI;
    address: Address;
    receipt?: Receipt;
    transactionHash?: string;
    history?: Deployment[];
    args?: any[];
    linkedData?: any;
    solcInputHash?: string;
    metadata?: string;
    bytecode?: string;
    deployedBytecode?: string;
    libraries?: Libraries;
    userdoc?: any;
    devdoc?: any;
    methodIdentifiers?: any;
    diamondCuts?: string[];
    facets?: { address: string; sigs: string[] }[];
    storageLayout?: any;
    gasEstimates?: any;
  }
}
