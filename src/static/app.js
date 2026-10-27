document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const staffLoginButton = document.getElementById("staff-login-button");
  const staffLogoutButton = document.getElementById("staff-logout-button");
  const staffLoginDialog = document.getElementById("staff-login-dialog");
  const staffLoginForm = document.getElementById("staff-login-form");
  const staffLoginError = document.getElementById("staff-login-error");
  const staffSignupNote = document.getElementById("staff-signup-note");
  let isStaff = false;

  function updateStaffControls(authenticated) {
    isStaff = authenticated;
    staffLoginButton.classList.toggle("hidden", authenticated);
    staffLogoutButton.classList.toggle("hidden", !authenticated);
    signupForm.classList.toggle("hidden", !authenticated);
    staffSignupNote.classList.toggle("hidden", authenticated);
  }

  async function checkStaffSession() {
    try {
      const response = await fetch("/auth/me");
      const result = await response.json();
      const authenticated = response.ok && result.authenticated === true;
      updateStaffControls(authenticated);
      if (authenticated) await fetchActivities();
    } catch (error) {
      updateStaffControls(false);
      console.error("Error checking staff session:", error);
    }
  }

  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = type;
    setTimeout(() => messageDiv.classList.add("hidden"), 5000);
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.replaceChildren(new Option("-- Select an activity --", ""));

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span>${isStaff ? `<button class="delete-btn" data-activity="${name}" data-email="${email}" aria-label="Unregister ${email}">Unregister</button>` : ""}</li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      if (isStaff) {
        document.querySelectorAll(".delete-btn").forEach((button) => {
          button.addEventListener("click", handleUnregister);
        });
      }
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  staffLoginButton.addEventListener("click", () => {
    staffLoginError.textContent = "";
    staffLoginError.classList.add("hidden");
    staffLoginDialog.showModal();
  });

  document.getElementById("staff-login-cancel").addEventListener("click", () => {
    staffLoginDialog.close();
  });

  staffLoginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    staffLoginError.textContent = "";
    staffLoginError.classList.add("hidden");

    const formData = new FormData(staffLoginForm);
    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.get("username"),
          password: formData.get("password"),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail || "Unable to sign in.");

      staffLoginForm.reset();
      staffLoginDialog.close();
      updateStaffControls(true);
      await fetchActivities();
      showMessage("Staff login successful.", "success");
    } catch (error) {
      staffLoginError.textContent = error.message || "Unable to sign in.";
      staffLoginError.classList.remove("hidden");
    }
  });

  staffLogoutButton.addEventListener("click", async () => {
    try {
      const response = await fetch("/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Unable to sign out.");
      updateStaffControls(false);
      await fetchActivities();
      showMessage("Signed out.", "info");
    } catch (error) {
      showMessage(error.message || "Unable to sign out.", "error");
    }
  });

  fetchActivities();
  checkStaffSession();
});
