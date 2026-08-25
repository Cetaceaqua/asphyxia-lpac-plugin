$(document).ready(function () {
  const birthMonth = $("#birth-month").data("default");
  const birthDay = $("#birth-day").data("default");

  updateDayOptions(birthMonth);

  $("#birth-month").on("change", function () {
    const selectedMonth = $(this).val();
    updateDayOptions(selectedMonth);
  });

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

    if (
      !birthMonth ||
      !birthDay ||
      !bloodType ||
      !girlfriend ||
      !userAgreement
    ) {
      alert("Please complete all profile fields before saving.");
      location.reload();
      return;
    }

    const data = {
      refid: $("#refid").val(),
      name: $("#name").val(),
      birthday: `${$("#birth-month").val()},${$("#birth-day").val()}`,
      blood_type: $("#blood-type").val(),
      girlfriend: $("#girlfriend").val(),
      pronunciation: $("#pronunciation").val(),
      user_agreement_status: $("#user-agreement").val(),
    };
    emit("updateProfile", data).then(() => location.reload());
  });
});
