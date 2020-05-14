import pgPromise from "pg-promise";
import {BigNumber} from "bignumber.js";
import * as config from "./config";


const pgp = pgPromise();
const db = pgp(config.connString());

export interface Server {
    id: number;
    game: string;
    email: string;
}

export function authenticateServer(password: string, ipAddress: string): Promise<Server|null> {
  console.log(password, ipAddress);
  return new Promise((resolve, reject) => {
    db.any(`SELECT id, game, email
            FROM servers
            WHERE password=crypt($1, password)
              AND ip_address=$2`, [
      password,
      ipAddress
    ])
    .then((data) => {
      if (data !== null && data.length === 1) {
        return resolve({
          id:    data[0].id,
          game:  data[0].game,
          email: data[0].email
        });
      } else {
        return resolve(null);
      }
    });
  });
}

export function getUserId(serverId: number, username: string): Promise<number|null> {
  return new Promise((resolve, reject) => {
    db.any(`SELECT id
            FROM users
            WHERE game_username=$1
              AND server_id=$2`, [username, serverId])
    .then((data) => {
      if (data !== null && data.length === 1) {
        return resolve(data[0].id);
      } else {
        return resolve(null);
      }
    });
  });
}

export function getOrCreateUserId(serverId: number, username: string): Promise<number> {
  return new Promise((resolve, reject) => {
    getUserId(serverId, username)
    .then((id) => {
      if (id === null) {
        db.one(`INSERT INTO users (
          game,
          game_username,
          server_id
        ) VALUES ('minecraft', $1, $2)
        RETURNING id`, [
          username,
          serverId
        ])
        .then((idata) => {
          return resolve(idata.id);
        });
      } else {
        return resolve(id);
      }
    });
  });
}

export function getTokenBalance(balances: Map<string, BigNumber>, tokenName: string): BigNumber {
  if (! balances.has(tokenName)) {
    return new BigNumber(0);
  } else {
    return balances.get(tokenName)!;
  }
}

export function getAllTokenBalances(userId: number): Promise<Map<string, BigNumber>> {
  return new Promise((resolve, reject) => {
    db.any(`SELECT balances
            FROM users
            WHERE id=$1`, [userId])
    .then((data: any) => {
      if (data !== null && data.length === 1) {
        const balances = new Map<string, BigNumber>();

        for (const [k, v] of Object.entries(data[0].balances)) {
          balances.set(k, new BigNumber(v as string));
        }

        return resolve(balances);
      }

      return reject();
    });
  });
}

export interface TransferResult {
  success: boolean;
  errorMsg: string|null;
};

export interface Token {
  id: string;
  name: string;
  symbol: string;
}

export function getTokenByName(tokenName: string): Promise<Token|null> {
  return new Promise((resolve, reject) => {
    db.any(`SELECT id, name, symbol
            FROM tokens
            WHERE name=$1`, [tokenName])
    .then((data) => {
      if (data !== null && data.length === 1) {
        return resolve({
          id:     data[0].id,
          name:   data[0].name,
          symbol: data[0].symbol
        });
      } else {
        return resolve(null);
      }
    });
  });
}

export function getTokenById(tokenId: string): Promise<Token|null> {
  return new Promise((resolve, reject) => {
    db.any(`SELECT id, name, symbol
            FROM tokens
            WHERE id=$1`, [tokenId])
    .then((data) => {
      if (data !== null && data.length === 1) {
        return resolve({
          id:     data[0].id,
          name:   data[0].name,
          symbol: data[0].symbol
        });
      } else {
        return resolve(null);
      }
    });
  });
}

export function transfer(
  serverId: number,
  sendUserId: number,
  recvUserId: number,
  token: Token,
  amount: BigNumber
): Promise<TransferResult> {
  return new Promise((resolve, reject) => {
    db.tx(async (t) => {
      const sendBalance: BigNumber = getTokenBalance(await getAllTokenBalances(sendUserId), token.name);
      const recvBalance: BigNumber = getTokenBalance(await getAllTokenBalances(recvUserId), token.name);
      const newSendBalance: BigNumber = sendBalance.minus(amount);
      const newRecvBalance: BigNumber = recvBalance.plus(amount);

      if (newSendBalance.isLessThan(new BigNumber(0))) {
        return resolve({
          success: false,
          errorMsg: 'You do not have enough tokens nigga'
        });
      }

      await t.none(`UPDATE users
                    SET balances = balances || '{"${token.name}": "${newSendBalance.toString()}"
                    WHERE id=send_user_id`);

      await t.none(`UPDATE users
                    SET balances = balances || '{"${token.name}": "${newRecvBalance.toString()}"
                    WHERE id=recv_user_id`);

      await t.none(`INSERT INTO transfers (
                      send_user_id,
                      recv_user_id,
                      token_id,
                      server_id,
                      amount
                    ) VALUES ($1, $2, $3, $4, $5::numeric)`, [
        sendUserId,
        recvUserId,
        token.id,
        serverId,
        amount.toString()
      ]);

      return resolve({
        success: true,
        errorMsg: null
      });
    })
  });
}
