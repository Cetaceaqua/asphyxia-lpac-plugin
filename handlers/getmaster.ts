export const getmaster: EPR = async (info, data, send) => {
  const dataKey = $(data).element("data").str("datakey");
  let strData1 = "";
  let strData2 = "";

  switch (dataKey) {
    case "INFO":
      return send.object({
        result: K.ITEM("s32", 0),
      });
    case "ARK_ARR0":
      return send.object({
        result: K.ITEM("s32", 0),
      });
    case "ARK_HAS0":
      strData1 = U.GetConfig("ark_has0_string");
      break;
    case "KONAMI_0":
      strData1 = U.GetConfig("announcement_text_0");
      break;
    case "KONAMI_1":
      strData1 = U.GetConfig("announcement_text_1");
      break;
    case "EVENT_0":
      strData1 = U.GetConfig("announcement_text_2");
      break;
    case "EAPASS_0":
      strData1 = U.GetConfig("announcement_text_3");
      break;
    case "PASELI_0":
      strData1 = U.GetConfig("announcement_text_4");
      break;
    case "URL_0":
      return send.object({
        result: K.ITEM("s32", 0),
      });
    case "FLAG_0":
      strData1 =
        "NNNN" +
        (U.GetConfig("enable_medal_collab") ? "Y" : "N") +
        (U.GetConfig("enable_3ds_collab") ? "Y" : "N") +
        (U.GetConfig("enable_3ds_collab") ? "Y" : "N") +
        "NNNNYYNN" +
        (U.GetConfig("enable_summer_event") ? "Y" : "N") +
        "NYNYYYYYNNNNNNNNNNNNNNNN";
      break;
    default:
      return send.object({
        result: K.ITEM("s32", 0),
      });
  }

  return send.object({
    strdata1: K.ITEM("str", Buffer.from(strData1, "utf-8").toString("base64")),
    strdata2: K.ITEM("str", Buffer.from(strData2, "utf-8").toString("base64")),
    updatedate: K.ITEM("u64", BigInt(Date.now())),
    result: K.ITEM("s32", 1),
  });
};
