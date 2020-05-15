import express from "express";
import path from "path";
import {BigNumber} from "bignumber.js";
import * as mojang from "./mojang";
import * as db from "./db";
import * as config from "./config";
import * as slp from "./slp";

const app = express();

app.enable('trust proxy');

app.use(express.static('public'));
app.set("views", path.join( __dirname, "../views" ));
app.set("view engine", "ejs");


app.get('/', (req: any, res) => {
  res.render("index");
});

const helpText = (): string => `Magic Pixel | magicpixel.xyz
/mpx balance [token?]
/mpx send [username] [amount] [token?]`;

function getBalances(serverId: number, uuid: string): Promise<Map<string, BigNumber>> {
  return new Promise((resolve, reject) => {
    db.getOrCreateUserId(serverId, uuid)
    .then((userId) => {
      db.getAllTokenBalances(userId)
      .then((balances) => {
        resolve(balances);
      });
    });
  });
}

app.post('/api/command/minecraft', (req: any, res) => {
  // console.log(req);
  db.authenticateServer(req.header('X-Auth-Token'), req.ip)
  .then((serverData: db.Server|null) => {
    if (serverData === null) {
      return res.json({
        msg: 'Could not authenticate'
      });
    }

    if (typeof req.query.q === 'undefined') {
      return res.json({
        msg: 'Query parameter "q" does not exist'
      });
    }

    const q: string = req.query.q.trim();
    const cmd: string[] = q.split(' ');
    const uuid: string = req.query.uuid.replace(/-/g, '');

    if (cmd.length === 0) {
      return res.json({
        msg: helpText()
      });
    }

    if (cmd[0] === 'help') {
      return res.json({
        msg: helpText()
      });
    }
    else if (cmd[0] === 'version') {
      return res.json({
        msg: 'Magic Pixel 0.0.1 | magicpixel.xyz'
      });
    }
    else if ((cmd[0] === 'b' || cmd[0] === 'balance') &&
             (cmd.length === 1 || cmd.length === 2)
    ) {
      getBalances(serverData.id, uuid)
      .then((balances) => {
        let msg = "";

        if (cmd.length === 1) {
          for (const [k, v] of balances) {
            msg += `${v} ${k}\n`;
          }
        } else if (cmd.length === 2) {
          for (const [k, v] of balances) {
            if (k === cmd[1]) {
              msg += `${v} ${k}\n`;
            }
          }
        }

        return res.json({
          msg
        });
      });
    }
    else if ((cmd[0] === 's' || cmd[0] === 'send') &&
             (cmd.length === 3 || cmd.length === 4)
    ) {
      console.log(cmd);
      const sendUuid:  string    = uuid.replace(/-/g, '');
      const username:  string    = cmd[1].toLowerCase();
      const amount:    BigNumber = new BigNumber(cmd[2]);
      const tokenName: string    = ((cmd.length === 4) ? cmd[3] : "MPX").toLowerCase();

      Promise.all([
        // ensure sending uuid exists
        mojang.lookupMinecraftUsername(sendUuid),
        // ensure receiving username exists
        mojang.lookupMinecraftUuid(username)
      ])
      .then(([sendUsername, recvUuid]) => {
        if (sendUsername === null) {
          return res.json({
            msg: `"${username}" not found, check spelling`
          });
        }

        if (recvUuid === null) {
          return res.json({
            msg: 'Receiver not found\n/mpx send [username] [amount] [token]'
          });
        }

        Promise.all([
          db.getOrCreateUserId(serverData.id, sendUuid),
          db.getOrCreateUserId(serverData.id, recvUuid),
          db.getTokenByName(tokenName)
        ])
        .then(([sendUserId, recvUserId, token]) => {
          if (sendUserId === null) {
            return res.json({
              msg: 'Send uuid not found'
            });
          }

          if (token === null) {
            return res.json({
              msg: `Token "${tokenName}" not found`
            });
          }

          if (sendUserId === recvUserId) {
            return res.json({
              msg: 'Cannot send to yourself'
            });
          }

          if (amount.isLessThan(1)) {
            return res.json({
              msg: `Cannot send less than 1 ${tokenName}`
            });
          }

          db.transfer(serverData.id, sendUserId, recvUserId, token, amount)
          .then((result: db.TransferResult) => {
            if (result.success) {
              return res.json({
                msg: `Sent ${amount} ${tokenName} to ${username}`,
                msgs: [
                  {
                    uuid: recvUuid,
                    msg: `${sendUsername} sent you ${amount} ${tokenName}`
                  }
                ]
              });
            } else {
              return res.json({
                msg: result.errorMsg
              });
            }
          })
        });
      });
    }
    else {
      return res.json({
        msg: helpText()
      });
    }
  });
});

