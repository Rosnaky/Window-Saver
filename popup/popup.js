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
                updateCurrentWindowList();
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

    let addCluster = document.getElementById("add-cluster-button");
    addCluster.addEventListener("click", () => addEmptyCluster());

});

function addEmptyCluster() {
    chrome.storage.local.get("windowClusters", (result) => {
        let windowClusters = result.windowClusters;
        const id = windowClusters.length ?? 0;
        const newCluster = {
            windowClusterId: id,
            windows: [],
        }
        if (windowClusters) {
            windowClusters.push(newCluster);
        }
        else {
            windowClusters = [newCluster];
        }

        chrome.storage.local.set({windowClusters: windowClusters}, () => {
            updateCurrentWindowList()
            console.log("Added window cluster", windowClusters);
        });
    });
}

function deleteCluster(windowClusterId) {
    chrome.storage.local.get("windowClusters", (result) => {
        let windowClusters = result.windowClusters;
        if (windowClusters) {
            windowClusters = windowClusters.filter(cluster => cluster.windowClusterId !== windowClusterId);

            chrome.storage.local.set({windowClusters: windowClusters}, () => {
                updateCurrentWindowList()
                console.log("Removed window cluster");
            });
        }

    });
}

function updateWindowList() {
    let allWindows = {
        windowClusterId: 0,
        windows: [],
        clusterName: "All Windows"
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
    updateCurrentWindowList();
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

function isTabOpen(url, windowId, tabId) {
    chrome.windows.getAll({ populate: true }, (windows) => {
        windows.forEach((window) => {
            const targetWindow = windows.find((window) => {
                window.id == windowId;
            });
            if (targetWindow) {
                const targetTab = windows.tabs.find((tab) => {
                    tab.id == tabId;
                });

                if (targetTab) {
                    return tab.url === url;
                }
            }
        });
    });

    return false;
}

function openWindow(windowId, tabs) {
    chrome.windows.getAll({ populate: true }, (windows) => {
        const targetWindow = windows.find((window) => window.id === windowId);
        console.log(windowId, targetWindow);
        
        if (targetWindow) {
            tabs.forEach((tab) => {
                if (!isTabOpen(tab.url, windowId, tab.id)) {
                    chrome.tabs.create({
                        windowId: windowId,
                        url: tab.url,
                    }, (newTab) => {
                        console.log('New tab created in window:', windowId, 'Tab ID:', newTab.id);
                    });
                }
                else {
                    console.log("Tab already open", window.id, tab.url);
                }
            });
            
        }
    });
}

function updateCurrentWindowList() {
    chrome.storage.local.get("windowClusters", (result) => {
        if (result.windowClusters) {
            let windowClusters = result.windowClusters;
            let clusterContainer = document.getElementById("window-list-container");
            clusterContainer.innerHTML = "";
            
            windowClusters.forEach((cluster) => {
                // Clear the existing window list
                let windowListContainer = document.createElement("div");
                windowListContainer.innerHTML = "";

                // Create the expandable section for the cluster
                const clusterSection = document.createElement("div");
                clusterSection.classList.add("bg-gray-800", "text-white", "rounded-lg", "p-4", "shadow-md", "mb-4");

                // Create a header for the cluster with toggle functionality
                const clusterHeader = document.createElement("div");
                clusterHeader.classList.add("flex", "justify-between", "items-center", "cursor-pointer");

                // Cluster title as editable input field
                const clusterTitleWrapper = document.createElement("div");
                clusterTitleWrapper.classList.add("flex", "items-center", "space-x-2", "w-full");

                const clusterTitleInput = document.createElement("input");
                clusterTitleInput.value = cluster.clusterName || `Cluster ${cluster.windowClusterId}`;
                clusterTitleInput.classList.add("text-lg", "font-bold", "bg-gray-800", "text-white", "border-b-2", "border-blue-400", "p-2", "w-35");
                clusterTitleInput.addEventListener("input", (e) => {
                    // Update cluster name when user changes the input
                    cluster.clusterName = e.target.value;
                    chrome.storage.local.set({ windowClusters: windowClusters }, () => {
                        console.log("Cluster name updated:", cluster.clusterName);
                    });
                });

                clusterTitleWrapper.appendChild(clusterTitleInput);

                // Create the toggle icon (▼/▲)
                const toggleIcon = document.createElement("span");
                toggleIcon.textContent = "▼"; // Arrow indicating expandable section
                toggleIcon.classList.add("p-4");

                const openAllButton = document.createElement("button");
                openAllButton.classList.add("bg-gray-700", "text-white", "p-2", "rounded-lg");
                openAllButton.textContent = "Open";
                openAllButton.addEventListener("click", () => {
                    console.log("Open window");
                    cluster.windows.forEach((window) => {
                        openWindow(window.windowId, window.tabs);
                    });
                });
                
                const deleteIcon = document.createElement("div");
                deleteIcon.textContent = "DEL";
                deleteIcon.classList.add("w-8", "h-6", "text-center", "font-semibold", "bg-red-600", "rounded-lg");
                deleteIcon.addEventListener("click", () => {
                    const userConfirmed = confirm("Are you sure you want to delete this item?");
                    if (userConfirmed) {
                        // Proceed with the deletion logic
                        deleteCluster(cluster.windowClusterId);
                        console.log("Item deleted.");
                    } else {
                        // Do nothing if the user cancels
                        console.log("Deletion canceled.");
                    }
                });

                
                clusterTitleWrapper.appendChild(openAllButton);
                clusterTitleWrapper.appendChild(toggleIcon);
                clusterTitleWrapper.appendChild(deleteIcon);
                clusterHeader.appendChild(clusterTitleWrapper);
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
                    windowTitle.value = window.windowName || `Window ${window.windowId}`;
                    windowTitle.classList.add("bg-gray-800", "p-2", "mb-2", "rounded-lg", "w-full", "text-teal-500", "font-semibold");
                    windowTitle.addEventListener("input", (e) => {
                        // Update window name when user changes the input
                        window.windowName = e.target.value;
                        chrome.storage.local.get((result) => {
                            if (result.windowClusters) {
                                const clusterIndex = result.windowClusters.findIndex(cluster => cluster.windowClusterId === windowClusterId);
                                const windowIndex = result.windowClusters[clusterIndex].windows.findIndex(win => win.windowId === window.windowId);
                                
                                const data = result.windowClusters;
                                data[clusterIndex].windows[windowIndex].windowName = e.target.value;

                                chrome.storage.local.set({windowClusters: data}, () => {
                                    console.log("Changed window name");
                                    console.log(window.windowName, clusterIndex, windowIndex);
                                    console.log(data);
                                });
                            }
                        });
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
                        tabItem.classList.add("text-sm", "text-gray-300", "bg-gray-800", "p-2", "rounded-lg");
                        
                        // Create clickable link for each tab
                        const tabLink = document.createElement("a");
                        tabLink.href = tab.url;
                        tabLink.target = "_blank"; // Open link in a new tab
                        tabLink.textContent = tab.title;
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
                            tabItem.classList.add("text-sm", "text-gray-300", "bg-gray-800", "p-2", "rounded-lg");
                            
                            // Create clickable link for each tab
                            const tabLink = document.createElement("a");
                            tabLink.href = tab.url;
                            tabLink.target = "_blank"; // Open link in a new tab
                            tabLink.textContent = tab.title;
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
                            tabItem.classList.add("text-sm", "text-gray-300", "bg-gray-800", "p-2", "rounded-lg");
                            
                            // Create clickable link for each tab
                            const tabLink = document.createElement("a");
                            tabLink.href = tab.url;
                            tabLink.target = "_blank"; // Open link in a new tab
                            tabLink.textContent = tab.title;
                            tabItem.appendChild(tabLink);
                            
                            tabList.appendChild(tabItem);
                        });
                        hideButton.remove(); // Remove the show more button after expanding
                        windowItem.appendChild(showMoreButton);
                    });

                    windowItem.appendChild(tabList);
                    if (window.tabs.length > 5) windowItem.appendChild(showMoreButton);
                    windowList.appendChild(windowItem);
                });

                // Append the window list to the cluster section
                clusterSection.appendChild(windowList);
                windowListContainer.appendChild(clusterSection);

                // Toggle visibility of the window list when the cluster header is clicked
                toggleIcon.addEventListener("click", () => {
                    const isHidden = windowList.classList.contains("hidden");
                    if (isHidden) {
                        windowList.classList.remove("hidden");
                        toggleIcon.textContent = "▲"; // Change to up arrow when expanded
                    } else {
                        windowList.classList.add("hidden");
                        toggleIcon.textContent = "▼"; // Change to down arrow when collapsed
                    }
                });

                clusterContainer.appendChild(windowListContainer);
            });
        }
    });
}
