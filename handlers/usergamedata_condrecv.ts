export const usergamedata_condrecv: EPR = async (info, data, send) => {
  return send.object({
    player: {
      record_num: K.ITEM("u32", 0),
    },
    result: K.ITEM("s32", 0),
  });
};
