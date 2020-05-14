import fetch, {Response} from "node-fetch";
import NodeCache from "node-cache";

const uuidCache     = new NodeCache(); // username -> uuid
const usernameCache = new NodeCache(); // uuid -> username

interface MojangUuidLookupResponse {
    name: string;
    id:   string;
};

interface MojangNameLookupResponse {
    name: string;
};

export function lookupMinecraftUsername(uuid: string): Promise<string|null> {
  uuid = uuid.replace(/-/g, '');

  return new Promise((resolve, reject) => {
    const clookup: string|undefined = usernameCache.get(uuid);

    if (clookup !== undefined) {
      return resolve(clookup);
    }

    fetch('https://api.mojang.com/user/profiles/'+uuid+'/names')
    .then((resp: Response) => resp.json())
    .then((json: MojangNameLookupResponse[]) => {
      if (json.length === 0) {
        resolve(null);
      }

      const latestUsername: string = json[0].name;

      usernameCache.set(uuid, latestUsername);
      resolve(latestUsername);
    })
    .catch((e) => {
      console.error(e);
      resolve(null);
    });
  });
}

export function lookupMinecraftUuid(username: string): Promise<string|null> {
  return new Promise((resolve, reject) => {
    const clookup: string|undefined = uuidCache.get(username);

    if (clookup) {
      return resolve(clookup);
    }

    fetch('https://api.mojang.com/users/profiles/minecraft/'+username)
    .then((resp: Response) => resp.json())
    .then((json: MojangUuidLookupResponse) => {
      const uuid: string = json.id;

      uuidCache.set(username, uuid);
      return resolve(uuid);
    })
    .catch((e) => {
      console.error(e);
      resolve(null);
    });
  });
}
