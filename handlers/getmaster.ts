function encodeMasterString(rawText: string): { strdata1: string; strdata2: string } {
  if (!rawText) {
    return { strdata1: "", strdata2: "" };
  }

  const rawBuf = Buffer.from(rawText, "utf-8");
  const MAX_CHUNK_BYTES = 384;
  const safeBuf = rawBuf.subarray(0, MAX_CHUNK_BYTES * 2);

  const chunk1 = safeBuf.subarray(0, MAX_CHUNK_BYTES);
  const chunk2 = safeBuf.subarray(MAX_CHUNK_BYTES);

  return {
    strdata1: chunk1.toString("base64"),
    strdata2: chunk2.toString("base64"),
  };
}

export const getmaster: EPR = async (info, data, send) => {
  const dataKey = $(data).element("data").str("datakey");
  let rawContent = "";

  switch (dataKey) {
    case "INFO":
    case "ARK_ARR0":
    case "URL_0":
      return send.object({
        result: K.ITEM("s32", 0),
      });

    case "ARK_HAS0":
      rawContent = U.GetConfig("ark_has0_string");
      break;

    case "KONAMI_0":
      rawContent = U.GetConfig("announcement_text_0");
      break;

    case "KONAMI_1":
      rawContent = U.GetConfig("announcement_text_1");
      break;

    case "EVENT_0":
      rawContent = U.GetConfig("announcement_text_2");
      break;

    case "EAPASS_0":
      rawContent = U.GetConfig("announcement_text_3");
      break;

    case "PASELI_0":
      rawContent = U.GetConfig("announcement_text_4");
      break;

    case "FLAG_0":
      rawContent =
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

  const { strdata1, strdata2 } = encodeMasterString(rawContent);

  return send.object({
    strdata1: K.ITEM("str", strdata1),
    strdata2: K.ITEM("str", strdata2),
    updatedate: K.ITEM("u64", BigInt(Date.now())),
    result: K.ITEM("s32", 1),
  });
};
