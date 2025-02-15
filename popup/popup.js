document.addEventListener("DOMContentLoaded", () => {
    const saveButton = document.getElementById("save-btn");
    if (saveButton) {
        saveButton.addEventListener("click", () => updateWindowList());
    }
    
    chrome.storage.local.get("windowClusters", (result) => {
        // Check if "windowClusters" exists and is not null or undefined
        if (!result.windowClusters) {
            // If "windowClusters" doesn't exist, set it to an empty array
            chrome.storage.local.set({ windowClusters: [] }, () => {
                console.log("Window clusters not found, initializing to an empty array.");
            });
        } else {
            console.log("Window clusters already exist.");
            result.windowClusters.forEach((cluster) => {
                updateCurrentWindowList(cluster.windowClusterId);
            })
        }
    });

    chrome.storage.local.get("lastSavedDate", (result) => {
        // Check if "windowClusters" exists and is not null or undefined
        if (!result.lastSavedDate) {
            // If "windowClusters" doesn't exist, set it to an empty array
            chrome.storage.local.set({ lastSavedDate: "Never" });
            document.getElementById("last-saved").innerHTML = "Last saved: Never";
        }
        else {
            document.getElementById("last-saved").innerHTML = "Last saved: " + result.lastSavedDate;
        }
    });

    

    // Event listeners to track tab changes
    chrome.tabs.onCreated.addListener(() => updateWindowList());
    chrome.tabs.onRemoved.addListener(() => updateWindowList());
    chrome.tabs.onUpdated.addListener(() => updateWindowList());
});



function updateWindowList() {
    let allWindows = {
        windowClusterId: 0,
        windows: [],
        windowClusterName: "All Windows"
    };
    chrome.windows.getAll({ populate: true }, (windows) => {
            

        windows.forEach((window) => {
            allWindows.windows.push({
                windowId: window.id,
                tabs: window.tabs.map((tab) => ({
                    id: tab.id,
                    title: tab.title,
                    url: tab.url,
                })),
            });
        });

        
    });
    saveClusterToLocal(0, allWindows);
    updateCurrentWindowList(0);
}

function saveClusterToLocal(windowClusterId, data) {
    chrome.storage.local.get("windowClusters", (result) => {
        if (result.windowClusters === null) return;
        
        let windowClusters = result.windowClusters;
        const clusterIndex = windowClusters.findIndex(cluster => cluster.windowClusterId === windowClusterId);

        if (clusterIndex !== -1) {
            windowClusters[clusterIndex] = { ...windowClusters[clusterIndex], ...data };
        } 
        else {
            windowClusters.push({windowClusterId, ...data});
        }

        chrome.storage.local.set({ windowClusters: windowClusters }, () => {
            console.log("Tabs saved successfully!");

            chrome.storage.local.get("windowClusters", (result) => {
                console.log("Saved Tabs:", result.windowClusters);
            });
        });
    });
}

document.addEventListener("DOMContentLoaded", () => {
    const saveButton = document.getElementById("save-btn");
    if (saveButton) {
        saveButton.addEventListener("click", () => updateWindowList());
    }
    
    chrome.storage.local.get("windowClusters", (result) => {
        // Check if "windowClusters" exists and is not null or undefined
        if (!result.windowClusters) {
            // If "windowClusters" doesn't exist, set it to an empty array
            chrome.storage.local.set({ windowClusters: [] }, () => {
                console.log("Window clusters not found, initializing to an empty array.");
            });
        } else {
            console.log("Window clusters already exist.");
            result.windowClusters.forEach((cluster) => {
                updateCurrentWindowList(cluster.windowClusterId);
            });
        }
    });
    

    // Event listeners to track tab changes
    chrome.tabs.onCreated.addListener(() => updateWindowList());
    chrome.tabs.onRemoved.addListener(() => updateWindowList());
    chrome.tabs.onUpdated.addListener(() => updateWindowList());
});

function updateWindowList() {
    let allWindows = {
        windowClusterId: 0,
        windows: [],
        windowClusterName: "All Windows"
    };
    chrome.windows.getAll({ populate: true }, (windows) => {
        windows.forEach((window) => {
            allWindows.windows.push({
                windowId: window.id,
                tabs: window.tabs.map((tab) => ({
                    id: tab.id,
                    title: tab.title,
                    url: tab.url,
                })),
            });
        });
    });
    saveClusterToLocal(0, allWindows);
    updateCurrentWindowList(0);
}

