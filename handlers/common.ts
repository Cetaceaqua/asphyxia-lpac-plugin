export const eventlog: EPR = async (info, data, send) => {
  return send.object({
    gamesession: K.ITEM("s64", BigInt(1)),
    logsendflg: K.ITEM("s32", 0),
    logerrlevel: K.ITEM("s32", 0),
    evtidnosendflg: K.ITEM("s32", 0),
  });
};

export const netlog_send: EPR = async (info, data, send) => {
  return send.object({
    result: K.ITEM("s32", 0),
  });
}

export const getdatalist: EPR = async (info, data, send) => {
  return send.object({
    result: K.ITEM("s32", 0),
  });
};
