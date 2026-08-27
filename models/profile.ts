export interface Profile {
  collection: "profile";

  usergamedata?: {
    [type: string]: {
      strdata: string[];
      bindata: Buffer;
    };
  };
}