app.get('/api/balance/:uuid', (req: any, res) => {
  db.authenticateServer(req.header('X-Auth-Token'), req.ip)
  .then((serverData: db.Server|null) => {
    if (serverData === null) {
      return res.json({
        success: false,
        msg: 'could not authenticate',
      });
    }

    getBalances(serverData.id, req.params.uuid)
    .then((balances) => {
      const ret: any = {};
      for (const [k, v] of balances) {
        ret[k] = v;
      }

      return res.json({
        success: true,
        msg: ret
      });
    });
  });
});

app.post('/api/send/:uuid1/:uuid2/:token_id/:amount', (req: any, res) => {
  const sendUuid: string = req.params.uuid1.replace(/-/g, '');
  const recvUuid: string = req.params.uuid2.replace(/-/g, '');
  const tokenId: string = req.params.token_id;
  const amount: BigNumber = new BigNumber(req.params.amount);

  db.authenticateServer(req.header('X-Auth-Token'), req.ip)
  .then((serverData: db.Server|null) => {
    if (serverData === null) {
      return res.json({
        success: false,
        msg: 'could not authenticate',
      });
    }

    Promise.all([
      // ensure sending uuid exists
      mojang.lookupMinecraftUsername(sendUuid),
      // ensure receiving username exists
      mojang.lookupMinecraftUsername(recvUuid)
    ])
    .then(([sendUsername, recvUsername]) => {
      if (sendUsername === null) {
        return res.json({
          success: false,
          msg: 'could not find uuid1'
        });
      }

      if (recvUsername === null) {
        return res.json({
          success: false,
          msg: 'could not find uuid2'
        });
      }

      Promise.all([
        db.getOrCreateUserId(serverData.id, sendUuid),
        db.getOrCreateUserId(serverData.id, recvUuid),
        db.getTokenById(tokenId)
      ])
      .then(([sendUserId, recvUserId, token]) => {
        if (token === null) {
          return res.json({
            success: false,
            error: 'token not found',
          });
        }

        if (sendUserId === recvUserId) {
          return res.json({
            success: false,
            msg: 'cannot send to yourself'
          });
        }

        db.transfer(serverData.id, sendUserId, recvUserId, token, amount)
        .then((result: db.TransferResult) => {
          if (result.success) {
            return res.json({
              success: true,
              msg: 'Successfully sent',
            });
          } else {
            return res.json({
              success: false,
              msg: result.errorMsg,
            });
          }
        })
      });
    });
  });
});

app.get('/api/tokens', (req: any, res) => {
  db.getAllTokens()
  .then((tokens) => {
    return res.json(tokens);
  });
});

app.get('/api/servers', (req: any, res) => {
  db.getAllServers()
  .then((servers) => {
    return res.json(servers.map(t => ({
      id:         t.id,
      game:       t.game,
      ip_address: t.ip_address
    })));
  });
});

app.get('/api/minecraft/lookup_uuid/:username', (req: any, res) => {
  mojang.lookupMinecraftUuid(req.params.username)
  .then((uuid) => {
    return res.json({
      uuid
    });
  });
});

app.get('/api/deposit/minecraft', (req: any, res) => {
  const ret: any = [];
  for (let i=0; i<20; ++i) {
    for (let j=0; j<20; ++j) {
      ret.push(slp.getAddress(i, j));
    }
  }
  return res.json(ret);
});

app.get('/deposit', (req: any, res) => {
  res.render("deposit");
});

app.get('/api/deposit/minecraft/:uuid', (req: any, res) => {
  const uuid = req.params.uuid;

  mojang.lookupMinecraftUsername(uuid)
  .then((username) => {
    if (username === null) {
      return res.json({
        error: 'uuid not found'
      });
    }

    db.getAllServers()
    .then((servers) => {
      Promise.all(servers.map((s) => {
        return db.getOrCreateUserId(s.id, uuid)
        .then((userId) => ({
          server: s,
          address: slp.getAddress(s.id, userId)
        }));
      }))
      .then((addressPairs) => {
        return res.json(addressPairs);
      });
    });
  });
});

app.post('/api/server/transfers', (req: any, res) => {
  db.authenticateServer(req.header('X-Auth-Token'), req.ip)
  .then((serverData: db.Server|null) => {
    if (serverData === null) {
      return res.json({
        success: false,
        msg: 'could not authenticate',
      });
    }

    db.getAllServerTransfers(serverData.id)
    .then((transfers) => {
      return res.json(transfers);
    });
  });
});

app.listen(config.port(), () => {
  console.log(`server started at http://localhost:${config.port()}`);
});