function saveClusterToLocal(windowClusterId, data) {
    chrome.storage.local.get("windowClusters", (result) => {
        if (result.windowClusters === null) return;

        let windowClusters = result.windowClusters;
        const clusterIndex = windowClusters.findIndex(cluster => cluster.windowClusterId === windowClusterId);

        if (clusterIndex !== -1) {
            windowClusters[clusterIndex] = { ...windowClusters[clusterIndex], ...data };
        } else {
            windowClusters.push({ windowClusterId, ...data });
        }

        chrome.storage.local.set({ windowClusters: windowClusters }, () => {
            console.log("Tabs saved successfully!");

            const timestamp = new Date().toLocaleString();
            document.getElementById("last-saved").innerHTML = "Last saved: " + timestamp;

            chrome.storage.local.set({lastSavedDate: timestamp}, (result) => {

            });

            chrome.storage.local.get("windowClusters", (result) => {
                console.log("Saved Tabs:", result.windowClusters);
            });
        });
    });
}

function updateCurrentWindowList(windowClusterId) {
    chrome.storage.local.get("windowClusters", (result) => {
        if (result.windowClusters) {
            let windowClusters = result.windowClusters;
            let cluster = windowClusters.find(cluster => cluster.windowClusterId === windowClusterId);
            
            if (cluster) {
                // Clear the existing window list
                const windowListContainer = document.getElementById("window-list-container");
                windowListContainer.innerHTML = "";

                // Create an input to change the window cluster name
                let clusterNameInput = document.createElement("input");
                clusterNameInput.value = cluster.clusterName || `Cluster ${windowClusterId}`;
                clusterNameInput.classList.add("bg-gray-800", "text-white", "p-2", "rounded-lg", "mb-4", "w-full");
                clusterNameInput.addEventListener("input", (e) => {
                    // Update cluster name when user changes the input
                    cluster.clusterName = e.target.value;
                    chrome.storage.local.set({ windowClusters: windowClusters }, () => {
                        console.log("Cluster name updated:", cluster.clusterName);
                    });
                });
                windowListContainer.appendChild(clusterNameInput);

                // Create the expandable section for the cluster
                const clusterSection = document.createElement("div");
                clusterSection.classList.add("bg-gray-800", "text-white", "rounded-lg", "p-4", "shadow-md", "mb-4");

                // Create a header for the cluster with toggle functionality
                const clusterHeader = document.createElement("div");
                clusterHeader.classList.add("flex", "justify-between", "items-center", "cursor-pointer");
                const clusterTitle = document.createElement("h3");
                clusterTitle.classList.add("text-xl", "font-bold", "text-blue-400");
                clusterTitle.textContent = cluster.clusterName || `Cluster ${windowClusterId}`;
                const toggleIcon = document.createElement("span");
                toggleIcon.textContent = "▼"; // Arrow indicating expandable section

                clusterHeader.appendChild(clusterTitle);
                clusterHeader.appendChild(toggleIcon);
                clusterSection.appendChild(clusterHeader);

                // Create the window list (initially hidden)
                const windowList = document.createElement("div");
                windowList.classList.add("mt-4", "hidden");

                // Add the windows and tabs inside the expandable section
                cluster.windows.forEach(window => {
                    const windowItem = document.createElement("div");
                    windowItem.classList.add("bg-gray-700", "text-white", "p-4", "rounded-lg", "shadow-md", "mb-4");

                    // Create a window header (renamable)
                    const windowHeader = document.createElement("div");
                    const windowTitle = document.createElement("input");
                    windowTitle.value = `Window ${window.windowId}`;
                    windowTitle.classList.add("bg-gray-800", "text-white", "p-2", "rounded-lg", "w-full");
                    windowTitle.addEventListener("input", (e) => {
                        // Update window name when user changes the input
                        window.windowName = e.target.value;
                    });
                    windowHeader.appendChild(windowTitle);
                    windowItem.appendChild(windowHeader);

                    // Create a list for tabs with "Show More" button
                    const tabList = document.createElement("ul");
                    tabList.classList.add("space-y-2");

                    // Limit to 5 tabs initially
                    const limitedTabs = window.tabs.slice(0, 5);
                    limitedTabs.forEach(tab => {
                        const tabItem = document.createElement("li");
                        tabItem.classList.add("text-xs", "text-gray-300", "bg-gray-800", "p-1", "rounded-lg", "hover:bg-gray-600", "overflow-hidden", "truncate");

                        // Create a link for each tab item
                        const tabLink = document.createElement("a");
                        tabLink.href = tab.url; // Assuming `tab.url` contains the URL for the tab
                        tabLink.target = "_blank"; // Open in a new tab
                        tabLink.classList.add("text-xs", "text-gray-300", "hover:text-blue-400", "block", "truncate");
                        tabLink.textContent = tab.title; // Only show the title (will truncate if it's too long)
                        
                        tabItem.appendChild(tabLink);
                        tabList.appendChild(tabItem);
                    });

                    // Show more button for additional tabs
                    const showMoreButton = document.createElement("button");
                    showMoreButton.classList.add("bg-blue-500", "text-white", "p-2", "rounded-lg", "mt-4");
                    showMoreButton.textContent = "Show More Tabs";
                    showMoreButton.addEventListener("click", () => {
                        tabList.innerHTML = ""; // Clear the list
                        window.tabs.forEach(tab => {
                            const tabItem = document.createElement("li");
                            tabItem.classList.add("text-xs", "text-gray-300", "bg-gray-800", "p-1", "rounded-lg", "hover:bg-gray-600", "overflow-hidden", "truncate");

                            // Create a link for each tab item
                            const tabLink = document.createElement("a");
                            tabLink.href = tab.url; // Assuming `tab.url` contains the URL for the tab
                            tabLink.target = "_blank"; // Open in a new tab
                            tabLink.classList.add("text-xs", "text-gray-300", "hover:text-blue-400", "block", "truncate");
                            tabLink.textContent = tab.title; // Only show the title (will truncate if it's too long)
                            
                            tabItem.appendChild(tabLink);
                            tabList.appendChild(tabItem);
                        });
                        showMoreButton.remove(); // Remove the show more button after expanding
                        windowItem.appendChild(hideButton);
                    });

                    const hideButton = document.createElement("button");
                    hideButton.classList.add("bg-blue-500", "text-white", "p-2", "rounded-lg", "mt-4");
                    hideButton.textContent = "Hide Tabs";
                    hideButton.addEventListener("click", () => {
                        tabList.innerHTML = ""; // Clear the list
                        limitedTabs.forEach(tab => {
                            const tabItem = document.createElement("li");
                            tabItem.classList.add("text-xs", "text-gray-300", "bg-gray-800", "p-1", "rounded-lg", "hover:bg-gray-600", "overflow-hidden", "truncate");

                            // Create a link for each tab item
                            const tabLink = document.createElement("a");
                            tabLink.href = tab.url; // Assuming `tab.url` contains the URL for the tab
                            tabLink.target = "_blank"; // Open in a new tab
                            tabLink.classList.add("text-xs", "text-gray-300", "hover:text-blue-400", "block", "truncate");
                            tabLink.textContent = tab.title; // Only show the title (will truncate if it's too long)
                            
                            tabItem.appendChild(tabLink);
                            tabList.appendChild(tabItem);
                        });
                        hideButton.remove(); // Remove the show more button after expanding
                        windowItem.appendChild(showMoreButton);
                    });

                    windowItem.appendChild(tabList);
                    windowItem.appendChild(showMoreButton);
                    windowList.appendChild(windowItem);
                });

                // Append the window list to the cluster section
                clusterSection.appendChild(windowList);
                windowListContainer.appendChild(clusterSection);

                // Toggle visibility of the window list when the cluster header is clicked
                clusterHeader.addEventListener("click", () => {
                    const isHidden = windowList.classList.contains("hidden");
                    if (isHidden) {
                        windowList.classList.remove("hidden");
                        toggleIcon.textContent = "▲"; // Change to up arrow when expanded
                    } else {
                        windowList.classList.add("hidden");
                        toggleIcon.textContent = "▼"; // Change to down arrow when collapsed
                    }
                });
            }
        }
    });
}
