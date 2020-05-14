import fetch, {Response} from "node-fetch";

interface MojangUuidLookupResponse {
    name: string;
    id:   string;
};

interface MojangNameLookupResponse {
    name: string;
};

export function lookupMinecraftUsername(uuid: string): Promise<string|null> {
  return new Promise((resolve, reject) =>
    fetch('https://api.mojang.com/user/profiles/'+uuid.replace('-', '')+'/names')
    .then((resp: Response) => resp.json())
    .then((json: MojangNameLookupResponse[]) => {
      if (json.length === 0) {
        resolve(null);
      }

      resolve(json[0].name);
    })
    .catch((e) => {
      console.error(e);
      resolve(null);
    })
  );
}

export function lookupMinecraftUuid(username: string): Promise<string|null> {
  return new Promise((resolve, reject) =>
    fetch('https://api.mojang.com/users/profiles/minecraft/'+username)
    .then((resp: Response) => resp.json())
    .then((json: MojangUuidLookupResponse) => resolve(json.id))
    .catch((e) => {
      console.error(e);
      resolve(null);
    })
  );
}
