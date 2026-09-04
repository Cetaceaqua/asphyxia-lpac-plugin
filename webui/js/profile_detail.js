$(document).ready(function () {
  let readingIdText = {};

  const normalizeReadingId = (readingId) =>
    `0x${String(readingId || "")
      .trim()
      .toLowerCase()
      .replace(/^0x/, "")}`;

  const getReadingKana = (readingId) =>
    readingIdText[normalizeReadingId(readingId)] || "";

  function updateReadingKana() {
    const kana = getReadingKana($("#reading").val());
    $("#reading-kana")
      .text("Current Reading: " + (kana || "Unknown Reading ID")  )
      .toggleClass("is-danger", !kana);
  }

  fetch("static/data/reading_id_text.json")
    .then((response) => (response.ok ? response.json() : {}))
    .then((data) => {
      readingIdText = data;
      updateReadingKana();
    })
    .catch(() => updateReadingKana());

  $("#reading").on("input change", updateReadingKana);
  updateReadingKana();

  const toFullWidth = (value) =>
    value.replace(/[!-~]/g, (character) =>
      String.fromCharCode(character.charCodeAt(0) + 0xfee0)
    );

  $("#fullwidth-name-button").on("click", function () {
    const nameInput = $("#name");
    nameInput.val(toFullWidth(String(nameInput.val() || "")));
  });

  const birthMonth = $("#birth-month").val();

  updateDayOptions(birthMonth);

  $("#birth-month").on("change", function () {
    const selectedMonth = $(this).val();
    updateDayOptions(selectedMonth);
  });

  function syncMinigameUnlocks(dateLevelValue) {
    const dateLevel = Number(dateLevelValue);
    if (!Number.isInteger(dateLevel)) {
      return;
    }

    $(".minigame-unlock").each(function () {
      $(this).prop(
        "checked",
        dateLevel >= Number($(this).data("unlock-level"))
      );
    });
  }

  $("#date-level").on("input change", function () {
    syncMinigameUnlocks($(this).val());
  });
  syncMinigameUnlocks($("#date-level").val());

  function updateDayOptions(monthValue) {
    const daySelect = $("#birth-day");
    const previousDay = daySelect.val();

    daySelect.empty();
    daySelect.append($("<option>").val("").text("Select Birth Day"));

    let maxDays = 31;
    if (["04", "06", "09", "11"].includes(monthValue)) {
      maxDays = 30;
    } else if (monthValue === "02") {
      maxDays = 29;
    }

    for (let d = 1; d <= maxDays; d++) {
      const day = String(d).padStart(2, "0");
      const option = $("<option>").val(day).text(day);

      if (previousDay === day) {
        option.prop("selected", true);
      }

      daySelect.append(option);
    }
  }

  // --- Pronouns & Addressing ---
  let callsHerData = {};
  let nickname3dsData = [];

  function updateCallsHerOptions(resetToDefault = false) {
    const gf = $("#girlfriend").val() || "Manaka";
    const select = $("#calls-her");
    let currentVal = resetToDefault ? 0 : Number(select.data("current") ?? select.val() ?? 0);
    if (resetToDefault) {
      select.data("current", 0);
    }
    select.empty();

    const list = callsHerData[gf] || [];
    list.forEach((item) => {
      const opt = $("<option>").val(item.index).text(`${item.index}: ${item.text}`);
      if (item.index === currentVal) {
        opt.prop("selected", true);
      }
      select.append(opt);
    });
  }

  fetch("static/data/calls_her.json")
    .then((res) => (res.ok ? res.json() : {}))
    .then((data) => {
      callsHerData = data;
      updateCallsHerOptions(false);
    })
    .catch((err) => console.error("Failed to load calls_her.json", err));


  function updateNicknamePreview() {
    const nickId = Number($("#nickname-id").val());
    const gf = $("#girlfriend").val() || "Manaka";
    const previewEl = $("#nickname-preview");

    const presetSelect = $("#nickname-preset");
    if (presetSelect.find(`option[value="${nickId}"]`).length > 0) {
      presetSelect.val(String(nickId));
    } else {
      presetSelect.val("custom");
    }

    if (nickId === -1 || isNaN(nickId)) {
      previewEl.text("Current Nickname: Default Base Reading (LPAC00.strdata[4])").removeClass("has-text-danger").addClass("has-text-info");
      const orig = $("#reading").data("original");
      if (orig && $("#reading").data("synced-nick")) {
        $("#reading").val(orig).removeData("synced-nick").trigger("input");
      }
      return;
    }

    if (nickId < 0 || nickId >= 5504) {
      previewEl.text("Current Nickname: Invalid ID (Range: -1 or 0 ~ 5503)").removeClass("has-text-info").addClass("has-text-danger");
      return;
    }

    if (!nickname3dsData || nickname3dsData.length === 0) {
      previewEl.text(`Current Nickname: ID ${nickId} (Loading dictionary...)`).removeClass("has-text-danger").addClass("has-text-info");
      return;
    }

    const entry = nickname3dsData[nickId];
    if (entry) {
      const gfCall = gf === "Rinko" ? entry.r : gf === "Nene" ? entry.n : entry.m;
      const voiceBadge = entry.ref
        ? `<span class="tag is-success is-light ml-2">🔊 Reading Synced: 0x${entry.ref}</span>`
        : `<span class="tag is-danger is-light ml-2">⚠️ No Reading (Uses Base Reading)</span>`;
      previewEl.html(`Current Nickname: <strong>${gfCall}</strong> ${voiceBadge} <span class="has-text-grey">(Base: ${entry.b} | Manaka: ${entry.m} | Rinko: ${entry.r} | Nene: ${entry.n})</span>`)
        .removeClass("has-text-danger").addClass("has-text-info");

      if (entry.ref) {
        if (!$("#reading").data("original")) {
          $("#reading").data("original", $("#reading").val());
        }
        $("#reading").val(entry.ref).data("synced-nick", true).trigger("input");
      } else {
        const orig = $("#reading").data("original");
        if (orig && $("#reading").data("synced-nick")) {
          $("#reading").val(orig).removeData("synced-nick").trigger("input");
        }
      }
    } else {
      previewEl.text(`Current Nickname: ID ${nickId} (Unknown Entry)`).removeClass("has-text-info").addClass("has-text-danger");
    }
  }

  fetch("static/data/nickname_3ds.json")
    .then((res) => (res.ok ? res.json() : []))
    .then((data) => {
      nickname3dsData = data;
      updateNicknamePreview();
    })
    .catch((err) => console.error("Failed to load nickname_3ds.json", err));

  $("#nickname-preset").on("change", function () {
    const val = $(this).val();
    if (val !== "custom") {
      $("#nickname-id").val(val).trigger("input");
    }
  });

  $("#nickname-id").on("input change", updateNicknamePreview);


  // --- Hairstyle Synchronization ---
  let hairstyleData = null;

  const JA_TO_EN_COLOR = {
    '黒': 'Black',
    '明るい・黄(A)': 'Bright Yellow A',
    '明るい・黄(B)': 'Bright Yellow B',
    '明るい・赤(A)': 'Bright Red A',
    '明るい・赤(B)': 'Bright Red B',
    '明るい・黒(A)': 'Bright Black A',
    '明るい・黒(B)': 'Bright Black B',
    '茶系・赤(A)': 'Brown Red A',
    '茶系・赤(B)': 'Brown Red B',
    '茶系・黄(A)': 'Brown Yellow A',
    '茶系・黄(B)': 'Brown Yellow B',
    '茶系・黒(A)': 'Brown Black A',
    '茶系・黒(B)': 'Brown Black B',
    'ピンク': 'Special Pink',
    '青': 'Special Blue',
    '黄緑': 'Special Light Green',
    '緑': 'Special Green',
    '紫': 'Special Purple',
    'オレンジ': 'Special Orange'
  };

  function initHairstyleControls() {
    if (!hairstyleData) return;

    const styleSelect = $("#hair-style");
    styleSelect.empty();
    hairstyleData.styles.forEach((st) => {
      styleSelect.append($("<option>").val(st.value).text(st.name));
    });

    const colorSelect = $("#hair-color");
    colorSelect.empty();
    hairstyleData.colors.forEach((c) => {
      colorSelect.append($("<option>").val(c.value).text(c.name));
    });

    const container = $("#hairstyle-controls");
    const savedAr = Number(container.data("saved-ar") ?? 0);
    const gf = $("#girlfriend").val() || "Manaka";
    if (savedAr > 0 && hairstyleData.catalogs[gf]) {
      const hairNum = savedAr & 0x3f;
      const hairCol = (savedAr >> 6) & 0x1f;
      const catIdx = hairstyleData.catalogs[gf].indexOf(hairNum);
      if (catIdx >= 0) {
        $("#hair-length").val(String(Math.floor(catIdx / 15)));
        $("#hair-style").val(String(catIdx % 15));
      }
      if (colorSelect.find(`option[value="${hairCol}"]`).length > 0) {
        colorSelect.val(String(hairCol));
      }
    }

    renderColorSwatches();
    updateHairstyleOptions();
  }

  function renderColorSwatches() {
    if (!hairstyleData || !hairstyleData.colors) return;
    const grid = $("#color-swatches-grid");
    grid.empty();
    const gf = $("#girlfriend").val() || "Manaka";

    hairstyleData.colors.forEach((c) => {
      const rgbInfo = c.rgbs?.[gf] || { hex: "#333333", name: "", r: 0, g: 0, b: 0 };
      const luminance = 0.299 * (rgbInfo.r || 0) + 0.587 * (rgbInfo.g || 0) + 0.114 * (rgbInfo.b || 0);
      const textColor = luminance > 130 ? '#111827' : '#ffffff';
      const textShadow = luminance > 130 ? 'none' : '0 1px 2px rgba(0,0,0,0.9)';
      const enName = JA_TO_EN_COLOR[rgbInfo.name] || 'Color';
      const jaName = rgbInfo.name || '';

      const swatch = $(`
        <div class="color-swatch-card" title="${c.name} - ${rgbInfo.name} (${rgbInfo.hex})" style="
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          flex: 1 1 125px;
          max-width: 145px;
          min-width: 110px;
          padding: 6px;
          border-radius: 6px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
          user-select: none;
          box-sizing: border-box;
        ">
          <div style="
            width: 100%;
            height: 50px;
            border-radius: 4px;
            background-color: ${rgbInfo.hex};
            border: 1px solid rgba(0,0,0,0.2);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 3px 4px;
            box-sizing: border-box;
          ">
            <span style="
              font-size: 11px;
              font-weight: 700;
              color: ${textColor};
              text-shadow: ${textShadow};
              text-align: center;
              line-height: 1.2;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              width: 100%;
            ">${enName}</span>
            <span style="
              font-size: 10.5px;
              font-weight: 500;
              color: ${textColor};
              text-shadow: ${textShadow};
              text-align: center;
              line-height: 1.2;
              margin-top: 2px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              width: 100%;
            ">${jaName}</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; margin-top: 4px; font-size: 10px; color: #64748b; font-family: monospace;">
            <span style="font-weight: 700;">ID ${c.value}</span>
            <span>${rgbInfo.hex}</span>
          </div>
        </div>
      `);

      grid.append(swatch);
    });
  }

  function updateHairstyleOptions() {
    const isLong = $("#hair-length").val() === "0";
    const styleSelect = $("#hair-style");
    styleSelect.find("option").each(function () {
      const v = Number($(this).val());
      if (v > 12) {
        $(this).prop("disabled", !isLong);
      }
    });
    if (!isLong && Number(styleSelect.val()) > 12) {
      styleSelect.val("0");
    }
    updateHairstylePreview();
  }

  function updateHairstylePreview() {
    if (!hairstyleData) return;
    const len = Number($("#hair-length").val() || 0);
    let sty = Number($("#hair-style").val() || 0);
    if (len !== 0 && sty > 12) sty = 0;
    const col = Number($("#hair-color").val() || 0);
    const gf = $("#girlfriend").val() || "Manaka";

    const cat = hairstyleData.catalogs[gf] || [];
    const hairNum = cat[15 * len + sty] ?? 0;
    const arCode = (hairNum & 0x3f) | ((col & 0x1f) << 6);
    const hexArCode = "0x" + arCode.toString(16).toUpperCase().padStart(4, "0");

    const hairInfo = hairstyleData.hair_type_map[gf]?.[String(hairNum)];
    const dsCode = hairInfo ? hairInfo.ds_code : "Unknown";
    const hairTypeHex = hairInfo ? hairInfo.hair_type_hex : "0x1000";

    $("#preview-ar-code").text(`${hexArCode} (${arCode})`);
    $("#preview-hair-type").text(`${hairTypeHex}`);
    $("#preview-ds-code").text(dsCode);

    // Update current color badge & dot
    const curColorObj = hairstyleData.colors?.find((c) => c.value === col);
    const curRgb = curColorObj?.rgbs?.[gf] || { hex: "#333333", name: "", r: 0, g: 0, b: 0 };
    $("#color-swatch-dot").css("background-color", curRgb.hex);
    $("#color-rgb-text").html(`<strong>${curRgb.hex}</strong> (R:${curRgb.r}, G:${curRgb.g}, B:${curRgb.b}) - ${curRgb.name || curColorObj?.name || ''}`);
  }


  fetch("static/data/hairstyles.json")
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      hairstyleData = data;
      initHairstyleControls();
    })
    .catch((err) => console.error("Failed to load hairstyles.json", err));

  $("#override-hairstyle").on("change", function () {
    if ($(this).is(":checked")) {
      $("#hairstyle-controls").slideDown();
      updateHairstylePreview();
    } else {
      $("#hairstyle-controls").slideUp();
    }
  });

  $("#hair-length").on("change", updateHairstyleOptions);
  $("#hair-style, #hair-color").on("change", updateHairstylePreview);

  $("#girlfriend").on("change", function () {
    const gf = $(this).val() || "Manaka";
    // 切换女友时，自动将女友称呼重置为新女主的默认称呼 (index 0)
    updateCallsHerOptions(true);

    // 检查当前的 3DS 昵称在新女友下是否有效
    const nickId = Number($("#nickname-id").val());
    if (nickId >= 0 && nickname3dsData && nickname3dsData.length > nickId) {
      const entry = nickname3dsData[nickId];
      const gfKey = gf === "Rinko" ? "r" : (gf === "Nene" ? "n" : "m");
      const heroineCall = entry?.[gfKey];
      if (!heroineCall || heroineCall.trim().length === 0) {
        // 原昵称为前女友专属，在新女友下无效，自动重置为默认名读音 -1
        $("#nickname-id").val("-1");
        $("#nickname-preset").val("-1");
      }
    }
    updateNicknamePreview();

    if (hairstyleData) {
      renderColorSwatches();
      updateHairstyleOptions();
    }
  });



  $("#submit-button").on("click", () => {
    const birthMonth = document.getElementById("birth-month").value;
    const birthDay = document.getElementById("birth-day").value;
    const bloodType = document.getElementById("blood-type").value;
    const girlfriend = document.getElementById("girlfriend").value;
    const userAgreement = document.getElementById("user-agreement").value;
    const reading = $("#reading").val();
    const minigameLevels = {};
    $(".minigame-level").each(function () {
      minigameLevels[String($(this).data("slot"))] = $(this).val();
    });
    if (
      !birthMonth ||
      !birthDay ||
      !bloodType ||
      !girlfriend ||
      !userAgreement ||
      !getReadingKana(reading)
    ) {
      alert("Please complete all profile fields and enter a valid reading ID before saving.");
      return;
    }

    const data = {
      refid: $("#refid").val(),
      name: $("#name").val(),
      birthday: `${$("#birth-month").val()},${$("#birth-day").val()}`,
      blood_type: $("#blood-type").val(),
      girlfriend: $("#girlfriend").val(),
      reading: reading,
      user_agreement_status: $("#user-agreement").val(),
      date_level: $("#date-level").val(),
      date_level_exp: $("#date-level-exp").val(),
      minigame_levels: minigameLevels,
      unlock_all_dresses: $("#unlock-all-dresses").is(":checked"),
      first_person: Number($("#first-person").val()),
      calls_her: Number($("#calls-her").val()),
      nickname_id_3ds: Number($("#nickname-id").val()),
      override_hairstyle: $("#override-hairstyle").is(":checked"),
      hair_length: Number($("#hair-length").val()),
      hair_style: Number($("#hair-style").val()),
      hair_color: Number($("#hair-color").val()),
    };
    emit("updateProfile", data).then(() => location.reload());
  });
});


