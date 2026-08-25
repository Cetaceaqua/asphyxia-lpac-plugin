import { Profile } from "../models/profile";

export const usergamedata_recv: EPR = async (info, data, send) => {
  const refId = $(data).str("data.eaid");
  const profile = await DB.FindOne<Profile>(refId, { collection: "profile" });

  const d = [];
  let recordCount = 0;

  if (!profile) {
    d.push(K.ITEM("str", "<NODATA>"));
    recordCount = 1;
  } else {
    const dataTypes = $(data)
      .str("data.recv_csv")
      .split(",")
      .filter((_, i) => i % 2 === 0);

    for (const dataType of dataTypes) {
      const savedData = profile.usergamedata && profile.usergamedata[dataType];
      if (!savedData) continue;

      const strData = savedData.strdata.slice(2).join(",");
      d.push({
        ...K.ITEM(
          "str",
          U.EncodeString(strData, "shift_jis").toString("base64")
        ),
        bin1: K.ITEM(
          "str",
          Buffer.from(Object.values(savedData.bindata)).toString("base64")
        ),
      });
      recordCount++;
    }
  }

  return send.object({
    result: K.ITEM("s32", 0),
    player: {
      record: [{ d }],
      record_num: K.ITEM("u32", recordCount),
    },
  });
};
