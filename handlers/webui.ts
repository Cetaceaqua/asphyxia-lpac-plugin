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

export const updateProfile = async (data: {
  refid: string;
  name: string;
  birthday: string;
  blood_type: string;
  girlfriend: string;
  pronunciation: string;
  user_agreement_status: string;
}) => {
  const [birthMonth, birthDay] = data.birthday.split(",");
  const birthMonthHex = BIRTH_MONTH_CODES[birthMonth];
  const birthDayHex = parseInt(birthDay, 10).toString(16).padStart(2, "0");
  const bloodTypeHex = BLOOD_TYPE_CODES[data.blood_type];
  const birthdayBloodType = `${birthMonthHex}${birthDayHex}${bloodTypeHex}`;
  const girlfriendId = GIRLFRIEND_IDS[data.girlfriend] || "";
  const userAgreement = USER_AGREEMENT_IDS[data.user_agreement_status] || "";

  await DB.Update<Profile>(
    data.refid,
    { collection: "profile" },
    {
      $set: {
        "usergamedata.LPAC00.strdata.3": userAgreement,
        "usergamedata.LPAC00.strdata.4": data.pronunciation,
        "usergamedata.LPAC00.strdata.5": birthdayBloodType,
        "usergamedata.LPAC00.strdata.6": girlfriendId,
        "usergamedata.LPAC00.strdata.27": data.name,
      },
    }
  );
};
