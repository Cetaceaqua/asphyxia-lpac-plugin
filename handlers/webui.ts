import { Profile } from "../models/profile";

const BIRTH_MONTH_CODES: Record<string, string> = {
  "01": "1",
  "02": "2",
  "03": "3",
  "04": "4",
  "05": "5",
  "06": "6",
  "07": "7",
  "08": "8",
  "09": "9",
  "10": "a",
  "11": "b",
  "12": "c",
};

const BLOOD_TYPE_CODES: Record<string, string> = {
  A: "00",
  B: "01",
  O: "02",
  AB: "03",
};

const GIRLFRIEND_IDS: Record<string, string> = {
  Manaka: "0",
  Rinko: "10000",
  Nene: "20000",
};

const USER_AGREEMENT_IDS: Record<string, string> = {
  "Not Agreed": "0",
  Agreed: "2f",
};

const MINIGAME_LEVEL_OFFSET = 44;
const KNOWN_MINIGAME_LEVEL_INDICES = [1, 2, 3, 5, 6, 7, 8, 11] as const;
const MINIGAME_PERMIT_OFFSET = 0;
const DATE_LEVEL_OFFSET = 28;
const DATE_LEVEL_EXP_OFFSET = 29;
const DATE_LEVEL_MAX = 50;
const DATE_LEVEL_EXP_MAX = 150;
const MINIGAME_LEVEL_MAX = 50;

// Confirmed initial permits and Date Level gates for minigames. The bit
// numbering is the runtime numbering used by lpac.dll; bindata[0..3] stores
// the same u32 in big-endian form. Existing and unknown bits are kept.
const DATE_LEVEL_MINIGAME_PERMITS = [
  { level: 1, permitIndex: 1 },
  { level: 1, permitIndex: 2 },
  { level: 1, permitIndex: 3 },
  { level: 1, permitIndex: 7 },
  { level: 1, permitIndex: 11 },
] as const;

// These three Date Level releases have editor controls.
const EDITABLE_MINIGAME_UNLOCKS = [
  { id: "darts", level: 3, index: 5 },
  { id: "soap_bubbles", level: 12, index: 6 },
  { id: "spit", level: 17, index: 8 },
] as const;

const parseBoundedInteger = (
  value: string | number,
  fieldName: string,
  min: number,
  max: number
) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`${fieldName} must be an integer between ${min} and ${max}`);
  }
  return parsed;
};

const parseBoolean = (value: string | boolean | undefined) =>
  value === true || value === "true" || value === "1" || value === "on";

export const updateProfile = async (data: {
  refid: string;
  name: string;
  birthday: string;
  blood_type: string;
  girlfriend: string;
  reading: string;
  user_agreement_status: string;
  date_level: string | number;
  date_level_exp: string | number;
  minigame_levels: Record<string, string | number>;
  minigame_unlocks?: Record<string, string | boolean | undefined>;
}) => {
  const [birthMonth, birthDay] = data.birthday.split(",");
  const birthMonthHex = BIRTH_MONTH_CODES[birthMonth];
  const birthDayHex = parseInt(birthDay, 10).toString(16).padStart(2, "0");
  const bloodTypeHex = BLOOD_TYPE_CODES[data.blood_type];
  const birthdayBloodType = `${birthMonthHex}${birthDayHex}${bloodTypeHex}`;
  const girlfriendId = GIRLFRIEND_IDS[data.girlfriend] || "";
  const userAgreement = USER_AGREEMENT_IDS[data.user_agreement_status] || "";
  const profile = await DB.FindOne<Profile>(data.refid, { collection: "profile" });
  const lpac00 = profile?.usergamedata?.LPAC00;
  const lpac01 = profile?.usergamedata?.LPAC01;

  if (!lpac00) {
    throw new Error("LPAC00 profile data is missing");
  }

  if (!lpac01) {
    throw new Error("LPAC01 profile data is missing");
  }

  const bindata = Buffer.from(Object.values(lpac00.bindata));

  const dateLevel = parseBoundedInteger(
    data.date_level,
    "Date Level",
    0,
    DATE_LEVEL_MAX
  );

  const dateLevelExp = parseBoundedInteger(
    data.date_level_exp,
    "Date Level Exp",
    0,
    DATE_LEVEL_EXP_MAX
  );

  const kareshiBindata = Buffer.from(Object.values(lpac01.bindata));

  const requestedMinigameUnlocks = data.minigame_unlocks ?? {};

  if (bindata.length < MINIGAME_PERMIT_OFFSET + 4) {
    throw new Error("LPAC00 bindata is too short for minigame permits");
  }

  // Keep the five initial minigame permits. The three gated permits below are
  // controlled by their WebUI switches so changing Date Level can synchronize
  // their state without touching unrelated or unknown permit bits.
  let minigamePermitFlags = bindata.readUInt32BE(MINIGAME_PERMIT_OFFSET);
  for (const release of DATE_LEVEL_MINIGAME_PERMITS) {
    if (dateLevel >= release.level) {
      minigamePermitFlags |= 1 << release.permitIndex;
    }
  }

  for (const unlock of EDITABLE_MINIGAME_UNLOCKS) {
    const requested = requestedMinigameUnlocks[unlock.id];
    const currentlyEnabled =
      (minigamePermitFlags & (1 << unlock.index)) !== 0;
    const enabled = requested !== undefined
      ? parseBoolean(requested)
      : currentlyEnabled || dateLevel >= unlock.level;

    if (enabled) {
      minigamePermitFlags |= 1 << unlock.index;
    } else {
      minigamePermitFlags &= ~(1 << unlock.index);
    }
  }
  bindata.writeUInt32BE(minigamePermitFlags, MINIGAME_PERMIT_OFFSET);

  for (const index of KNOWN_MINIGAME_LEVEL_INDICES) {
    const level = parseBoundedInteger(
      data.minigame_levels[String(index)],
      `Minigame level ${index}`,
      1,
      MINIGAME_LEVEL_MAX
    );
    bindata[MINIGAME_LEVEL_OFFSET + index] = level;
  }

  if (kareshiBindata.length <= DATE_LEVEL_EXP_OFFSET + 1) {
    throw new Error("LPAC01 bindata is too short");
  }
  kareshiBindata[DATE_LEVEL_OFFSET] = dateLevel;
  kareshiBindata.writeUInt16BE(dateLevelExp, DATE_LEVEL_EXP_OFFSET);

  await DB.Update<Profile>(
    data.refid,
    { collection: "profile" },
    {
      $set: {
        "usergamedata.LPAC00.strdata.3": userAgreement,
        "usergamedata.LPAC00.strdata.4": data.reading,
        "usergamedata.LPAC00.strdata.5": birthdayBloodType,
        "usergamedata.LPAC00.strdata.6": girlfriendId,
        "usergamedata.LPAC00.strdata.27": data.name,
        "usergamedata.LPAC00.bindata": bindata,
        "usergamedata.LPAC01.bindata": kareshiBindata,
      },
    }
  );
};
