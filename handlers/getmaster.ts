function encodeMasterString(rawText: string): { strdata1: string; strdata2: string } {
  if (!rawText) {
    return { strdata1: "", strdata2: "" };
  }

  const encoding = (U.GetConfig("announcement_encoding") || "Shift-JIS").toUpperCase();
  const isUtf8 = encoding === "UTF-8";

  const rawBuf = isUtf8
    ? Buffer.from(rawText, "utf-8")
    : U.EncodeString(rawText, "shift_jis");

  const MAX_CHUNK_BYTES = 384;

  if (rawBuf.length <= MAX_CHUNK_BYTES) {
    return {
      strdata1: rawBuf.toString("base64"),
      strdata2: "",
    };
  }

  const getCharLen = (buf: Buffer, idx: number): number => {
    if (isUtf8) {
      const b = buf[idx];
      if ((b & 0x80) === 0) return 1;
      if ((b & 0xe0) === 0xc0) return 2;
      if ((b & 0xf0) === 0xe0) return 3;
      if ((b & 0xf8) === 0xf0) return 4;
      return 1;
    } else {
      const b = buf[idx];
      const isLead = (b >= 0x81 && b <= 0x9f) || (b >= 0xe0 && b <= 0xfc);
      return isLead ? 2 : 1;
    }
  };

  let splitIndex = 0;
  let i = 0;
  while (i < rawBuf.length) {
    const clen = getCharLen(rawBuf, i);
    if (i + clen > MAX_CHUNK_BYTES) break;
    i += clen;
    splitIndex = i;
  }

  const chunk1 = rawBuf.subarray(0, splitIndex);

  let chunk2End = splitIndex;
  let j = splitIndex;
  while (j < rawBuf.length) {
    const clen = getCharLen(rawBuf, j);
    if (j - splitIndex + clen > MAX_CHUNK_BYTES) break;
    j += clen;
    chunk2End = j;
  }

  const chunk2 = rawBuf.subarray(splitIndex, chunk2End);

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
