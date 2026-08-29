export const declareUpload: EPR = async (info, data, send) => {
  const isEnabled = U.GetConfig("enable_uploader") !== false;
  if (!isEnabled) {
    return send.deny();
  }

  const uploaderUrl = (U.GetConfig("uploader_url") as string) || "http://127.0.0.1:8084";
  const cleanUrl = uploaderUrl.replace(/\/+$/, "");
  const basePath = cleanUrl.endsWith("/upload") ? cleanUrl : `${cleanUrl}/upload`;
  const gameCode = (info.model || "KLP").split(":")[0] || "KLP";
  const uploadEndpoint = `${basePath}?game=${encodeURIComponent(gameCode)}`;
  const arrangeNum = `${Math.floor(1000000000 + Math.random() * 9000000000)}`;

  return send.object({
    arrangeNum: K.ITEM("str", arrangeNum),
    uploadUrl: K.ITEM("str", uploadEndpoint),
    urlValidSec: K.ITEM("s32", 86400),
    accessKey: K.ITEM("str", "AccessKey_Placeholder_FuckKonami"),
    bandWidth: K.ITEM("s32", 104857600),
    expireDate: K.ITEM("str", "2030-12-31"),
  });
};

export const commitUpload: EPR = async (info, data, send) => {
  return send.success();
};
