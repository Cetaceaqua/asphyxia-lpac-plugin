import { Profile } from "../models/profile";

export const usergamedata_send: EPR = async (info, data, send) => {
  const refId = $(data).str("data.eaid");
  let profile = await DB.FindOne<Profile>(refId, { collection: "profile" });

  if (!profile) {
    profile = {
      collection: "profile",
      usergamedata: {},
    };
    try {
      await DB.Insert<Profile>(refId, profile);
    } catch {
      return send.deny();
    }
  }

  for (const record of $(data).elements("data.record.d")) {
    const decodedStr = U.DecodeString(
      Buffer.from(record.str("", ""), "base64"),
      "shift_jis"
    );
    const decodedBin = Buffer.from(record.str("bin1", ""), "base64");

    const strData = decodedStr.split(",");
    const dataType = strData[1];

    if (!profile.usergamedata) {
      profile.usergamedata = {};
    }

    profile.usergamedata[dataType] = {
      strdata: strData,
      bindata: decodedBin,
    };
  }

  try {
    await DB.Update<Profile>(refId, { collection: "profile" }, profile);
    return send.object({
      result: K.ITEM("s32", 0),
    });
  } catch {
    return send.deny();
  }
};
