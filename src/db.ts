import pgPromise from "pg-promise";
import {BigNumber} from "bignumber.js";
import * as config from "./config";


const pgp = pgPromise();
const db = pgp(config.connString());

export function getUserId(username: string): Promise<number|null> {
  return new Promise((resolve, reject) => {
    db.any('SELECT id FROM users WHERE game_username=$1', [username])
    .then((data) => {
      if (data !== null && data.length === 1) {
        return resolve(data[0].id);
      } else {
        return resolve(null);
      }
    });
  });
}

export function getOrCreateUserId(username: string): Promise<number> {
  return new Promise((resolve, reject) => {
    getUserId(username)
    .then((id) => {
      if (id === null) {
        db.one(`INSERT INTO users (
          game,
          game_username
        ) VALUES ('minecraft', $1)
        RETURNING id`, [
          username
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

export function getTokenBalance(userId: number, tokenId: string): Promise<BigNumber> {
  return new Promise((resolve, reject) => {
    db.any('SELECT balances FROM users WHERE id=$1', [userId])
    .then((data: any) => {
      if (data !== null && data.length === 1) {
        const balances = data[0].balances;

        if (balances.hasOwnProperty(tokenId)) {
          return resolve(new BigNumber(balances[tokenId]));
        } else {
          return resolve(new BigNumber(0));
        }
      }

      return reject();
    });
  });
}

export interface TransferResult {
  success: boolean;
  errorMsg: string|null;
};

export function transfer(
  sendUserId: number,
  recvUserId: number,
  tokenId: string,
  amount: BigNumber
): Promise<TransferResult> {
  return new Promise((resolve, reject) => {
    db.tx(async (t) => {
      const sendBalance: BigNumber = await getTokenBalance(sendUserId, tokenId);
      const recvBalance: BigNumber = await getTokenBalance(recvUserId, tokenId);
      const newSendBalance: BigNumber = sendBalance.minus(amount);
      const newRecvBalance: BigNumber = recvBalance.plus(amount);

      if (newSendBalance.isLessThan(new BigNumber(0))) {
        return resolve({
          success: false,
          errorMsg: 'You do not have enough tokens nigga'
        });
      }

      await t.none(`UPDATE users
                    SET balances = balances || '{"${tokenId}": "${newSendBalance.toString()}"
                    WHERE id=send_user_id`);

      await t.none(`UPDATE users
                    SET balances = balances || '{"${tokenId}": "${newRecvBalance.toString()}"
                    WHERE id=recv_user_id`);

      await t.none(`INSERT INTO transfers (
                      send_user_id,
                      recv_user_id,
                      token_id,
                      amount
                    ) VALUES ($1, $2, $3, $4::numeric)`, [
        sendUserId,
        recvUserId,
        tokenId,
        amount.toString()
      ]);

      return resolve({
        success: true,
        errorMsg: null
      });
    })
  });
}
