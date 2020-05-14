import dotenv from "dotenv";
import express from "express";
import path from "path";
import {BigNumber} from "bignumber.js";
import * as mojang from "./mojang";
import * as db from "./db";
import * as config from "./config";

dotenv.config();

const app = express();

app.set("views", path.join( __dirname, "../views" ));
app.set("view engine", "ejs");


app.get('/', (req: any, res) => {
  res.render("index");
});

app.get('/api/balance/:uuid', (req: any, res) => {
  console.log(req.params.uuid);
  res.send('balancey + ' + req.params.uuid)
});

app.get('/api/send/:uuid/:username/:token_id/:amount', (req: any, res) => {
  const sendUuid: string = req.params.uuid;
  const tokenId: string = req.params.token_id;
  const amount: BigNumber = new BigNumber(req.params.amount);

  Promise.all([
    // ensure sending uuid exists
    mojang.lookupMinecraftUsername(sendUuid),
    // ensure receiving username exists
    mojang.lookupMinecraftUuid(req.params.username)
  ])
  .then(([sendUsername, recvUuid]) => {
    if (sendUsername === null || recvUuid === null) {
      return res.json({
        sendUuid: sendUsername ? sendUuid : null,
        recvUuid
      });
    }

    Promise.all([
      db.getUserId(sendUuid),
      db.getOrCreateUserId(recvUuid),
    ])
    .then(([sendUserId, recvUserId]) => {
      if (sendUserId === null) {
        return res.json({
          success: false,
          error: 'uuid not found',
        });
      }

      db.transfer(sendUserId, recvUserId, tokenId, amount)
      .then((result: db.TransferResult) => {
        if (result.success) {
          return res.json({
            success: true,
            message: 'Successfully sent',
          });
        } else {
          return res.json({
            success: false,
            message: result.errorMsg,
          });
        }
      })
    });
  });
});


app.listen(config.port(), () => {
  console.log(`server started at http://localhost:${config.port()}`);
});
