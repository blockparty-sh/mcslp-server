import dotenv from "dotenv";
import express from "express";
import path from "path";

const app = express();

app.set("views", path.join( __dirname, "views" ));
app.set("view engine", "ejs");


app.get('/', (req: any, res) => {
  res.render("index");
});

app.get('/api/balance/:uuid', (req: any, res) => {
  res.send('balancey + ' + req.params.uuid)
});

const port = process.env.PORT || 8222;
app.listen(port, () => {
  console.log(`server started at http://localhost:${port}`);
});
