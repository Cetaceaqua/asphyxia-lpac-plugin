import { eventlog, getdatalist } from "./handlers/common";
import { getmaster } from "./handlers/getmaster";
import { usergamedata_recv } from "./handlers/usergamedata_recv";
import { usergamedata_send } from "./handlers/usergamedata_send";
import { usergamedata_condrecv } from "./handlers/usergamedata_condrecv";
import { updateProfile } from "./handlers/webui";
import { declareUpload, commitUpload } from "./handlers/uploader";

export function register() {
  R.GameCode("KLP");

  R.Unhandled();

  R.ExtraModuleHandler(async (model) => {
    const isEnabled = U.GetConfig("enable_uploader") !== false;
    if (model.startsWith("KLP") && isEnabled) {
      return ["uploader"];
    }
    return [];
  });

  R.Contributor("Cetaceaqua", "https://cetaceaqua.com");

  R.Config("enable_uploader", {
    name: "Enable EA3 Uploader",
    desc: "Enable EA3 uploader module in services.get.",
    type: "boolean",
    default: false,
  });

  R.Config("uploader_url", {
    name: "EA3 Uploader URL",
    desc: "Base URL of Asphyxia EA3 Uploader.",
    type: "string",
    default: "http://localhost:8084",
  });

  R.Config("enable_medal_collab", {
    name: "Love Plus MEDAL Collab",
    desc: "Enable collaboration with Love Plus MEDAL Happy Daily Life. (FLAG_0[4])",
    type: "boolean",
    default: false,
  });

  R.Config("enable_3ds_collab", {
    name: "NEW Love Plus Collab",
    desc: "Enable collaboration with NEW Love Plus on Nintendo 3DS. (FLAG_0[5] / FLAG_0[6])",
    type: "boolean",
    default: false,
  });

  R.Config("enable_summer_event", {
    name: "Summer Event",
    desc: "Enable the summer event and unlock the beach location. (FLAG_0[15])",
    type: "boolean",
    default: true,
  });

  R.Config("ark_has0_string", {
    name: "Game Settings (ARK_HAS0)",
    desc: "Settings string returned for ARK_HAS0.",
    type: "string",
    default:
      "DEMOCOMMERCIAL,demoloop_cm_006;DRESSOPEN,7;DATEPLUSNORMA,3,8,12;DATELVUPSCL,50;MGLVUPSCL,50;SITFSPROB,50;",
  });

  R.Config("announcement_text_0", {
    name: "KONAMI Announcement 1",
    desc: "Text returned for the first KONAMI announcement page. Leave blank to disable. (KONAMI_0)",
    type: "string",
    default: "You are playing on Asphyxia CORE.",
  });

  R.Config("announcement_text_1", {
    name: "KONAMI Announcement 2",
    desc: "Text returned for the second KONAMI announcement page. Leave blank to disable. (KONAMI_1)",
    type: "string",
    default: "",
  });

  R.Config("announcement_text_2", {
    name: "Event Announcement",
    desc: "Text returned for the event announcement page. Leave blank to disable. (EVENT_0)",
    type: "string",
    default: "",
  });

  R.Config("announcement_text_3", {
    name: "e-AMUSEMENT PASS Announcement",
    desc: "Text returned for the e-AMUSEMENT PASS announcement page. Leave blank to disable. (EAPASS_0)",
    type: "string",
    default: "",
  });

  R.Config("announcement_text_4", {
    name: "PASELI Announcement",
    desc: "Text returned for the PASELI announcement page. Leave blank to disable. (PASELI_0)",
    type: "string",
    default: "",
  });

  R.Route("eventlog.write", eventlog);
  R.Route("cardmng.getdatalist", getdatalist);
  R.Route("system.getmaster", getmaster);
  R.Route("playerdata.usergamedata_recv", usergamedata_recv);
  R.Route("playerdata.usergamedata_send", usergamedata_send);
  R.Route("playerdata.usergamedata_condrecv", usergamedata_condrecv);
  R.Route("uploader.declareUpload", declareUpload);
  R.Route("uploader.commitUpload", commitUpload);

  R.WebUIEvent("updateProfile", updateProfile);

  console.log("Plugin Registered");
  console.log(`Asphyxia CORE Version: v${CORE_VERSION_MAJOR}.${CORE_VERSION_MINOR}`);
}
