import pgPromise from "pg-promise";
import {BigNumber} from "bignumber.js";
import * as config from "./config";


const pgp = pgPromise();
const db = pgp(config.connString());

export interface Server {
    id:         number;
    game:       string;
    email:      string;
    ip_address: string;
}

export function authenticateServer(password: string, ipAddress: string): Promise<Server|null> {
  console.log(password, ipAddress);
  return new Promise((resolve, reject) => {
    db.any(`SELECT id, game, email, ip_address
            FROM servers
            WHERE password=crypt($1, password)
              AND ip_address=$2`, [
      password,
      ipAddress
    ])
    .then((data) => {
      if (data !== null && data.length === 1) {
        return resolve({
          id:         data[0].id,
          game:       data[0].game,
          email:      data[0].email,
          ip_address: data[0].ip_address,
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
}

export function getTokenByName(tokenName: string): Promise<Token|null> {
  return new Promise((resolve, reject) => {
    db.any(`SELECT id, name
            FROM tokens
            WHERE name=$1`, [tokenName])
    .then((data) => {
      if (data !== null && data.length === 1) {
        return resolve({
          id:     data[0].id,
          name:   data[0].name,
        });
      } else {
        return resolve(null);
      }
    });
  });
}

export function getTokenById(tokenId: string): Promise<Token|null> {
  return new Promise((resolve, reject) => {
    db.any(`SELECT id, name
            FROM tokens
            WHERE id=$1`, [tokenId])
    .then((data) => {
      if (data !== null && data.length === 1) {
        return resolve({
          id:     data[0].id,
          name:   data[0].name,
        });
      } else {
        return resolve(null);
      }
    });
  });
}

export function getAllTokens(): Promise<Token[]> {
  return new Promise((resolve, reject) => {
    db.any(`SELECT id, name
            FROM tokens`)
    .then((data) => {
      return resolve(data.map(d => ({
        id:     d.id,
        name:   d.name,
      })));
    });
  });
}

export function getAllServers(): Promise<Server[]> {
  return new Promise((resolve, reject) => {
    db.any(`SELECT id, game, email, ip_address
            FROM servers`)
    .then((data) => {
      return resolve(data.map(d => ({
        id:         d.id,
        game:       d.game,
        email:      d.email,
        ip_address: d.ip_address,
      })));
    });
  });
}

export interface Transfer {
  id: number;
  send_username: string;
  recv_username: string;
  server_id: number;
  token_id: string;
  amount: BigNumber;
  ts: string;
}

export function getAllServerTransfers(serverId: number): Promise<Transfer[]> {
  return new Promise((resolve, reject) => {
    db.any(`SELECT t.id,
                   t.server_id,
                   t.token_id,
                   t.amount,
                   t.ts,
                   su.game_username AS send_username,
                   ru.game_username AS recv_username
            FROM transfers AS t
            INNER JOIN users su ON t.send_user_id=su.id AND su.server_id=$1
            INNER JOIN users ru ON t.recv_user_id=ru.id AND ru.server_id=$1
            WHERE t.server_id=$1`, [serverId])
    .then((data) => {
      return resolve(data.map(d => ({
        id:            d.id,
        send_username: d.send_username,
        recv_username: d.recv_username,
        server_id:     d.server_id,
        token_id:      d.token_id,
        amount:        d.amount,
        ts:            d.ts,
      })));
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
      console.log(await getAllTokenBalances(sendUserId));
      console.log(await getAllTokenBalances(recvUserId));
      const sendBalance: BigNumber = getTokenBalance(await getAllTokenBalances(sendUserId), token.name);
      const recvBalance: BigNumber = getTokenBalance(await getAllTokenBalances(recvUserId), token.name);
      const newSendBalance: BigNumber = sendBalance.minus(amount);
      const newRecvBalance: BigNumber = recvBalance.plus(amount);

      if (newSendBalance.isLessThan(new BigNumber(0))) {
        return resolve({
          success: false,
          errorMsg: sendBalance.isLessThanOrEqualTo(new BigNumber(0))
            ? `You don't have any ${token.name}`
            : `You only have ${sendBalance.toString()} ${token.name}`
        });
      }

      await t.none(`UPDATE users
                    SET balances = balances || '{"${token.name}": "${newSendBalance.toString()}"}'
                    WHERE id=$1`, [sendUserId]);

      await t.none(`UPDATE users
                    SET balances = balances || '{"${token.name}": "${newRecvBalance.toString()}"}'
                    WHERE id=$1`, [recvUserId]);

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
