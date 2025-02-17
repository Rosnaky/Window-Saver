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

function deleteWindow(windowClusterId, windowId) {
    chrome.storage.local.get("windowClusters", (result) => {
        let windowClusters = result.windowClusters;
        if (!windowClusters) return;

        const clusterIdx = windowClusters.findIndex((cluster) => cluster.clusterWindowId === windowClusterId);
        if (clusterIdx !== -1) {
            windowClusters[clusterIdx].windows = windowClusters[clusterIdx].windows.filter(window => window.windowId !== windowId);

            chrome.storage.local.set({windowClusters: windowClusters}, () => {
                updateCurrentWindowList()
                console.log("Removed window cluster");
            });
        }
    });
}

function getAllWindows() {
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

    return allWindows;
}

function updateWindowList() {
    const allWindows = getAllWindows();
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

function isTabOpen(url, windowId, tabId, windows) {
    
    const targetWindow = windows.find((window) => window.id === windowId);
    console.log(windowId, targetWindow);

    if (targetWindow) {
        const targetTab = targetWindow.tabs.find((tab) => tab.id === tabId);
        if (targetTab) {
            const sameUrl = (targetTab.url === url);
            return sameUrl;
        }
    }

    return false;
}

function openWindow(windowId, tabs) {
    chrome.windows.getAll({ populate: true }, (windows) => {
        const targetWindow = windows.find((window) => window.id === windowId);
        console.log(tabs);
        
        if (targetWindow) {
            tabs.forEach((tab) => {
                if (!isTabOpen(tab.url, windowId, tab.id, windows)) {
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
        else {
            chrome.storage.local.get((result) => {
                let allClusters = result.windowClusters;
                const cluster = allClusters.find((c) => c.windowClusterId === 0);
                if (!cluster) {
                    console.log("Cluster not found");
                    return;
                }
            
                const targetWindow = cluster.windows.find((w) => w.windowId === windowId);
                if (!targetWindow) {
                    console.log("Window not found");
                    return;
                }
            
                chrome.windows.create({
                    url: targetWindow.tabs.map(tab => tab.url),
                    width: 1920,
                    height: 1080,
                    left: 0,
                    top: 0
                }, (newWindow) => {
                    if (!newWindow) {
                        console.log("Failed to create window");
                        return;
                    }
                    console.log(newWindow);
                    
                    allClusters.forEach((cluster) => {
                        cluster.windows.forEach((window) => {
                            if (window.windowId === windowId) {
                                window.windowId = newWindow.id;


                                // window.tabs = newWindow.tabs.map(tab => ({
                                //     url: tab.url,
                                //     id: tab.id,
                                //     title: tab.title // If you want to retain the tab title, add other properties here
                                // }));
                            }
                        })
                    })

                    // Update storage with the new window ID
                    chrome.storage.local.set({ windowClusters: allClusters }, () => {
                        console.log(`Updated window ID to ${newWindow.id}`);
                    });
                });
            });
        }
    });
}

function openWindowModal(clusterId) {
    // Remove existing modal if present
    const existingModal = document.getElementById("window-modal");
    if (existingModal) {
        existingModal.remove();
    }

    // Create modal container
    const modal = document.createElement("div");
    modal.id = "window-modal";
    modal.classList.add("fixed", "inset-0", "bg-black", "bg-opacity-50", "flex", "items-center", "justify-center");

    // Modal content
    modal.innerHTML = `
        <div class="bg-gray-800 p-6 rounded-lg shadow-lg w-96 max-h-[80vh] overflow-y-auto">
            <h2 class="text-xl font-bold text-white">Select Windows to Add</h2>
            <div id="window-list" class="mt-4 max-h-60 overflow-y-auto"></div>
            <div class="flex justify-end mt-4">
                <button id="cancel-btn" class="px-4 py-2 bg-gray-600 text-white rounded-lg mr-2">Cancel</button>
                <button id="confirm-btn" class="px-4 py-2 bg-green-500 text-white rounded-lg">Add</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const windowList = document.getElementById("window-list");
    const confirmBtn = document.getElementById("confirm-btn");
    const cancelBtn = document.getElementById("cancel-btn");
    const selectedWindows = new Set();

    // Fetch stored clusters
    chrome.storage.local.get("windowClusters", (result) => {
        let windowClusters = result.windowClusters || [];
        let cluster = windowClusters.find((c) => c.windowClusterId === clusterId);
        let allWindows = windowClusters.find((c) => c.windowClusterId === 0)?.windows || [];

        if (!cluster) {
            alert("Cluster not found!");
            modal.remove();
            return;
        }

        // Get currently added windows in the cluster
        let existingWindowIds = new Set(cluster.windows.map((w) => w.windowId));

        // Fetch all Chrome windows
        chrome.windows.getAll({ populate: true }, (windows) => {
            windowList.innerHTML = ""; // Clear list before loading

            windows.forEach((win) => {
                if (existingWindowIds.has(win.id)) {
                    return; // Skip windows already in the cluster
                }

                const windowItem = document.createElement("div");
                windowItem.classList.add("p-3", "bg-gray-700", "rounded-lg", "mb-2");

                // Window label
                const header = document.createElement("div");
                header.classList.add("flex", "items-center", "justify-between");

                const label = document.createElement("label");
                label.classList.add("text-white", "cursor-pointer", "font-bold");
                label.textContent = `Window ${win.id} (${win.tabs.length} tabs)`;

                // Checkbox for window selection
                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.classList.add("form-checkbox", "h-5", "w-5", "text-blue-800", "ml-2");
                checkbox.dataset.windowId = win.id;

                // Expand/collapse tabs button
                const toggleTabsBtn = document.createElement("button");
                toggleTabsBtn.textContent = "▼";
                toggleTabsBtn.classList.add("text-white", "ml-2", "cursor-pointer", "text-sm");
                let expanded = false;

                // Container for tabs
                const tabContainer = document.createElement("div");
                tabContainer.classList.add("ml-4", "mt-2", "hidden");

                win.tabs.forEach((tab) => {
                    const tabItem = document.createElement("div");
                    tabItem.classList.add("flex", "items-center", "justify-between", "text-gray-300", "text-sm", "bg-gray-600", "rounded-lg", "p-2", "mb-1");

                    const tabLabel = document.createElement("span");
                    tabLabel.textContent = tab.title;

                    const tabIcon = document.createElement("img");
                    tabIcon.src = tab.favIconUrl || "";
                    tabIcon.classList.add("w-4", "h-4", "ml-2");

                    tabItem.appendChild(tabIcon);
                    tabItem.appendChild(tabLabel);
                    tabContainer.appendChild(tabItem);
                });

                // Toggle tabs visibility
                toggleTabsBtn.addEventListener("click", () => {
                    expanded = !expanded;
                    tabContainer.classList.toggle("hidden", !expanded);
                    toggleTabsBtn.textContent = expanded ? "▲" : "▼";
                });

                // Handle checkbox selection
                checkbox.addEventListener("change", (e) => {
                    if (e.target.checked) {
                        selectedWindows.add(win.id);
                    } else {
                        selectedWindows.delete(win.id);
                    }
                });

                header.appendChild(label);
                header.appendChild(checkbox);
                header.appendChild(toggleTabsBtn);
                windowItem.appendChild(header);
                windowItem.appendChild(tabContainer);
                windowList.appendChild(windowItem);
            });
        });
    });

    // Confirm button functionality
    confirmBtn.onclick = () => {
        if (selectedWindows.size === 0) {
            alert("No windows selected!");
            return;
        }

        chrome.storage.local.get("windowClusters", (result) => {
            let windowClusters = result.windowClusters;
            let cluster = windowClusters.find((c) => c.windowClusterId === clusterId);
            let allWindows = windowClusters.find((c) => c.windowClusterId === 0)?.windows || [];

            if (!cluster) {
                alert("Cluster not found!");
                return;
            }

            selectedWindows.forEach((winId) => {
                const windowToAdd = allWindows.find((w) => w.windowId === winId);
                if (windowToAdd) {
                    cluster.windows.push(windowToAdd);
                }
            });

            // Save changes to storage
            chrome.storage.local.set({ windowClusters: windowClusters }, () => {
                console.log(`Windows added to cluster: ${clusterId}`);
                modal.remove(); // Close modal
                updateCurrentWindowList(); // Refresh UI
                return;
            });
        });
    };

    // Cancel button functionality
    cancelBtn.onclick = () => {
        modal.remove();
    };
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
                clusterTitleInput.classList.add("text-lg", "font-bold", "bg-gray-800", "text-white", "border-b-2", "border-blue-800", "p-2", "w-35");
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
                    const userConfirmed = confirm(`Are you sure you want to open all tabs in ${cluster.clusterName}?`);
                    if (userConfirmed) {
                        cluster.windows.forEach((window) => {
                            openWindow(window.windowId, window.tabs);
                            updateCurrentWindowList();
                        });
                    }
                });
                
                const deleteIcon = document.createElement("div");
                deleteIcon.textContent = "DEL";
                deleteIcon.classList.add("w-8", "h-6", "text-center", "font-semibold", "bg-red-800", "rounded-lg");
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

                const addWindowsBtn = document.createElement("button");
                addWindowsBtn.classList.add("p-2", "bg-teal-800", "text-white", "rounded-lg", "mt-2");
                addWindowsBtn.textContent = "Add Windows";
                addWindowsBtn.dataset.clusterId = cluster.windowClusterId; // Store cluster ID

                addWindowsBtn.addEventListener("click", () => {
                    openWindowModal(cluster.windowClusterId);
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
                    showMoreButton.classList.add("bg-blue-800", "text-white", "p-2", "rounded-lg", "mt-4", "mr-4");
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
                    hideButton.classList.add("bg-blue-800", "text-white", "p-2", "rounded-lg", "mt-4", "mr-4");
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

                    const deleteWindowButton = document.createElement("button");
                    deleteWindowButton.classList.add("bg-red-800", "text-white", "p-2", "rounded-lg", "mt-4");
                    deleteWindowButton.textContent = "Delete Window";
                    deleteWindowButton.addEventListener("click", () => {
                        const userConfirm = confirm(`Are you sure you want to delete window ${window.windowName ?? window.windowId}?`);
                        if (userConfirm) {
                            deleteWindow(cluster.clusterWindowId, window.windowId);
                            updateCurrentWindowList();
                            return;
                        }
                    });
                    
                    windowItem.appendChild(tabList);
                    if (window.tabs.length > 5) windowItem.appendChild(showMoreButton);
                    windowItem.appendChild(deleteWindowButton);
                    windowList.appendChild(windowItem);
                });

                // Append the window list to the cluster section
                clusterSection.appendChild(windowList);
                clusterSection.appendChild(addWindowsBtn);
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
