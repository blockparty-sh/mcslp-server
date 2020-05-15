import {BigNumber} from "bignumber.js";
import * as bitcore from "bitcore-lib-cash";
import * as slpjs from "slpjs";
import * as config from "./config";

declare module "bitcore-lib-cash" {
    export class HDPrivateKey {
      privateKey: any; // should be PrivateKey but slpjs broken typings
      publicKey: any; // should be PublicKey but slpjs broken typings
      xprivkey: string;


      constructor(arg?: string|Buffer|object);
      derive(arg: string|number, hardened?: boolean): HDPrivateKey;
      deriveChild(arg: string|number, hardened?: boolean): HDPrivateKey;

    }
}

const hdPrivateKey = new bitcore.HDPrivateKey(config.privateKey());

export function getAddress(serverId: number, userId: number): string {
  return slpjs.Utils.toSlpAddress(
	hdPrivateKey
      .deriveChild(serverId)
      .deriveChild(userId)
      .publicKey.toAddress().toString()
  );
}
