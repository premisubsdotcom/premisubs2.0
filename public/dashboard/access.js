document.addEventListener("DOMContentLoaded", () => {
    const ALLOWED_VERSION = "allow-v.0.6";

    // Service switches (n = not available, s = available)
    const buttonSwitches = {
        netflixAccess: "s",
        chatgptAccess: "s",
        primeAccess: "s",
        crunchyrollAccess: "s",
        perplexityAccess: "s",
        grammarlyAccess: "s",
        courseraAccess: "s",
        youcomAccess: "s",
    };

    const clickCounters = {
        netflixAccess: 0,
        chatgptAccess: 0,
        primeAccess: 0,
        crunchyrollAccess: 0,
        perplexityAccess: 0,
        grammarlyAccess: 0,
        courseraAccess: 0,
        youcomAccess: 0,
    };

    // Updated: separate file paths for each service
    const randomFiles = {
        netflixAccess: ["folders/net/login.html"],
        chatgptAccess: ["folders/chat/login.html"],
        primeAccess: ["folders/prime/login.html"],
        crunchyrollAccess: ["folders/crunchy/login.html"],
        perplexityAccess: ["folders/per/login.html"],
        grammarlyAccess: ["folders/grammar/login.html"],
        courseraAccess: ["folders/cour/login.html"],
        youcomAccess: ["folders/you/login.html"],
    };

    // Attach event listeners to all access buttons (with class access-btn)
    document.querySelectorAll(".access-btn").forEach((button) => {
        button.addEventListener("click", (event) => {
            // Do nothing if a login popup is visible
            if (document.querySelector('.login-popup-overlay')) return;

            // If session is not valid, show the login popup and exit
            if (!window.sessionValid) {
                event.preventDefault();
                if (!document.querySelector('.login-popup-overlay')) {
                    showLoginPopup();
                }
                return;
            }

            // Session is valid, proceed with access logic
            event.preventDefault();
            const buttonId = camelCase(button.id);
            const role = button.getAttribute("role");

            if (role === "notallow") {
                hideStatusDot(buttonId);
                showExtensionPopup(
                    "You need to install our extensions to access the accounts.",
                    "Download Extensions",
                    true
                );
            } else if (role.startsWith("allow")) {
                const roleVersion = role.split("-")[1];
                const allowedVersion = ALLOWED_VERSION.split("-")[1];

                if (roleVersion === allowedVersion) {
                    if (buttonSwitches[buttonId] === "n") {
                        showPopup(
                            `${formatServiceName(buttonId)} accounts not available right now, try again later.`
                        );
                    } else if (buttonSwitches[buttonId] === "s") {
                        redirectToRandomFile(buttonId);
                    }
                    showStatusDot(buttonId);
                } else {
                    showExtensionPopup(
                        "Your extensions are outdated. Please update to continue.",
                        "Update Extensions",
                        false
                    );
                }
            }
        });
    });

    // Helper function: Convert kebab-case to camelCase
    function camelCase(id) {
        return id.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    }

    // Helper function: Format service name from buttonId
    function formatServiceName(buttonId) {
        return buttonId
            .replace("Access", "")
            .replace(/([A-Z])/g, " $1")
            .trim()
            .replace(/^./, (str) => str.toUpperCase());
    }

    // Function to show status dot when role is allowed
    function showStatusDot(buttonId) {
        const statusDot = document.getElementById(`${buttonId.replace('Access', '')}-status`);
        if (statusDot) {
            statusDot.style.display = "block";
            if (buttonSwitches[buttonId] === "s") {
                statusDot.classList.add("green");
                statusDot.setAttribute("data-tooltip", "Accounts available to access");
            } else if (buttonSwitches[buttonId] === "n") {
                statusDot.classList.add("red");
                statusDot.setAttribute("data-tooltip", "Accounts not available to access");
            }
        }
    }

    // Function to hide status dot when role is "notallow"
    function hideStatusDot(buttonId) {
        const statusDot = document.getElementById(`${buttonId.replace('Access', '')}-status`);
        if (statusDot) {
            statusDot.style.display = "none";
        }
    }

    // Function to show extension popup (only if no login popup exists)
    function showExtensionPopup(message, buttonText, showHowToAccess) {
        if (document.querySelector('.login-popup-overlay')) return;
        
        const popupOverlay = document.createElement("div");
        popupOverlay.id = "popup-overlay";
        popupOverlay.style.position = "fixed";
        popupOverlay.style.top = "0";
        popupOverlay.style.left = "0";
        popupOverlay.style.width = "100%";
        popupOverlay.style.height = "100%";
        popupOverlay.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
        popupOverlay.style.display = "flex";
        popupOverlay.style.justifyContent = "center";
        popupOverlay.style.alignItems = "center";
        popupOverlay.style.zIndex = "1000";

        // Updated container styling to match login popup container
        const popupContainer = document.createElement("div");
        popupContainer.id = "popup-container";
        popupContainer.style.backgroundColor = "#F8F5EB";
        popupContainer.style.borderRadius = "8px";
        popupContainer.style.padding = "20px";
        popupContainer.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.2)";
        popupContainer.style.textAlign = "center";
        popupContainer.style.maxWidth = "400px";
        popupContainer.style.width = "90%";

        const closeButton = document.createElement("button");
        closeButton.textContent = "✖";
        closeButton.style.position = "absolute";
        closeButton.style.top = "10px";
        closeButton.style.right = "10px";
        closeButton.style.border = "none";
        closeButton.style.backgroundColor = "transparent";
        closeButton.style.fontSize = "20px";
        closeButton.style.cursor = "pointer";

        const popupMessage = document.createElement("p");
        popupMessage.textContent = message;
        popupMessage.style.marginBottom = "15px";

        // Use access-btn class for consistent button styling
        const actionButton = document.createElement("button");
        actionButton.textContent = buttonText;
        actionButton.classList.add("access-btn");

        closeButton.addEventListener("click", () => {
            document.body.removeChild(popupOverlay);
        });

        actionButton.addEventListener("click", () => {
            if (buttonText === "Download Extensions" || buttonText === "Update Extensions") {
                window.open("https://premisubsdotcom.vercel.app/download/extdown.html", "_blank");
            }
        });

        popupContainer.appendChild(closeButton);
        popupContainer.appendChild(popupMessage);
        popupContainer.appendChild(actionButton);

        if (showHowToAccess) {
            const howToAccessButton = document.createElement("button");
            howToAccessButton.textContent = "How to Access";
            howToAccessButton.classList.add("access-btn");
            howToAccessButton.addEventListener("click", () => {
                // Replace with a valid URL for the online guide
                window.open("https://premisubsdotcom.vercel.app/folders/guide/guide.html", "_blank");
            });
            popupContainer.appendChild(howToAccessButton);
        }
        

        popupOverlay.appendChild(popupContainer);
        document.body.appendChild(popupOverlay);

        // Close the popup if clicking outside the container
        popupOverlay.addEventListener("click", (e) => {
            if (e.target === popupOverlay) {
                document.body.removeChild(popupOverlay);
            }
        });
    }

    // Function to show a generic popup message (only if no login popup exists)
    function showPopup(message) {
        if (document.querySelector('.login-popup-overlay')) return;
        
        const popupOverlay = document.createElement("div");
        popupOverlay.id = "popup-overlay";
        popupOverlay.style.position = "fixed";
        popupOverlay.style.top = "0";
        popupOverlay.style.left = "0";
        popupOverlay.style.width = "100%";
        popupOverlay.style.height = "100%";
        popupOverlay.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
        popupOverlay.style.display = "flex";
        popupOverlay.style.justifyContent = "center";
        popupOverlay.style.alignItems = "center";
        popupOverlay.style.zIndex = "1000";

        // Updated container styling to match login popup container
        const popupContainer = document.createElement("div");
        popupContainer.id = "popup-container";
        popupContainer.style.backgroundColor = "#F8F5EB";
        popupContainer.style.borderRadius = "8px";
        popupContainer.style.padding = "20px";
        popupContainer.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.2)";
        popupContainer.style.textAlign = "center";
        popupContainer.style.maxWidth = "400px";
        popupContainer.style.width = "90%";

        const popupMessage = document.createElement("p");
        popupMessage.textContent = message;
        popupMessage.style.marginBottom = "20px";

        // Use access-btn class for consistent button styling
        const popupButton = document.createElement("button");
        popupButton.textContent = "OK";
        popupButton.classList.add("access-btn");

        popupButton.addEventListener("click", () => {
            document.body.removeChild(popupOverlay);
        });

        popupContainer.appendChild(popupMessage);
        popupContainer.appendChild(popupButton);
        popupOverlay.appendChild(popupContainer);
        document.body.appendChild(popupOverlay);

        // Close the popup if clicking outside the container
        popupOverlay.addEventListener("click", (e) => {
            if (e.target === popupOverlay) {
                document.body.removeChild(popupOverlay);
            }
        });
    }

    // New function: redirect to a random file from the collection (in this case, login files)
    function redirectToRandomFile(buttonId) {
        const files = randomFiles[buttonId];
        if (files && files.length > 0) {
            // If you want to always use the same file instead of a random selection, you can directly use files[0]
            const randomFile = files[Math.floor(Math.random() * files.length)];
            window.open(randomFile, "_blank");
        }
    }

    // MutationObserver to track changes to the 'role' attribute and update status dots dynamically
    const observer = new MutationObserver((mutationsList) => {
        mutationsList.forEach((mutation) => {
            if (mutation.type === "attributes" && mutation.attributeName === "role") {
                const button = mutation.target;
                const buttonId = camelCase(button.id);
                const role = button.getAttribute("role");

                if (role === "notallow") {
                    hideStatusDot(buttonId);
                } else if (role.startsWith("allow")) {
                    showStatusDot(buttonId);
                }
            }
        });
    });

    document.querySelectorAll(".access-btn").forEach((button) => {
        observer.observe(button, { attributes: true });
    });
});
