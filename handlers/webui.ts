import * as fs from "fs";
import * as path from "path";
import { Profile } from "../models/profile";
import { validateReadingId } from "./reading_id";

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

const DATE_LEVEL_MINIGAME_PERMITS = [
  { level: 1, permitIndex: 1 },
  { level: 1, permitIndex: 2 },
  { level: 1, permitIndex: 3 },
  { level: 1, permitIndex: 7 },
  { level: 1, permitIndex: 11 },
  { level: 3, permitIndex: 5 },
  { level: 12, permitIndex: 6 },
  { level: 17, permitIndex: 8 },
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

interface HairstyleData {
  catalogs: Record<string, number[]>;
  hair_type_map: Record<string, Record<string, { ds_code: string; hair_type: number; hair_type_hex: string }>>;
}

interface NicknameEntry {
  id: number;
  b: string;
  m: string;
  r: string;
  n: string;
  c: number;
  ref?: string | null;
}

let hairstyleDataCache: HairstyleData | null = null;
function getHairstyleData(): HairstyleData {
  if (!hairstyleDataCache) {
    const filePath = path.join(__dirname, "../webui/data/hairstyles.json");
    hairstyleDataCache = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  }
  return hairstyleDataCache;
}

let nicknameDataCache: NicknameEntry[] | null = null;
function getNicknameData(): NicknameEntry[] {
  if (!nicknameDataCache) {
    const filePath = path.join(__dirname, "../webui/data/nickname_3ds.json");
    nicknameDataCache = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  }
  return nicknameDataCache;
}

const MAX_CALLS_HER: Record<string, number> = {
  Manaka: 45,
  Rinko: 45,
  Nene: 49,
};

function resetHairstyleToDefault(buf: Buffer) {
  buf[340] = 0; // collaborate_code = 0 (unlinked)
  buf.writeInt32BE(-1, 341); // memorial_hair_color = -1 (0xFFFFFFFF, untriggered)
  buf.writeInt32BE(-1, 345); // ar_marker_code = -1 (0xFFFFFFFF)
  buf[349] = 0; // hair_color_maroon_black = 0
  buf.writeUInt16BE(0, 350); // hair_type = 0
  buf.writeUInt16BE(0, 33);  // next_hair_type = 0
  buf.writeInt16BE(-1, 38);  // memorial_hair_type = -1 (0xFFFF, untriggered)
  buf[35] = 0;              // hair_change_count = 0
}


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
  unlock_all_dresses: boolean;
  first_person?: string | number;
  calls_her?: string | number;
  nickname_id_3ds?: string | number;
  override_hairstyle?: boolean;
  hair_length?: string | number;
  hair_style?: string | number;
  hair_color?: string | number;
}) => {
  const [birthMonth, birthDay] = data.birthday.split(",");
  const birthMonthHex = BIRTH_MONTH_CODES[birthMonth];
  const birthDayHex = parseInt(birthDay, 10).toString(16).padStart(2, "0");
  const bloodTypeHex = BLOOD_TYPE_CODES[data.blood_type];
  const birthdayBloodType = `${birthMonthHex}${birthDayHex}${bloodTypeHex}`;
  const girlfriendId = GIRLFRIEND_IDS[data.girlfriend] || "0";
  const userAgreement = USER_AGREEMENT_IDS[data.user_agreement_status] || "";
  const readingId = await validateReadingId(data.reading);
  const profile = await DB.FindOne<Profile>(data.refid, { collection: "profile" });
  const lpac00 = profile?.usergamedata?.LPAC00;
  const lpac01 = profile?.usergamedata?.LPAC01;

  if (!lpac00) {
    throw new Error("LPAC00 profile data is missing");
  }

  if (!lpac01) {
    throw new Error("LPAC01 profile data is missing");
  }

  const oldGirlfriendId = String(lpac00.strdata[6] || "");
  const isGirlfriendChanged = oldGirlfriendId !== girlfriendId;

  const lpac00Bindata = Buffer.from(lpac00.bindata);

  const dateLevel = parseBoundedInteger(data.date_level, "Date Level", 0, DATE_LEVEL_MAX);

  const dateLevelExp = parseBoundedInteger(data.date_level_exp, "Date Level Exp", 0, DATE_LEVEL_EXP_MAX);

  let lpac01Bindata = Buffer.from(lpac01.bindata);
  if (lpac01Bindata.length < 364) {
    const expanded = Buffer.alloc(364);
    lpac01Bindata.copy(expanded);
    expanded.writeUInt16BE(7, 352);
    expanded.writeInt32BE(-1, 360);
    expanded.writeUInt32BE(0xFFFFFFFF, 345);
    lpac01Bindata = expanded;
  }

  if (lpac00Bindata.length < MINIGAME_PERMIT_OFFSET + 4) {
    throw new Error("LPAC00 bindata is too short");
  }

  let minigamePermitFlags = lpac00Bindata.readUInt32BE(MINIGAME_PERMIT_OFFSET);
  for (const release of DATE_LEVEL_MINIGAME_PERMITS) {
    if (dateLevel >= release.level) {
      minigamePermitFlags |= 1 << release.permitIndex;
    } else {
      minigamePermitFlags &= ~(1 << release.permitIndex);
    }
  }
  lpac00Bindata.writeUInt32BE(minigamePermitFlags, MINIGAME_PERMIT_OFFSET);

  for (const index of KNOWN_MINIGAME_LEVEL_INDICES) {
    const level = parseBoundedInteger(data.minigame_levels[String(index)], `Minigame level ${index}`, 1, MINIGAME_LEVEL_MAX);
    lpac00Bindata[MINIGAME_LEVEL_OFFSET + index] = level;
  }

  if (lpac01Bindata.length <= DATE_LEVEL_EXP_OFFSET + 1) {
    throw new Error("LPAC01 bindata is too short");
  }

  lpac01Bindata[DATE_LEVEL_OFFSET] = dateLevel;
  lpac01Bindata.writeUInt16BE(dateLevelExp, DATE_LEVEL_EXP_OFFSET);

  if (lpac01Bindata.length >= 82) {
    const MAX_DRESSES: Record<string, number> = {
      "Manaka": 133,
      "Rinko": 146,
      "Nene": 134
    };
    const numDresses = MAX_DRESSES[data.girlfriend] || 146;

    for (let i = 0; i < 32; i++) {
      if (data.unlock_all_dresses) {
        if ((i + 1) * 8 <= numDresses) {
          lpac01Bindata[50 + i] = 0xFF;
        } else if (i * 8 < numDresses) {
          const remainder = numDresses % 8;
          lpac01Bindata[50 + i] = (~((1 << (8 - remainder)) - 1)) & 0xFF;
        } else {
          lpac01Bindata[50 + i] = 0x00;
        }
      } else {
        lpac01Bindata[50 + i] = 0x00;
      }
    }
  }

  // --- Pronouns & Addressing ---
  // 1. 主人公一人称
  const fp = Number(data.first_person);
  lpac01Bindata[354] = (fp === 1) ? 1 : 0;

  // 2. 女友二人称 (Calls Her)
  const maxCallsHer = MAX_CALLS_HER[data.girlfriend] ?? 45;
  let callsHer = Number(data.calls_her);
  if (isNaN(callsHer) || !Number.isInteger(callsHer) || callsHer < 0 || callsHer > maxCallsHer) {
    // 超过上限或非数值，安全回退到默认 0 (如 愛花 / 凛子 / 寧々さん)
    callsHer = 0;
  }
  lpac01Bindata[355] = callsHer;

  // 3. 主人公二人称 (3DS Nickname) & 读音语音自动同步
  let finalReadingId = await validateReadingId(data.reading);
  let nickId = Number(data.nickname_id_3ds);
  if (isNaN(nickId) || nickId < 0 || nickId > 5503) {
    nickId = -1;
  } else {
    // 校验该 Table 2 称呼在目标女友下是否有有效文本且具备独立语音
    const nickData = getNicknameData();
    const entry = nickData[nickId];
    const gfKey = data.girlfriend === "Rinko" ? "r" : (data.girlfriend === "Nene" ? "n" : "m");
    const heroineCallText = entry?.[gfKey];
    if (!heroineCallText || heroineCallText.trim().length === 0 || !entry?.ref) {
      // 当前女友不支持该称呼或无语音资源，安全回退至默认 -1 (使用基础读音)
      nickId = -1;
    } else {
      // 若该称呼在 Table 1 中具备独立语音/读音资源（如 ダーリン 0x70345、先輩 0x70395 等），
      // 自动同步写入 LPAC00.strdata[4]，使游戏内女友呼唤主人公时真正读出该称呼语音！
      finalReadingId = entry.ref;
    }
  }
  lpac01Bindata.writeInt32BE(nickId, 360);


  // --- Hairstyle Synchronization ---
  if (data.override_hairstyle) {
    try {
      const hairLength = parseBoundedInteger(data.hair_length ?? 0, "Hair Length", 0, 2);
      const hairStyle = parseBoundedInteger(data.hair_style ?? 0, "Hair Style", 0, 14);
      const hairColor = parseBoundedInteger(data.hair_color ?? 0, "Hair Color", 0, 19);

      const safeStyle = (hairLength !== 0 && hairStyle > 12) ? 0 : hairStyle;
      const hData = getHairstyleData();
      const girlfriendKey = data.girlfriend in hData.catalogs ? data.girlfriend : "Manaka";
      const hairNumber = hData.catalogs[girlfriendKey]?.[15 * hairLength + safeStyle] ?? 0;
      const arMarkerCode = (hairNumber & 0x3F) | ((hairColor & 0x1F) << 6);
      const hairType = hData.hair_type_map[girlfriendKey]?.[String(hairNumber)]?.hair_type ?? 0x1000;

      // kanojyo.collaborate_code = 2 (DS AR)
      lpac01Bindata[340] = 2;
      // kanojyo.memorial_hair_color = -1 (0xFFFFFFFF)
      // 必须置为 -1！若设为 0 会触发游戏启动时的“今天纪念日”事件并强制载入默认紫色发色！
      lpac01Bindata.writeInt32BE(-1, 341);
      // kanojyo.ar_marker_code (32-bit BE)
      lpac01Bindata.writeUInt32BE(arMarkerCode, 345);
      // kanojyo.hair_color_maroon_black = 0
      lpac01Bindata[349] = 0;
      // kanojyo.hair_type (16-bit BE)
      lpac01Bindata.writeUInt16BE(hairType, 350);
      // sync next_hair_type
      lpac01Bindata.writeUInt16BE(hairType, 33);
      // kanojyo.memorial_hair_type = -1 (0xFFFF)
      // 必须置为 -1，避免触发今天的纪念日发型覆盖！
      lpac01Bindata.writeInt16BE(-1, 38);
    } catch {
      // 出现异常时安全回退至原生发型
      resetHairstyleToDefault(lpac01Bindata);
    }
  } else if (isGirlfriendChanged) {
    // 玩家更换了女友且未指定新发型：清空原女主联动发型数据，回退到默认初始发型
    resetHairstyleToDefault(lpac01Bindata);
  }

  await DB.Update<Profile>(
    data.refid,
    { collection: "profile" },
    {
      $set: {
        "usergamedata.LPAC00.strdata.3": userAgreement,
        "usergamedata.LPAC00.strdata.4": finalReadingId,

        "usergamedata.LPAC00.strdata.5": birthdayBloodType,
        "usergamedata.LPAC00.strdata.6": girlfriendId,
        "usergamedata.LPAC00.strdata.27": data.name,
        "usergamedata.LPAC00.bindata": Array.from(lpac00Bindata),
        "usergamedata.LPAC01.bindata": Array.from(lpac01Bindata),
      },
    }
  );
};



