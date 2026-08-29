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
    };
    emit("updateProfile", data).then(() => location.reload());
  });
});

