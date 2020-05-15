# API

## Open Access

Any user may access these api endpoints.

### List All Tokens

```bash
curl -X GET "https://api.magicpixel.xyz/tokens"
```

### List All Servers

```bash
curl -X GET "https://api.magicpixel.xyz/servers"
```

### Look up Minecraft uuid

This will retrieve the `uuid` from Mojang given your Minecraft username. The results are cached for some period of time.

```bash
curl -X GET "https://api.magicpixel.xyz/minecraft/lookup_uuid/:username
```


## Authenticated

For authenticated routes you must supply the access token you received with a `X-Auth-Token`, and they must be performed by the IP address associated with the server.


### Check Balance

```bash
curl -H 'X-Auth-Token: password' -X GET "https://api.magicpixel.xyz/balance/:uuid"
```

### Perform Transfer

`token_id` must be the full token id such as `4de69e374a8ed21cbddd47f2338cc0f479dc58daa2bbe11cd604ca488eca0ddf` for `spice`

You can find token id by looking on the [SLP Explorer](https://simpleledger.info/token/4de69e374a8ed21cbddd47f2338cc0f479dc58daa2bbe11cd604ca488eca0ddf).

```bash
curl -H 'X-Auth-Token: password' -X POST "https://api.magicpixel.xyz/send/:send_uuid/:recv_uuid/:token_id/:amount"
```


### List all Transfers Performed on Server

```bash
curl -H 'X-Auth-Token: password' -X GET "https://api.magicpixel.xyz/server/transfers"
```

## Minecraft Command

You should not use this, this is for in game use only.

`:uuid` is the minecraft user uuid.

`:query` is the command sent in minecraft, uri escaped 

```bash
curl -H 'X-Auth-Token: password' -X POST "https://api.magicpixel.xyz/minecraft/command?uuid=:uuid&q=:query"
```

